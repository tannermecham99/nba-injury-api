// ESPN NBA Depth Chart Scraper
// Usage: node espn-depth-scraper.js [team_abbr]
// Example: node espn-depth-scraper.js atl

const axios = require('axios');
const cheerio = require('cheerio');

// NBA team abbreviations
const TEAMS = {
  ATL: 'atl', BOS: 'bos', BKN: 'bkn', CHA: 'cha', CHI: 'chi',
  CLE: 'cle', DAL: 'dal', DEN: 'den', DET: 'det', GSW: 'gs',
  HOU: 'hou', IND: 'ind', LAC: 'lac', LAL: 'lal', MEM: 'mem',
  MIA: 'mia', MIL: 'mil', MIN: 'min', NOP: 'no', NYK: 'ny',
  OKC: 'okc', ORL: 'orl', PHI: 'phi', PHX: 'phx', POR: 'por',
  SAC: 'sac', SAS: 'sa', TOR: 'tor', UTA: 'utah', WAS: 'wsh'
};

async function scrapeESPNDepthChart(teamAbbr) {
  const url = `https://www.espn.com/nba/team/depth/_/name/${teamAbbr}`;
  
  try {
    console.log(`Fetching: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const depthChart = {
      team: teamAbbr.toUpperCase(),
      timestamp: new Date().toISOString(),
      positions: {}
    };

    // Find the depth chart table
    const table = $('.Table');
    
    if (!table.length) {
      throw new Error('Could not find depth chart table');
    }

    // Get position labels (PG, SG, SF, PF, C)
    const positions = [];
    table.find('thead tr').first().find('th').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text !== 'Starter' && text !== '2nd' && text !== '3rd' && text !== '4th' && text !== '5th') {
        positions.push(text);
      }
    });

    // Get depth for each position
    table.find('tbody tr').each((rowIndex, row) => {
      const position = positions[rowIndex];
      if (!position) return;

      depthChart.positions[position] = [];

      $(row).find('td').each((colIndex, cell) => {
        const $cell = $(cell);
        const $link = $cell.find('a');
        
        if ($link.length) {
          const playerName = $link.text().trim();
          const playerUrl = $link.attr('href');
          const playerId = playerUrl ? playerUrl.match(/\/id\/(\d+)\//)?.[1] : null;
          
          // Check for injury status
          const injuryStatus = $cell.text().includes('O') ? 'OUT' : 
                             $cell.text().includes('DD') ? 'DAY-TO-DAY' : null;

          depthChart.positions[position].push({
            depth: colIndex + 1,
            name: playerName,
            espnId: playerId,
            injuryStatus: injuryStatus
          });
        }
      });
    });

    return depthChart;

  } catch (error) {
    console.error('Error scraping depth chart:', error.message);
    throw error;
  }
}

async function scrapeAllTeams() {
  const allDepthCharts = {};
  
  for (const [abbr, espnCode] of Object.entries(TEAMS)) {
    try {
      console.log(`\nScraping ${abbr}...`);
      const depthChart = await scrapeESPNDepthChart(espnCode);
      allDepthCharts[abbr] = depthChart;
      
      // Rate limit to avoid getting blocked
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Failed to scrape ${abbr}:`, error.message);
      allDepthCharts[abbr] = { error: error.message };
    }
  }
  
  return allDepthCharts;
}

// Helper function to get backup for an injured player
function getBackupForPlayer(depthChart, playerName) {
  for (const [position, players] of Object.entries(depthChart.positions)) {
    const playerIndex = players.findIndex(p => 
      p.name.toLowerCase().includes(playerName.toLowerCase())
    );
    
    if (playerIndex !== -1) {
      const player = players[playerIndex];
      const backup = players[playerIndex + 1]; // Next in depth
      
      return {
        position,
        injuredPlayer: player,
        primaryBackup: backup || null,
        allBackups: players.slice(playerIndex + 1, playerIndex + 4)
      };
    }
  }
  
  return null;
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--all') {
    // Scrape all teams
    scrapeAllTeams().then(data => {
      console.log('\n=== ALL DEPTH CHARTS ===');
      console.log(JSON.stringify(data, null, 2));
    });
  } else if (args[0]) {
    // Scrape single team
    const teamAbbr = args[0].toLowerCase();
    scrapeESPNDepthChart(teamAbbr).then(data => {
      console.log('\n=== DEPTH CHART ===');
      console.log(JSON.stringify(data, null, 2));
      
      // Example: Get backup for Trae Young
      if (teamAbbr === 'atl') {
        const backup = getBackupForPlayer(data, 'Trae Young');
        console.log('\n=== TRAE YOUNG BACKUP INFO ===');
        console.log(JSON.stringify(backup, null, 2));
      }
    });
  } else {
    console.log('Usage:');
    console.log('  node espn-depth-scraper.js atl       # Scrape single team');
    console.log('  node espn-depth-scraper.js --all     # Scrape all teams');
  }
}

module.exports = {
  scrapeESPNDepthChart,
  scrapeAllTeams,
  getBackupForPlayer,
  TEAMS
};
