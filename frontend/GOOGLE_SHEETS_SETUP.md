# Google Sheets Setup Guide for Ethics Bowl Scoring System

## 📊 Step 1: Create a Google Sheet

1. **Go to [Google Sheets](https://sheets.google.com/)**
2. **Click "Create new" → "Blank spreadsheet"**
3. **Name your spreadsheet**: "Ethics Bowl Scores" (or any name you prefer)
4. **Copy the Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```
   The SPREADSHEET_ID is the long string between `/d/` and `/edit`

## 🏷️ Step 2: Set Up Column Headers (Optional but Recommended)

In your Google Sheet, add these headers in Row 1:

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T | U | V | W | X | Y | Z |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Timestamp | Team A Name | Team B Name | Team A - Clarity | Team A - Moral | Team A - Opposing | Team A - Commentary | Team A - Response | Team A - Respectful | Team A - Judge Q1 | Team A - Judge Q2 | Team A - Judge Q3 | Team A - Avg Judge | Team A - Total | Team B - Clarity | Team B - Moral | Team B - Opposing | Team B - Commentary | Team B - Response | Team B - Respectful | Team B - Judge Q1 | Team B - Judge Q2 | Team B - Judge Q3 | Team B - Avg Judge | Team B - Total | Winner |

## 🔐 Step 3: Share the Sheet (Important!)

1. **Click the "Share" button** in the top-right corner of your Google Sheet
2. **Under "General access"**, change from "Restricted" to **"Anyone with the link"**
3. **Set permission to "Editor"** (this allows the app to write data)
4. **Click "Copy link"** and save it for reference

> ⚠️ **Important**: The sheet must be publicly editable for the API to work, or you need to specifically share it with your Google account email.

## 🛠️ Step 4: Update Your .env File

Make sure your `frontend/.env` file contains:

```env
REACT_APP_GOOGLE_API_KEY=AIzaSyArCJekrrCZsW6n64s_iF-GGljH57gBsDI
REACT_APP_GOOGLE_CLIENT_ID=223635700437-mdlel46tteosqhmaqclpob9mgtpcdrdu.apps.googleusercontent.com
REACT_APP_SPREADSHEET_ID=YOUR_SPREADSHEET_ID_HERE
```

Replace `YOUR_SPREADSHEET_ID_HERE` with the actual ID from Step 1.

## 🔧 Step 5: Google Cloud Console Settings

### Enable Required APIs:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Library**
3. Search and enable:
   - ✅ **Google Sheets API**
   - ✅ **Google Drive API** (optional, for better access control)

### OAuth Consent Screen:
1. Go to **APIs & Services > OAuth consent screen**
2. Add your email to **"Test users"** section
3. Make sure the app is configured for your domain

### OAuth Client Configuration:
1. Go to **APIs & Services > Credentials**
2. Find your OAuth 2.0 Client ID
3. Ensure **Authorized JavaScript origins** includes:
   - `http://localhost:3000`
   - `https://localhost:3000`

## 🧪 Step 6: Test the Setup

1. **Start your React app**: `npm start`
2. **Login with Google** using the login button
3. **Fill out a sample scorecard**
4. **Click "Submit Scores"**
5. **Check your Google Sheet** - you should see the data appear!

## 🔍 Troubleshooting

### Common Issues:

**"Permission denied" error:**
- Make sure the Google Sheet is shared publicly or with your account
- Check that Google Sheets API is enabled
- Verify the spreadsheet ID is correct

**"Authentication failed" error:**
- Try logging out and logging back in
- Check if your email is added to OAuth test users
- Clear browser cache and try again

**"Google Sheet not found" error:**
- Double-check the spreadsheet ID in your .env file
- Make sure the sheet exists and is accessible

### Data Format:
The app will automatically create rows with this structure:
- Column A: Timestamp
- Columns B-C: Team names
- Columns D-M: Team A scores and totals
- Columns N-W: Team B scores and totals
- Column X: Winner

## 📈 Viewing Your Data

Your Google Sheet will automatically populate with:
- ✅ Timestamp of each submission
- ✅ Team names
- ✅ Individual rubric scores (1-5)
- ✅ Judge question scores
- ✅ Calculated totals and averages
- ✅ Winner designation

The data is immediately available for analysis, sharing, or export! 