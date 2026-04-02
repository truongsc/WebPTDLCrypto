const cron = require('node-cron');
const { updateAllData } = require('../scripts/update_all_data');

console.log('🕐 Setting up data update cron jobs...');

// Update data every hour
cron.schedule('0 * * * *', async () => {
  console.log('\n⏰ Hourly data update started...');
  await updateAllData();
}, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh"
});

// Update FGI every 15 minutes (more frequent for sentiment)
cron.schedule('*/15 * * * *', async () => {
  console.log('\n⏰ FGI update (15min) started...');
  const { updateFGIData } = require('../scripts/update_fgi_data');
  await updateFGIData();
}, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh"
});

// Update market cap every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('\n⏰ Market cap update (30min) started...');
  const { updateMarketCapData } = require('../scripts/update_market_cap_data');
  await updateMarketCapData();
}, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh"
});

console.log('✅ Cron jobs scheduled:');
console.log('  - Full data update: Every hour');
console.log('  - FGI update: Every 15 minutes');
console.log('  - Market cap update: Every 30 minutes');

module.exports = { cron };
