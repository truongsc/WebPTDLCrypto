const { updateFGIData } = require('./update_fgi_data');
const { updateMarketCapData } = require('./update_market_cap_data');
const { exec } = require('child_process');
const path = require('path');

async function updateAllData() {
  console.log('🚀 Starting comprehensive data update...');
  console.log('=' .repeat(50));
  
  try {
    // 1. Update Fear & Greed Index
    console.log('\n📊 Step 1: Updating Fear & Greed Index...');
    await updateFGIData();
    
    // 2. Update Market Cap data from CoinGecko
    console.log('\n💰 Step 2: Updating Market Cap data...');
    await updateMarketCapData();
    
    // 3. Update individual token market cap (using existing Python script)
    console.log('\n🪙 Step 3: Updating individual token market caps...');
    await runPythonScript();
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 All data updates completed successfully!');
    console.log('📅 Next update scheduled in 1 hour');
    
  } catch (error) {
    console.error('\n❌ Error in data update process:', error.message);
    process.exit(1);
  }
}

// Function to run Python script
function runPythonScript() {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.join(__dirname, '../../get_market_cap_safe.py');
    
    exec(`python "${pythonScriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Python script error: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.log(`⚠️ Python script warning: ${stderr}`);
      }
      
      console.log('✅ Python script completed successfully');
      console.log(stdout);
      resolve();
    });
  });
}

// Run if called directly
if (require.main === module) {
  updateAllData();
}

module.exports = { updateAllData };
