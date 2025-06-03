# Ethics Bowl Scoreboard

A modern, user-friendly scoring system for Ethics Bowl competitions. This web app streamlines the judging process, ensures data accuracy, and integrates seamlessly with Google Sheets for real-time result collection.

## Features
- **Custom Header**: Displays the official Ethics Bowl logo and event title.
- **Automated Scoring**: Calculates total scores based on base criteria and judge questions, with automatic winner selection.
- **Dropdown Selections**: Team and judge names are selected from Google Sheets, preventing manual entry errors.
- **Comprehensive Validation**: All fields must be completed, and teams must be different before submission is allowed.
- **Google Sheets Integration**: Results are submitted directly to a designated sheet for easy tracking and analysis.
- **Responsive UI**: Clean, modern interface suitable for desktop and tablet use.

## Scoring Criteria
- **Clarity & Systematicity**: 1-5 points
- **Moral Dimension**: 1-5 points
- **Opposing Viewpoints**: 1-5 points
- **Commentary**: 1-10 points
- **Response**: 1-10 points
- **Respectful Dialogue**: 1-5 points
- **Judge Questions**: 1-20 points each (3 questions)

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ethics-bowl-scoreboard.git
   cd ethics-bowl-scoreboard/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

## Usage
- Open the app in your browser (usually at http://localhost:3000).
- Select Team A, Team B, and Judge from the dropdowns (populated from Google Sheets).
- Enter scores for each criterion.
- The system will automatically calculate totals and display the winner.
- Click "Submit Scores" to send the results to Google Sheets.

## Google Sheets Integration
- Make sure you have set up the required Google Sheets and provided API credentials in the backend/service layer.
- Team and judge names are fetched from "All Teams" and "All Judges" sheets.
- Results are submitted to the "Total Competition Result" sheet.

## Tech Stack
- **Frontend**: React, Tailwind CSS
- **Backend/Service**: Google Sheets API (via custom service)

## License
MIT 