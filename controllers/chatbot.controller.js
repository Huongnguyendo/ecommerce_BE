const utilsHelper = require("../helpers/utils.helper");
const Product = require("../models/product");
const axios = require("axios");

const conversationContext = new Map();

// ============================================================================
// HUGGING FACE AI SETUP
// ============================================================================
// Uses the OpenAI-compatible API endpoint: https://router.huggingface.co/v1
//
// To enable Hugging Face AI:
// 1. Get your Hugging Face API token from https://huggingface.co/settings/tokens
// 2. Add to your .env file: HUGGING_FACE_API_KEY=your_token_here
// 3. Optionally set: HUGGING_FACE_MODEL=model_name (default: openai/gpt-oss-20b)
//
// Example models that work:
// - openai/gpt-oss-20b (default)
// - moonshotai/Kimi-K2-Instruct-0905
// - Any model that supports chat completions
// ============================================================================

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
// Default model - can be overridden with HUGGING_FACE_MODEL in .env
const HUGGING_FACE_MODEL = process.env.HUGGING_FACE_MODEL || "openai/gpt-oss-20b";
const HUGGING_FACE_ENABLED = !!HUGGING_FACE_API_KEY;

// Hugging Face API call using OpenAI-compatible endpoint
const getHuggingFaceResponse = async (userMessage, conversationHistory = [], productData = []) => {
  if (!HUGGING_FACE_ENABLED) {
    return null;
  }

  try {
    let responseText = "";

    // Build system message with product information if available
    let systemMessage = "You are a helpful shopping assistant for an e-commerce website. Be friendly, concise, and helpful. Keep replies short (2-4 sentences), avoid tables, and prefer plain text or short bullet points.";
    
    if (productData && productData.length > 0) {
      const productList = productData.slice(0, 5).map((p, i) =>
        `${i + 1}. ${p.name} - $${p.price}${p.brand ? ` (${p.brand})` : ''}`
      ).join('\n');
      
      systemMessage += `\n\nIMPORTANT: The user is asking about products. Here are the products found in our store:\n${productList}\n\nPlease help the user with these specific products. If the user asks about a product, refer to the products listed above.`;
    }

    // Use OpenAI-compatible API endpoint
    try {
      const response = await axios.post(
        `https://router.huggingface.co/v1/chat/completions`,
        {
          model: HUGGING_FACE_MODEL,
          messages: [
            { role: "system", content: systemMessage },
            ...conversationHistory.slice(-3).flatMap(msg => [
              { role: "user", content: msg.user },
              { role: "assistant", content: msg.bot }
            ]),
            { role: "user", content: userMessage }
          ],
          max_tokens: 200,
          temperature: 0.7
        },
        {
          headers: {
            Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 20000
        }
      );
      
      // Extract response from OpenAI-compatible format
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        responseText = response.data.choices[0].message.content || "";
      }
      
      // If we got a response, clean it up and return
      if (responseText && responseText.trim().length > 0) {
        let cleaned = responseText.trim();
        if (cleaned.length > 800) {
          const truncated = cleaned.slice(0, 800);
          const lastStop = Math.max(
            truncated.lastIndexOf("."),
            truncated.lastIndexOf("!"),
            truncated.lastIndexOf("?")
          );
          cleaned = (lastStop > 100 ? truncated.slice(0, lastStop + 1) : truncated).trim();
          cleaned += " Ask if you'd like more details.";
        }
        return cleaned;
      }
    } catch (apiError) {
      // Log errors only in development or for debugging
      if (process.env.NODE_ENV === 'development' && apiError.response) {
        console.error("Hugging Face API error:", apiError.response.status, apiError.response.data);
      }
    }
    
    // If response is empty or too short, return null to fallback to rule-based
    if (!responseText || responseText.length < 3) {
      return null;
    }

    return responseText;
  } catch (error) {
    console.error("Hugging Face API error:", error.response?.data || error.message);
    
                // Handle rate limiting or model loading
                if (error.response?.status === 503 || error.status === 503) {
                  return null;
                }
                
                if (error.response?.status === 429 || error.status === 429) {
                  return null;
                }

    // For other errors, fallback to rule-based
    return null;
  }
};

