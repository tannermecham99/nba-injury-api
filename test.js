// Test script for ESPN depth chart scraper
const { scrapeESPNDepthChart, getBackupForPlayer } = require('./espn-depth-scraper');

async function runTests() {
  console.log('🏀 ESPN Depth Chart Scraper - Test Suite\n');

  // Test 1: Scrape Atlanta Hawks
  console.log('Test 1: Scraping Atlanta Hawks depth chart...');
  try {
    const atlDepth = await scrapeESPNDepthChart('atl');
    console.log('✅ Success! Found depth chart for:', atlDepth.team);
    console.log('   Positions:', Object.keys(atlDepth.positions));
    console.log('   Point Guards:');
    atlDepth.positions.PG.forEach(p => {
      const status = p.injuryStatus ? ` (${p.injuryStatus})` : '';
      console.log(`      ${p.depth}. ${p.name}${status}`);
    });
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 2: Find Trae Young's backup
  console.log('Test 2: Finding backup for Trae Young...');
  try {
    const atlDepth = await scrapeESPNDepthChart('atl');
    const backup = getBackupForPlayer(atlDepth, 'Trae Young');
    
    if (backup && backup.primaryBackup) {
      console.log('✅ Success!');
      console.log(`   Injured Player: ${backup.injuredPlayer.name} (${backup.position})`);
      console.log(`   Primary Backup: ${backup.primaryBackup.name} (depth ${backup.primaryBackup.depth})`);
      console.log(`   All Backups:`);
      backup.allBackups.slice(0, 3).forEach(b => {
        console.log(`      - ${b.name} (depth ${b.depth})`);
      });
    } else {
      console.log('⚠️  No backup found (Trae might not be in depth chart or not injured)');
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 3: Scrape Lakers
  console.log('Test 3: Scraping LA Lakers depth chart...');
  try {
    const lalDepth = await scrapeESPNDepthChart('lal');
    console.log('✅ Success! Found depth chart for:', lalDepth.team);
    console.log('   Shooting Guards:');
    lalDepth.positions.SG.forEach(p => {
      const status = p.injuryStatus ? ` (${p.injuryStatus})` : '';
      console.log(`      ${p.depth}. ${p.name}${status}`);
    });
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 4: Check for injured players
  console.log('Test 4: Checking for injured players across positions...');
  try {
    const atlDepth = await scrapeESPNDepthChart('atl');
    const injured = [];
    
    Object.entries(atlDepth.positions).forEach(([pos, players]) => {
      players.forEach(p => {
        if (p.injuryStatus) {
          injured.push({ ...p, position: pos });
        }
      });
    });
    
    if (injured.length > 0) {
      console.log(`✅ Found ${injured.length} injured player(s):`);
      injured.forEach(p => {
        console.log(`   - ${p.name} (${p.position}) - ${p.injuryStatus}`);
      });
    } else {
      console.log('✅ No injured players found in Hawks depth chart');
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');
  console.log('🎉 Test suite complete!\n');
  console.log('Next steps:');
  console.log('  1. Run: node espn-depth-scraper.js atl');
  console.log('  2. Run: node espn-depth-scraper.js --all');
  console.log('  3. Integrate with your injury API using depth-chart-integration.js');
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
