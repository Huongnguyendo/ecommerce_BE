// Lazy load TensorFlow to reduce bundle size (only load when needed)
let tf = null;
const loadTensorFlow = async () => {
  if (!tf) {
    try {
      // Use @tensorflow/tfjs (lighter, ~2MB vs ~150MB)
      tf = require('@tensorflow/tfjs');
      
      // Set backend to 'cpu' for Node.js (required for server-side)
      await tf.setBackend('cpu');
      await tf.ready();
      
      console.log('TensorFlow.js loaded with CPU backend');
    } catch (error) {
      console.warn('TensorFlow not available, using fallback recommendations. Error:', error.message);
      return null;
    }
  }
  return tf;
};

const User = require('../models/user');
const Product = require('../models/product');
const Category = require('../models/category');

const INTERACTION_SCORES = {
  view: 1, cart: 2, rating: 3, buy: 6,
};

async function recommendForUser(userId) {
  console.log('=== recommendForUser called ===');
  console.log('userId:', userId);
  
  try {
    // 1. Load user with interactions + preferences populated
    const user = await User.findById(userId)
      .populate({
        path: "interactions.productId",
        select: "company category rating overall ratingData timestamp",
        populate: ["company", "category"],
      })
      .populate("preferences.companies")
      .populate("preferences.categories");
    
    console.log('User found:', !!user);
    if (user) {
      console.log('User interactions count:', user.interactions?.length || 0);
      console.log('User preferences count:', user.preferences?.categories?.length || 0);
      
      // Debug: Log first interaction details
      if (user.interactions && user.interactions.length > 0) {
        const firstInteraction = user.interactions[0];
        console.log('First interaction debug:');
        console.log('  Product ID:', firstInteraction.productId?._id);
        console.log('  Product Category:', firstInteraction.productId?.category);
        console.log('  Category type:', typeof firstInteraction.productId?.category);
        console.log('  Category _id:', firstInteraction.productId?.category?._id);
        console.log('  Category name:', firstInteraction.productId?.category?.name);
      }
    }

    if (!user || !user.interactions.length) {
      console.log('No user or no interactions, returning empty array');
      return [];
    }

    // 2. Load all products + populate company & category
    console.log('Loading products...');
    let products;
    try {
      // First try to load products without populate to see what we have
      const rawProducts = await Product.find({ isDeleted: false }).lean();
      console.log('Raw products loaded:', rawProducts.length);
      
      // Filter out products with invalid category references
      const validProducts = rawProducts.filter(p => {
        if (!p.category) return false;
        if (typeof p.category === 'string') {
          // Check if it's a valid ObjectId string
          const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(p.category);
          if (!isValidObjectId) {
            console.log(`Product ${p._id} has invalid category string: "${p.category}"`);
            return false;
          }
        }
        return true;
      });
      
      console.log('Valid products (with proper category references):', validProducts.length);
      
      if (validProducts.length === 0) {
        console.log('No valid products found, returning empty array');
        return [];
      }
      
      // Now populate the valid products
      const productIds = validProducts.map(p => p._id);
      products = await Product.find({ _id: { $in: productIds }, isDeleted: false })
        .populate("company category")
        .lean();
        
      console.log('Products populated successfully:', products.length);
      
    } catch (populateError) {
      console.error('Error populating products:', populateError);
      // Fallback: load products without populate
      console.log('Falling back to unpopulated products...');
      products = await Product.find({ isDeleted: false }).lean();
      console.log('Products loaded without populate:', products.length);
    }

    if (!products.length) {
      console.log('No products found, returning empty array');
      return [];
    }

    // 11. Use TensorFlow.js for proper vector-based recommendations
    console.log('Computing recommendations using TensorFlow.js...');
    
    // Build vocabularies for company, category from all products + user prefs
    const companiesSet = new Set();
    const categoriesSet = new Set();
    
    products.forEach((p) => {
      if (p.company?._id) companiesSet.add(p.company._id.toString());
      if (p.category?._id) categoriesSet.add(p.category._id.toString());
    });
    
    // Safely add user preferences
    if (user.preferences?.companies) {
      user.preferences.companies.forEach((c) => {
        if (c && c._id) companiesSet.add(c._id.toString());
      });
    }
    
    if (user.preferences?.categories) {
      user.preferences.categories.forEach((c) => {
        if (c && c._id) categoriesSet.add(c._id.toString());
      });
    }
    
    const companies = Array.from(companiesSet);
    const categories = Array.from(categoriesSet);
    
    console.log('Unique companies:', companies.length);
    console.log('Unique categories:', categories.length);

    const getIndex = (arr, val) => {
      try {
        if (!val) return -1;
        return arr.indexOf(val.toString());
      } catch {
        return -1;
      }
    };

    // Helper for one-hot encoding
    function oneHot(index, size) {
      const arr = new Array(size).fill(0);
      if (index !== -1) arr[index] = 1;
      return arr;
    }

    // Normalize product ratings
    function avgUserRating(product) {
      if (!product.ratingData || !product.ratingData.length) return 0;
      const ratings = product.ratingData.map((r) => r.rating || 0);
      const sum = ratings.reduce((a, b) => a + b, 0);
      return ratings.length ? sum / ratings.length : 0;
    }

    // Embed products into vectors
    function embedProduct(p) {
      const companyIdx = getIndex(companies, p.company?._id);
      const categoryIdx = getIndex(categories, p.category?._id);
      const companyVec = oneHot(companyIdx, companies.length);
      const categoryVec = oneHot(categoryIdx, categories.length);
      
      const maxOverallRating = 5;
      const maxAvgRating = 5;
      const overallRatingNorm = p.rating ? p.rating / maxOverallRating : 0;
      const avgUserRatingNorm = avgUserRating(p) ? avgUserRating(p) / maxAvgRating : 0;
      
      return [
        ...companyVec,
        ...categoryVec,
        overallRatingNorm,
        avgUserRatingNorm,
      ];
    }

    // Embed user preferences
    function embedPreferences() {
      const compPrefVec = new Array(companies.length).fill(0);
      if (user.preferences?.companies) {
        user.preferences.companies.forEach((c) => {
          if (c && c._id) {
            const idx = getIndex(companies, c._id);
            if (idx !== -1) compPrefVec[idx] = 1;
          }
        });
      }
      
      const catPrefVec = new Array(categories.length).fill(0);
      if (user.preferences?.categories) {
        user.preferences.categories.forEach((c) => {
          if (c && c._id) {
            const idx = getIndex(categories, c._id);
            if (idx !== -1) catPrefVec[idx] = 1;
          }
        });
      }
      
      // Normalize preference vectors
      const normalizeVec = (vec) => {
        const sum = vec.reduce((a, b) => a + b, 0);
        return sum > 0 ? vec.map((v) => v / sum) : vec;
      };
      return [...normalizeVec(compPrefVec), ...normalizeVec(catPrefVec)];
    }

    // Create product vectors
    const productVectors = products.map(embedProduct);
    console.log('Product vectors created, first vector length:', productVectors[0]?.length || 0);

    // Build user interaction vector by weighted sum of product embeddings
    const now = Date.now();
    const MS_IN_DAY = 1000 * 60 * 60 * 24;
    const interactionWeights = user.interactions.reduce(
      (acc, curr) => {
        const prod = curr.productId;
        if (!prod || !prod._id) return acc;
        
        const idx = products.findIndex(
          (p) => p._id.toString() === prod._id.toString()
        );
        if (idx === -1) return acc;
        
        let baseWeight = INTERACTION_SCORES[curr.type] || 0;
        
        // Boost recent purchases
        if (
          curr.type === "buy" &&
          now - new Date(curr.timestamp).getTime() < 30 * MS_IN_DAY
        ) {
          baseWeight *= 2; // double weight for recent buys
        }
        
        if (!acc.vec) acc.vec = new Array(productVectors[0].length).fill(0);
        for (let i = 0; i < acc.vec.length; i++) {
          acc.vec[i] += productVectors[idx][i] * baseWeight;
        }
        acc.totalWeight += baseWeight;
        return acc;
      },
      { vec: null, totalWeight: 0 }
    );

    console.log('Interaction weights calculated, total weight:', interactionWeights.totalWeight);

    // Prepare user vector
    let userVectorArr;
    if (!interactionWeights.vec || interactionWeights.totalWeight === 0) {
      // fallback to just preferences vector
      userVectorArr = embedPreferences();
      console.log('Using preferences vector only, length:', userVectorArr.length);
    } else {
      // normalize weighted sum of interacted products
      userVectorArr = interactionWeights.vec.map(
        (v) => v / interactionWeights.totalWeight
      );
      // append preference embedding
      const prefVec = embedPreferences();
      userVectorArr = userVectorArr.concat(prefVec);
      console.log('Using combined vector, length:', userVectorArr.length);
    }

    // Prepare product vectors padded with zero for preferences
    const prefLength = companies.length + categories.length;
    const paddedProductVectors = productVectors.map((v) => {
      const zeros = new Array(prefLength).fill(0);
      return [...v, ...zeros];
    });

    // Compute cosine similarity using TensorFlow.js (if available)
    const tfModule = await loadTensorFlow();
    
    if (tfModule) {
      try {
        console.log('Starting TensorFlow.js calculation...');
        console.log('User vector length:', userVectorArr.length);
        console.log('Product vectors count:', paddedProductVectors.length);
        console.log('First product vector length:', paddedProductVectors[0]?.length);
        
        const userTensor = tfModule.tensor1d(userVectorArr);
        console.log('User tensor created successfully');
        
        const paddedProductTensor = tfModule.tensor2d(paddedProductVectors);
        console.log('Product tensor created successfully');
      
        const userNorm = userTensor.norm();
        console.log('User norm calculated:', userNorm.arraySync());
        
        const productNorms = paddedProductTensor.norm("euclidean", 1);
        console.log('Product norms calculated, first few:', productNorms.arraySync().slice(0, 5));
        
        const dotProds = paddedProductTensor
          .matMul(userTensor.expandDims(1))
          .reshape([-1]);
        console.log('Dot products calculated, first few:', dotProds.arraySync().slice(0, 5));
        
        const cosineSims = dotProds.div(productNorms.mul(userNorm));
        const scores = cosineSims.arraySync();

      console.log('Cosine similarity scores calculated, scores range:', Math.min(...scores), 'to', Math.max(...scores));
      console.log('First 5 scores:', scores.slice(0, 5));

      // Filter out already interacted products
      const interactedIds = new Set(
        user.interactions
          .filter(i => i.productId && i.productId._id)
          .map((i) => i.productId._id.toString())
      );
      console.log('Interacted product IDs count:', interactedIds.size);
      console.log('Sample interacted IDs:', Array.from(interactedIds).slice(0, 3));
      
      const scoredProducts = [];
      for (let i = 0; i < products.length; i++) {
        if (interactedIds.has(products[i]._id.toString())) continue;
        scoredProducts.push({
          product: products[i],
          score: scores[i] || 0
        });
      }

      console.log('Products after filtering interactions:', scoredProducts.length);

      // Sort by similarity score and return top 10
      scoredProducts.sort((a, b) => b.score - a.score);
      const finalRecommendations = scoredProducts.slice(0, 10).map((p) => p.product);
      
      console.log('Final recommendations count:', finalRecommendations.length);
      if (finalRecommendations.length > 0) {
        console.log('Top recommendation score:', scoredProducts[0]?.score);
        console.log('Bottom recommendation score:', scoredProducts[scoredProducts.length - 1]?.score);
        
        // Log the actual recommended products
        console.log('Recommended products:');
        finalRecommendations.forEach((product, index) => {
          const score = scoredProducts[index]?.score;
          console.log(`  ${index + 1}. ${product.name} (Score: ${score?.toFixed(4)}, Category: ${product.category?.name || 'Unknown'})`);
        });
      }
      
      return finalRecommendations;
      
    } catch (error) {
      console.error('TensorFlow.js error, falling back to simple scoring:', error);
      console.error('Error stack:', error.stack);
      
      // Fallback to simple scoring if TensorFlow.js fails
      console.log('Using fallback simple scoring system...');
      const scores = [];
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        let score = 0;
        
        if (product.rating) {
          score += (product.rating / 5) * 10;
        }
        
        const productCategoryId = product.category?._id?.toString();
        if (productCategoryId) {
          user.interactions.forEach(interaction => {
            if (interaction.productId?.category?._id?.toString() === productCategoryId) {
              score += INTERACTION_SCORES[interaction.type] || 0;
            }
          });
        }
        
        score += Math.random() * 2.0;
        scores.push(score);
      }
      
      // Filter and return
      const interactedIds = new Set(
        user.interactions
          .filter(i => i.productId && i.productId._id)
          .map((i) => i.productId._id.toString())
      );
      
      const scoredProducts = [];
      for (let i = 0; i < products.length; i++) {
        if (interactedIds.has(products[i]._id.toString())) continue;
        scoredProducts.push({
          product: products[i],
          score: scores[i] || 0
        });
      }
      
      scoredProducts.sort((a, b) => b.score - a.score);
      const fallbackRecommendations = scoredProducts.slice(0, 10).map((p) => p.product);
      
      console.log('Fallback recommendations count:', fallbackRecommendations.length);
      console.log('Fallback top score:', scoredProducts[0]?.score);
      
      return fallbackRecommendations;
      }
    } else {
      // TensorFlow not available, use simple scoring
      console.log('TensorFlow not available, using simple scoring system...');
      const scores = [];
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        let score = 0;
        
        if (product.rating) {
          score += (product.rating / 5) * 10;
        }
        
        const productCategoryId = product.category?._id?.toString();
        if (productCategoryId) {
          user.interactions.forEach(interaction => {
            if (interaction.productId?.category?._id?.toString() === productCategoryId) {
              score += INTERACTION_SCORES[interaction.type] || 0;
            }
          });
        }
        
        score += Math.random() * 2.0;
        scores.push(score);
      }
      
      // Filter and return
      const interactedIds = new Set(
        user.interactions
          .filter(i => i.productId && i.productId._id)
          .map((i) => i.productId._id.toString())
      );
      
      const scoredProducts = [];
      for (let i = 0; i < products.length; i++) {
        if (interactedIds.has(products[i]._id.toString())) continue;
        scoredProducts.push({
          product: products[i],
          score: scores[i] || 0
        });
      }
      
      scoredProducts.sort((a, b) => b.score - a.score);
      const fallbackRecommendations = scoredProducts.slice(0, 10).map((p) => p.product);
      
      console.log('Fallback recommendations count:', fallbackRecommendations.length);
      return fallbackRecommendations;
    }
    
  } catch (error) {
    console.error('Error in recommendForUser:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

module.exports = { recommendForUser }; 