// Rule-based chatbot (no API required - always works)
const getRuleBasedResponse = async (userMessage, productData = [], conversationHistory = []) => {
  const message = userMessage.toLowerCase().trim();
  
  // Greetings
  if (/^(hi|hello|hey|greetings)/i.test(message)) {
    return "Hello! 👋 I'm here to help you find products, answer questions about shipping, returns, and more. How can I assist you today?";
  }
  
  // Product search responses
  if (productData.length > 0) {
    const topProduct = productData[0];
    const productList = productData.slice(0, 3).map(p => 
      `• ${p.name} - $${p.price}${p.brand ? ` (${p.brand})` : ''}`
    ).join('\n');
    
    if (productData.length === 1) {
      return `Great! I found "${topProduct.name}" for $${topProduct.price}. ${topProduct.description ? topProduct.description.substring(0, 100) + '...' : 'Check it out!'} You can click on it to see more details.`;
    } else {
      return `I found ${productData.length} products that match your search:\n\n${productList}\n\nWould you like to see more details about any of these?`;
    }
  }
  
  // Shipping questions
  if (message.includes('shipping') || message.includes('delivery') || message.includes('ship')) {
    return "We offer free shipping on orders over $50! Standard shipping takes 3-5 business days. Express shipping (1-2 days) is available for an additional fee. All orders are processed within 24 hours.";
  }
  
  // Return/refund questions
  if (message.includes('return') || message.includes('refund') || message.includes('exchange')) {
    return "We have a 30-day return policy! Items must be in original condition with tags attached. Returns are free and easy - just contact our support team or use the return portal in your account.";
  }
  
  // Payment questions
  if (message.includes('payment') || message.includes('pay') || message.includes('card') || message.includes('checkout')) {
    return "We accept all major credit cards, PayPal, and secure payment processing. Your payment information is encrypted and secure. Checkout is quick and easy!";
  }
  
  // Order status
  if (message.includes('order') && (message.includes('status') || message.includes('track') || message.includes('where'))) {
    return "To check your order status, go to your account page and click on 'Order History'. You'll see all your orders with tracking information there. If you need help, contact our support team!";
  }
  
  // Help/Support
  if (message.includes('help') || message.includes('support') || message.includes('contact')) {
    return "I'm here to help! You can:\n• Search for products using the search bar\n• Browse by category\n• Check your orders in your account\n• Contact support: 9 AM - 6 PM EST\n\nWhat would you like to know?";
  }
  
  // Search suggestions
  if (message.includes('search') || message.includes('find') || message.includes('looking for')) {
    return "Use the search bar at the top of the page to find products! You can search by product name, brand, or description. I can also help you search - just tell me what you're looking for!";
  }
  
  // Cart questions
  if (message.includes('cart') || message.includes('basket')) {
    return "You can view your cart by clicking the cart icon in the top right. Add items to your cart and proceed to checkout when you're ready!";
  }
  
  // Price questions
  if (message.includes('price') || message.includes('cost') || message.includes('expensive') || message.includes('cheap') || message.includes('discount') || message.includes('sale')) {
    return "Prices vary by product. Use the search bar to find products and see their prices. We also have daily deals with special discounts - check out the 'Today's Deals' section!";
  }
  
  // Account questions
  if (message.includes('account') || message.includes('profile') || message.includes('login') || message.includes('sign in') || message.includes('register')) {
    return "You can manage your account by clicking on your profile icon. There you can update your information, view order history, and manage your preferences. Need to sign in? Use the login button in the top right!";
  }
  
  // Product availability/stock
  if (message.includes('stock') || message.includes('available') || message.includes('in stock') || message.includes('out of stock')) {
    return "Product availability is shown on each product page. If an item is out of stock, you can sign up for notifications to be alerted when it's back!";
  }
  
  // Size/color/variants
  if (message.includes('size') || message.includes('color') || message.includes('colour') || message.includes('variant') || message.includes('option')) {
    return "Product sizes, colors, and other options are available on each product's detail page. Select your preferred options before adding to cart!";
  }
  
  // Thank you / goodbye
  if (message.includes('thank') || message.includes('thanks') || message.includes('bye') || message.includes('goodbye') || message.includes('see you')) {
    return "You're welcome! 😊 Happy shopping! If you need anything else, just ask!";
  }
  
  // Hours/contact
  if (message.includes('hours') || message.includes('open') || message.includes('close') || message.includes('phone') || message.includes('email') || message.includes('address')) {
    return "We're available 24/7 online! For support, contact us through your account page or email support. Our team responds within 24 hours.";
  }
  
  // Security/privacy
  if (message.includes('secure') || message.includes('security') || message.includes('privacy') || message.includes('safe') || message.includes('protect')) {
    return "Your security is our priority! We use encrypted payment processing and never share your personal information. All transactions are secure and protected.";
  }
  
  // General fallback with helpful suggestions
  return "I'm here to help you shop! You can:\n• Search for products (just tell me what you're looking for!)\n• Ask about shipping, returns, or payments\n• Get help with your account\n\nWhat would you like to know?";
};

