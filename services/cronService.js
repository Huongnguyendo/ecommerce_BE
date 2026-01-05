const cron = require('node-cron');
const { setDailyDiscounts } = require('../helpers/discount.helper');

class CronService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the daily discount cron job
   * Runs every day at midnight (00:00) and also on server start if needed
   */
  async startDailyDiscountJob() {
    if (this.isRunning) {
      return;
    }
    
    // Check if we need to set discounts immediately (on server start)
    try {
      const Product = require('../models/product');
      const now = new Date();
      const activeDeals = await Product.countDocuments({
        isDeleted: false,
        discountPercent: { $gt: 0 },
        discountExpiresAt: { $gt: now }
      });
      
      // If no active deals, run the discount job immediately
      if (activeDeals === 0) {
        console.log('🔄 No active deals found, running discount job on server start...');
        try {
          await setDailyDiscounts(8, 10, 40); // Set discounts on 8 products
          console.log('✅ Discount job completed on server start');
        } catch (error) {
          console.error('❌ Discount job failed on server start:', error);
        }
      } else {
        console.log(`✅ Found ${activeDeals} products with active discounts`);
      }
    } catch (error) {
      console.error('Error checking for active deals:', error);
    }
    
    // Schedule to run every day at midnight (00:00) - using local timezone
    cron.schedule('0 0 * * *', async () => {
      try {
        console.log('🕛 Running scheduled daily discount job...');
        await setDailyDiscounts(8, 10, 40); // 8 products, 10-40% discount
        console.log('✅ Scheduled discount job completed');
      } catch (error) {
        console.error('Daily discount cron job failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "America/New_York" // Changed to Eastern Time - adjust to your timezone
    });

    this.isRunning = true;
    console.log('✅ Daily discount cron job scheduled (runs at midnight)');
  }

  /**
   * Stop the daily discount cron job
   */
  stopDailyDiscountJob() {
    if (!this.isRunning) {
      return;
    }

    cron.destroy();
    this.isRunning = false;
  }

  /**
   * Run the discount job immediately (for testing)
   */
  async runDiscountJobNow() {
    try {
      const result = await setDailyDiscounts(5, 10, 40);
      return result;
    } catch (error) {
      console.error('Immediate discount job failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const cronService = new CronService();

module.exports = cronService;
