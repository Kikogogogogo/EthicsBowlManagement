# Example Tournament Data

## 📋 Overview

The application automatically creates an **example tournament** called **"Tie-Breaking Test Tournament"** on first startup. This tournament demonstrates all Partial Round-Robin tie-breaking rules, including the coin flip mechanism.

## 🎯 Purpose

This example tournament serves as:
- **Live demonstration** of the ranking system
- **Testing ground** for tie-breaking logic
- **Reference implementation** for tournament organizers
- **Quality assurance** that the system works correctly in production

## 📊 Tournament Structure

### Teams (8 total)
- **Team A-F**: Complete 5 rounds (full schedule)
- **Team G-H**: Only play 1 match (against each other)

### Expected Rankings

After all tie-breaking rules are applied:

| Rank | Team | Record | Matches | Notes |
|------|------|--------|---------|-------|
| 1 | Team A | 3W-1L-1T | 5 | Tied with B, resolved by tie-breakers |
| 2 | Team B | 3W-1L-1T | 5 | Tied with A, resolved by tie-breakers |
| 3 | Team C | 3W-2L-0T | 5 | Tied with E, resolved by tie-breakers |
| 4 | Team E | 3W-2L-0T | 5 | Tied with C, resolved by tie-breakers |
| 5 | Team D | 1W-3L-1T | 5 | Independent ranking |
| 6 | Team F | 0W-4L-1T | 5 | Independent (different match count than G/H) |
| 7 | Team G | 0W-0L-1T | 1 | Tied with H, **resolved by COIN FLIP** 🪙 |
| 8 | Team H | 0W-0L-1T | 1 | Tied with G, **resolved by COIN FLIP** 🪙 |

## 🔧 Tie-Breaking Scenarios Demonstrated

### 1. **Head-to-Head Results** (A vs B, C vs E)
- Teams with same wins and same match count
- Resolved by looking at direct matches between tied teams

### 2. **Different Match Counts** (F vs G/H)
- Team F: 0.5 wins in 5 matches
- Team G/H: 0.5 wins in 1 match
- **Important**: These teams are NOT tied despite same win count
- System correctly separates them based on `totalMatches`

### 3. **Coin Flip Mechanism** (G vs H)
- Both teams have identical statistics:
  - Same wins: 0.5
  - Same matches: 1
  - Same votes: 1.5
  - Same score differential: 0
  - Same opponents: each other
- All tie-breakers exhausted → **Random draw (coin flip)**

## 🚀 Automatic Creation

The example tournament is created automatically on server startup if it doesn't already exist.

### Implementation

**Location**: `backend/src/utils/init-example-data.js`

**Trigger**: Called in `backend/src/app.js` during `startServer()`

```javascript
// In startServer()
const { initializeExampleData } = require('./utils/init-example-data');
await initializeExampleData();
```

### Startup Logs

When the server starts, you'll see:
```
🎬 Checking for example tournament data...
✅ Example tournament already exists, skipping creation.
```

Or if creating for the first time:
```
🎬 Checking for example tournament data...
📝 Example tournament not found, creating it now...
🎬 Creating example tournament: "Tie-Breaking Test Tournament"...
✅ Example tournament created successfully!
   Event: Tie-Breaking Test Tournament
   Teams: 8
   Matches: 16
   This tournament demonstrates:
   • Teams with different match counts (F plays 5, G/H play 1)
   • Multiple tie-breaking scenarios
   • Coin flip mechanism (Teams G and H)
```

## 📖 Viewing the Example

1. Start the application
2. Log in as any user
3. Navigate to **Events** page
4. Open **"Tie-Breaking Test Tournament"**
5. Click **"Match Ranking"** tab
6. Click **"📋 Log"** button to see detailed ranking calculations

## 🧹 Cleaning Example Data

If you want to remove the example tournament and recreate it:

```bash
# Run the clean script
node backend/scripts/clean-test-tournament.js

# Restart the server (it will recreate automatically)
npm run dev
```

## 🔒 Data Isolation

The example tournament uses:
- **Separate users**: `example.judge1@ethicsbowl.com`, etc.
- **Separate teams**: `example.coach[a-h]@ethicsbowl.com`
- **Clear naming**: "Example" prefix to distinguish from real data

This prevents conflicts with production data.

## ⚙️ Configuration

### Disable Auto-Creation (if needed)

To prevent automatic creation, comment out the initialization in `app.js`:

```javascript
// In backend/src/app.js
// await initializeExampleData();  // <-- Comment this line
```

### Modify Example Data

Edit `backend/src/utils/init-example-data.js` to change:
- Team names
- Match results
- Number of rounds
- Voting distributions

## 📝 Notes

- Example data is **read-only** in production (users can view but not modify)
- The coin flip result is **randomized** each time rankings are calculated
- All scores follow the same scoring criteria as real tournaments
- The example is automatically available in **all deployments** (dev, staging, production)

