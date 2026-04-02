const { fetchAllData } = require('./fetch_and_store_data');

async function dailyUpdate() {
  console.log('🌅 Starting daily data update...');
  console.log('📅 Date:', new Date().toLocaleDateString('vi-VN'));
  console.log('⏰ Time:', new Date().toLocaleTimeString('vi-VN'));
  console.log('=' .repeat(60));
  
  try {
    const result = await fetchAllData();
    
    if (result.success !== false) {
      console.log('\n🎉 Daily update completed successfully!');
      console.log('📊 Data is now ready for dashboard');
      
      // Log next update time
      const nextUpdate = new Date();
      nextUpdate.setDate(nextUpdate.getDate() + 1);
      nextUpdate.setHours(6, 0, 0, 0); // Next update at 6 AM
      
      console.log(`⏰ Next update scheduled: ${nextUpdate.toLocaleString('vi-VN')}`);
      
      return { success: true, result };
    } else {
      console.log('\n❌ Daily update failed!');
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('\n❌ Error in daily update:', error.message);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  dailyUpdate().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { dailyUpdate };
