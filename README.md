# ESPN NBA Depth Chart Scraper

A Node.js scraper for ESPN NBA depth charts to enhance fantasy basketball injury tracking and backup player recommendations.

## Why This Works Better

**The Problem**: Your current API uses position matching to find backups, which doesn't reflect actual depth charts. For example, when Trae Young is out, it might not identify Nickeil Alexander-Walker who actually starts in his place.

**The Solution**: This scraper pulls actual depth chart data from ESPN, showing who's actually next in line according to ESPN's basketball analysts.

## Installation

```bash
npm install
# or
npm install axios cheerio
```

## Quick Start

### 1. Scrape a Single Team

```bash
node espn-depth-scraper.js atl
```

Output:
```json
{
  "team": "ATL",
  "timestamp": "2024-12-30T...",
  "positions": {
    "PG": [
      {
        "depth": 1,
        "name": "Dyson Daniels",
        "espnId": "4869342",
        "injuryStatus": null
      },
      {
        "depth": 2,
        "name": "Keaton Wallace",
        "espnId": "4279118",
        "injuryStatus": null
      },
      ...
      {
        "depth": 5,
        "name": "Trae Young",
        "espnId": "4277905",
        "injuryStatus": "OUT"
      }
    ],
    "SG": [
      {
        "depth": 1,
        "name": "Nickeil Alexander-Walker",  // ← This is who starts when Trae is out!
        "espnId": "4278039",
        "injuryStatus": null
      },
      ...
    ]
  }
}
```

### 2. Scrape All Teams

```bash
node espn-depth-scraper.js --all
```

This will scrape all 30 NBA teams (takes ~1 minute with rate limiting).

### 3. Integration with Your API

```javascript
const { getBackupsEnhanced } = require('./depth-chart-integration');

// In your injury API endpoint
async function getBackups(player) {
  const backups = await getBackupsEnhanced(player, API_KEY, API_BASE);
  // Returns accurate backups based on ESPN depth chart + balldontlie stats
  return backups;
}
```

## How It Works

### ESPN Depth Chart Structure

ESPN displays depth charts in a table format:

| Position | Starter | 2nd | 3rd | 4th | 5th |
|----------|---------|-----|-----|-----|-----|
| PG       | Player1 | Player2 | Player3 | Player4 | Player5 |
| SG       | Player1 | Player2 | Player3 | Player4 | Player5 |
| ...      | ...     | ...  | ...  | ...  | ...  |

The scraper:
1. Fetches the HTML from `https://www.espn.com/nba/team/depth/_/name/{team}`
2. Parses the table using Cheerio
3. Extracts player names, ESPN IDs, and injury statuses
4. Returns structured JSON

### Integration Strategy

The `getBackupsEnhanced()` function:
1. **Scrapes ESPN depth chart** for the injured player's team
2. **Finds the injured player** in the depth chart
3. **Identifies the next players** in depth order
4. **Fetches stats from balldontlie** for those backup players
5. **Calculates fantasy metrics** (FPPM, ownership, projections)

## API Functions

### `scrapeESPNDepthChart(teamAbbr)`

Scrapes depth chart for a single team.

**Parameters:**
- `teamAbbr` (string): ESPN team code (e.g., 'atl', 'lal', 'bos')

**Returns:** Promise<DepthChart>

**Example:**
```javascript
const depthChart = await scrapeESPNDepthChart('atl');
console.log(depthChart.positions.PG); // All point guards in depth order
```

### `scrapeAllTeams()`

Scrapes all 30 NBA teams (with rate limiting).

**Returns:** Promise<{ [teamAbbr: string]: DepthChart }>

### `getBackupForPlayer(depthChart, playerName)`

Finds backups for a specific player in a depth chart.

**Parameters:**
- `depthChart` (DepthChart): Previously scraped depth chart
- `playerName` (string): Player name to search for

**Returns:** BackupInfo | null

**Example:**
```javascript
const backup = getBackupForPlayer(depthChart, 'Trae Young');
console.log(backup.primaryBackup); // Nickeil Alexander-Walker
```

### `getBackupsEnhanced(player, API_KEY, API_BASE)`

Enhanced backup finder that combines ESPN depth charts with balldontlie stats.

**Parameters:**
- `player` (object): Player object from balldontlie
- `API_KEY` (string): Your balldontlie API key
- `API_BASE` (string): balldontlie API base URL

**Returns:** Promise<Backup[]>

## Team Abbreviations

