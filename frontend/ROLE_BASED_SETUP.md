# Role-Based System Setup Guide

This guide explains how to set up the Google Sheets structure for the role-based Ethics Bowl scoring system.

## 🎯 System Overview

The system now supports two user roles:
- **Event Admin**: Can create events, manage matches, assign judges, and view all scores
- **Judge**: Can only score matches assigned to them

## 📊 Required Google Sheets Structure

You need to create the following worksheets in your Google Spreadsheet:

### 1. User Roles Sheet
**Sheet Name**: `User Roles`

| Column A | Column B | Column C | Column D |
|----------|----------|----------|----------|
| Email | Role | Name | Added Date |
| admin@example.com | event_admin | John Smith | 2024-01-01T00:00:00.000Z |
| judge1@example.com | judge | Jane Doe | 2024-01-01T00:00:00.000Z |
| judge2@example.com | judge | Bob Wilson | 2024-01-01T00:00:00.000Z |

**Role Values**:
- `event_admin` - Event Administrator
- `judge` - Judge

### 2. Events Sheet
**Sheet Name**: `Events`

| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H | Column I |
|----------|----------|----------|----------|----------|----------|----------|----------|----------|
| Event ID | Event Name | Event Date | Event Time | Venue | Description | Status | Created At | Created By |

### 3. Match Arrangement Sheet
**Sheet Name**: `Match Arrangement`

| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H | Column I | Column J | Column K |
|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|
| Match ID | Event ID | Match Name | Team A | Team B | Scheduled Time | Topic | Status | Assigned Judges | Created At | Created By |

### 4. Judge Assignments Sheet
**Sheet Name**: `Judge Assignments`

| Column A | Column B | Column C | Column D | Column E | Column F |
|----------|----------|----------|----------|----------|----------|
| Assignment ID | Match ID | Judge Email | Status | Assigned At | Assigned By |

### 5. All Teams Sheet (Existing)
**Sheet Name**: `All Teams`

| Column A |
|----------|
| Team Name |
| Team Alpha |
| Team Beta |
| Team Gamma |

### 6. All Judges Sheet (Existing)
**Sheet Name**: `All Judges`

| Column A |
|----------|
| Judge Name |
| Judge Smith |
| Judge Wilson |
| Judge Davis |

### 7. Total Competition Result Sheet (Existing)
**Sheet Name**: `Total Competition Result`

This is where the scoring data will be saved (existing structure).

## 🔧 Setup Steps

### Step 1: Create the Sheets Structure
1. Open your existing Google Sheet
2. Create the new worksheets mentioned above
3. Add the column headers as specified
4. Add initial data for user roles

### Step 2: Configure User Roles
1. In the `User Roles` sheet, add all users who need access
2. Set the first user as `event_admin` (this will be your main administrator)
3. Set other users as `judge`

### Step 3: Grant Sheet Permissions
1. Share the Google Sheet with "Anyone with the link" and "Editor" permissions
2. Or specifically share with all user emails with "Editor" permissions

### Step 4: Update Environment Variables
Make sure your `.env` file has the correct spreadsheet ID:

```env
REACT_APP_GOOGLE_API_KEY=your_api_key_here
REACT_APP_GOOGLE_CLIENT_ID=your_client_id_here
REACT_APP_SPREADSHEET_ID=your_spreadsheet_id_here
```

## 🎮 How to Use the System

### For Event Admins:
1. **Login** with Google account
2. **Create Events** in the Admin Panel
3. **Create Matches** for each event
4. **Assign Judges** to matches
5. **View all scores** and results

### For Judges:
1. **Login** with Google account
2. **View assigned matches** on the main page
3. **Select a match** to score
4. **Submit scores** for the selected match
5. **Only see matches assigned to them**

## 🔐 Security Features

- **Role-based access**: Users can only access features based on their role
- **Judge restrictions**: Judges can only score their assigned matches
- **Automatic user detection**: The system automatically detects user roles from the Google Sheet
- **Team/Judge pre-population**: For judges, team names and judge name are automatically set

## 🚀 Getting Started

1. Set up the Google Sheets structure as described above
2. Add yourself as an `event_admin` in the User Roles sheet
3. Add other users as `judge` with their email addresses
4. Start the application and login with your Google account
5. Begin creating events and assigning judges!

## 📝 Example Workflow

1. **Event Admin** creates a new event "Spring Ethics Bowl 2024"
2. **Event Admin** creates matches:
   - Match 1: Team Alpha vs Team Beta
   - Match 2: Team Gamma vs Team Delta
3. **Event Admin** assigns judges:
   - Assign judge1@example.com to Match 1
   - Assign judge2@example.com to Match 2
4. **Judges** login and see only their assigned matches
5. **Judges** score their matches
6. **Event Admin** can view all results and manage the tournament

## 🆘 Troubleshooting

### Common Issues:

**User shows as "Judge" but should be "Event Admin":**
- Check the User Roles sheet
- Ensure the email matches exactly (case-sensitive)
- Refresh the page after making changes

**Judge doesn't see any assigned matches:**
- Check the Judge Assignments sheet
- Ensure the judge's email is correctly assigned to matches
- Verify the matches exist in the Match Arrangement sheet

**Permission errors:**
- Ensure the Google Sheet is shared with appropriate permissions
- Check that Google Sheets API is enabled in Google Cloud Console
- Verify the user's email has access to the sheet

For more help, check the Google Sheets API documentation or contact your system administrator. 