const getChatbotResponse = async (message, userId = null) => {
  const userMessage = message.toLowerCase().trim();
  
  const contextKey = userId || 'guest';
  let context = conversationContext.get(contextKey) || {
    lastProducts: [],
    lastSearchTerm: '',
    conversationHistory: []
  };
  
  try {
    // Check if this is a product search query - be more inclusive
    // If message is more than just greetings/small talk, treat as potential product query
    const greetingsOnly = /^(hi|hello|hey|thanks|thank you|bye|goodbye|what can you do|help)[\s\.!]*$/i.test(userMessage);
    const isProductQuery = !greetingsOnly && (userMessage.length > 3 || 
                          userMessage.includes('search') || userMessage.includes('find') || userMessage.includes('looking for') || 
                          userMessage.includes('show me') || userMessage.includes('need') || userMessage.includes('want') || 
                          userMessage.includes('buy') || userMessage.includes('price') || userMessage.includes('cost') || 
                          userMessage.includes('available') || userMessage.includes('have'));

    let productData = [];
    
    if (isProductQuery) {
      // Extract keywords for product search - more aggressive extraction
      let keywords = userMessage
        // Remove common phrases
        .replace(/(search|find|looking for|show me|can you help me|help me|i need|i want|i'm looking for|do you have|tell me about|what about|is|are|available|in stock)/g, '')
        // Remove articles
        .replace(/\b(a|an|the|some|any|this|that|these|those)\b/g, '')
        // Remove polite words
        .replace(/\b(please|thanks|thank you|can you|could you|would you|may i|can i)\b/g, '')
        // Remove question words at start
        .replace(/^(what|where|when|who|how|why|which|show|give|get)\s+/g, '')
        .trim();
      
      // If no keywords extracted, use the original message but clean it
      if (!keywords || keywords.length < 2) {
        keywords = userMessage
          .replace(/\b(do you|is|are|have|has|can|will|should|would)\b/g, '')
          .replace(/[^\w\s]/g, ' ')
          .trim();
      }
      
      // Further cleaning
      keywords = keywords.replace(/\s+/g, ' ').trim();
      
      if (keywords && keywords.length > 1) {
        // Split keywords and search for each word
        const keywordsArray = keywords.split(' ').filter(k => k.length > 1);
        
        // Build flexible search query
        const searchQuery = {
          $or: [
            // Exact match on full keywords
            { name: { $regex: keywords, $options: 'i' } },
            { description: { $regex: keywords, $options: 'i' } },
            { brand: { $regex: keywords, $options: 'i' } },
            // Match on individual keywords
            ...keywordsArray.map(k => ({ name: { $regex: k, $options: 'i' } })),
            ...keywordsArray.map(k => ({ description: { $regex: k, $options: 'i' } })),
            ...keywordsArray.map(k => ({ brand: { $regex: k, $options: 'i' } })),
          ],
          isDeleted: false
        };
        
        const products = await Product.find(searchQuery).limit(10).select('name price description image brand category');
        
        if (products.length > 0) {
          productData = products;
          // Store in context for follow-up questions
          context.lastProducts = products;
          context.lastSearchTerm = keywords;
        }
      }
    } else if (context.lastProducts && context.lastProducts.length > 0) {
      // Use previous search results for comparison/recommendation questions
      productData = context.lastProducts;
    }

    // Try Hugging Face AI first (if enabled), then fallback to rule-based
    let response = null;
    
    if (HUGGING_FACE_ENABLED) {
      response = await getHuggingFaceResponse(message, context.conversationHistory, productData);
    }
    
    // Fallback to rule-based if Hugging Face failed or is disabled
    if (!response) {
      response = await getRuleBasedResponse(message, productData, context.conversationHistory);
    }
    
    context.conversationHistory.push({
      user: message,
      bot: response,
      timestamp: new Date()
    });
    
    if (context.conversationHistory.length > 10) {
      context.conversationHistory = context.conversationHistory.slice(-10);
    }
    
    conversationContext.set(contextKey, context);
    
    return response;
    
  } catch (error) {
    console.error('Chatbot error:', error);
    return "I'm having trouble processing your request right now. Please try again or contact our support team directly.";
  }
};

// Get AI-powered chatbot response
const getResponse = async (req, res, next) => {
  const { message, sessionId } = req.body;
  const userId = req.userId; // From auth middleware
  
  if (!message || !message.trim()) {
    return utilsHelper.sendResponse(res, 400, false, null, null, "Message is required");
  }
  
  try {
    const contextKey = sessionId || userId || `temp_${Date.now()}_${Math.random()}`;
    
    const response = await getChatbotResponse(message, contextKey);
    return res.status(200).json({
      success: true,
      data: {
        response,
        sessionId: contextKey
      },
      message: "Response generated successfully"
    });
  } catch (error) {
    console.error("Chatbot response error:", error);
    
    // Fallback response if something goes wrong
    return res.status(200).json({
      success: true,
      data: {
        response: "I'm here to help! You can search for products, ask about shipping, returns, or payments. What would you like to know?",
        sessionId: sessionId || userId || `temp_${Date.now()}_${Math.random()}`
      },
      message: "Response generated successfully"
    });
  }
};

const getSuggestions = async (req, res, next) => {
  const suggestions = [
    "Search for products",
    "Check my order status", 
    "Shipping information",
    "Payment methods",
    "Return policy",
    "Account help",
    "Contact support"
  ];
  
  return utilsHelper.sendResponse(res, 200, true, { suggestions }, null, "Suggestions retrieved successfully");
};

module.exports = {
  getResponse,
  getSuggestions
};