```javascript
const TEAMS = {
  ATL: 'atl', BOS: 'bos', BKN: 'bkn', CHA: 'cha', CHI: 'chi',
  CLE: 'cle', DAL: 'dal', DEN: 'den', DET: 'det', GSW: 'gs',
  HOU: 'hou', IND: 'ind', LAC: 'lac', LAL: 'lal', MEM: 'mem',
  MIA: 'mia', MIL: 'mil', MIN: 'min', NOP: 'no', NYK: 'ny',
  OKC: 'okc', ORL: 'orl', PHI: 'phi', PHX: 'phx', POR: 'por',
  SAC: 'sac', SAS: 'sa', TOR: 'tor', UTA: 'utah', WAS: 'wsh'
};
```

## Caching

The integration includes automatic caching:
- Depth charts are cached for **6 hours**
- Prevents excessive scraping
- Reduces load on ESPN's servers

```javascript
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
```

## Error Handling

The scraper includes comprehensive error handling:
- Network failures → Returns null/fallback data
- Missing data → Graceful degradation
- Rate limiting → Built-in delays

## Best Practices

### 1. Don't Over-Scrape
```javascript
// ❌ BAD: Scrape every time
for (let i = 0; i < 1000; i++) {
  await scrapeESPNDepthChart('atl');
}

// ✅ GOOD: Cache results
const cached = await getTeamDepthChart(teamId); // Uses cache
```

### 2. Use Rate Limiting
```javascript
// ✅ The scraper already includes delays
await scrapeAllTeams(); // Has built-in 2s delay between teams
```

### 3. Handle Failures Gracefully
```javascript
const backups = await getBackupsEnhanced(player, API_KEY, API_BASE);
if (!backups || backups.length === 0) {
  // Fall back to your original logic
  return getFallbackBackups(player);
}
```

## Example: Full Integration

```javascript
// In your Vercel serverless function
const { getBackupsEnhanced } = require('./depth-chart-integration');

module.exports = async (req, res) => {
  try {
    const injuriesResponse = await fetch(`${API_BASE}/v1/player_injuries?per_page=100`, {
      headers: { 'Authorization': API_KEY }
    });

    const injuriesData = await injuriesResponse.json();
    const enrichedInjuries = [];
    
    for (const injury of injuriesData.data) {
      const player = injury.player;
      if (!player) continue;

      // Get stats
      const statsResponse = await fetch(
        `${API_BASE}/v1/stats?player_ids[]=${player.id}&per_page=10&seasons[]=2024`,
        { headers: { 'Authorization': API_KEY } }
      );

      // Calculate averages...
      const avgMinutes = ...;
      const avgPoints = ...;

      // ✨ NEW: Get backups using ESPN depth chart
      const backups = await getBackupsEnhanced(player, API_KEY, API_BASE);

      enrichedInjuries.push({
        id: player.id,
        name: `${player.first_name} ${player.last_name}`,
        team: getTeamAbbr(player.team_id),
        position: player.position,
        injury: injury.description,
        status: injury.status,
        avgMinutes: avgMinutes,
        avgPoints: avgPoints,
        backups: backups // ← Accurate backups!
      });
    }

    return res.status(200).json({
      success: true,
      data: enrichedInjuries
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

## Limitations

1. **ESPN Changes**: If ESPN changes their HTML structure, the scraper will break and need updates
2. **No Historical Data**: Only shows current depth chart
3. **Rate Limiting**: Be respectful of ESPN's servers
4. **Terms of Service**: Check ESPN's ToS before deploying to production

## Alternatives Considered

| Source | Pro | Con |
|--------|-----|-----|
| ESPN Scraping | Free, updated daily | May break if HTML changes |
| RotoWire | Very accurate | Paywall ($) |
| Sportradar | Official API | $500-1000/month |
| balldontlie lineups | Free API | Requires historical analysis |

## Legal Considerations

**⚠️ Important**: Web scraping may violate ESPN's Terms of Service. This tool is for:
- Personal/educational use
- Development/testing
- Small-scale hobby projects

**For production apps with significant traffic**, consider:
1. Contacting ESPN for an official partnership
2. Using Sportradar or another paid API
3. Using the balldontlie lineups endpoint (free, legal)

## Troubleshooting

### "Could not find depth chart table"
ESPN changed their HTML structure. Update the cheerio selectors in the scraper.

### "Request failed with status 403"
ESPN blocked your IP. Wait a few hours, use a VPN, or add more realistic headers.

### "No backups found"
Player name doesn't match exactly. Try variations (e.g., "LeBron James" vs "LeBron").

## Contributing

Found a bug? ESPN changed their format? Submit an issue or PR!

## License

MIT - Use at your own risk. Not affiliated with ESPN or the NBA.
