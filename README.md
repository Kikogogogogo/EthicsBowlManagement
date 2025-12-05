# Ethics Bowl Management System

A comprehensive web application for managing Ethics Bowl tournaments, providing tools for event organization, team management, match scheduling, scoring, and real-time updates.
<img width="936" height="737" alt="5ffcea5abd3c083668ad30ebb5fa7f5" src="https://github.com/user-attachments/assets/734c5c6f-596a-421e-b8b4-79614323efc5" />

<img width="940" height="745" alt="24e7683457b2699384145e21d313a58" src="https://github.com/user-attachments/assets/038cfb3c-da1c-4d6a-ad5d-ce2e3d60a833" />

<img width="938" height="650" alt="4b70e57bef599d736756bd675aeecce" src="https://github.com/user-attachments/assets/5565b1f9-29c9-4080-ab77-cab64c4a0f62" />



## Features

### Event Management
- Create and manage multiple Ethics Bowl events
- Configure event settings (rounds, teams, scoring criteria)
- Track event status (draft, active, completed)
- Export event results and standings

### Team Management
- Add, edit, and remove teams from events
- Manage team information (name, school, contact details)
- Real-time team data synchronization across all interfaces

### Match Management
- Create individual matches or generate tournaments
- **Round Robin**: Each team plays once per round with consistent match counts
- **Swiss Tournament**: Smart pairing based on performance and avoiding repeats
- Assign judges and moderators to matches
- Track match status through detailed workflow stages

### Scoring System
- Customizable scoring criteria with flexible point allocation
- Judge scoring interface with real-time updates
- Automatic score calculation and ranking
- Comprehensive scoring history and analytics
- **Manual Adjustments**: Admin tools for vote and win point adjustments
  - Vote Adjustment: Modify team voting scores
  - Win Point Adjustment: Adjust win/loss/tie records
  - Full audit trail with admin logs

### User Management
- Role-based access control (Admin, Judge, Moderator)
- Google OAuth integration for secure authentication
- User activation system with pre-approved email lists
- Admin protection against unauthorized role changes

### Real-time Features
- Live match status updates
- WebSocket integration for instant notifications
- Real-time standings and leaderboards
- Cross-page data synchronization

## Technology Stack

### Backend
- **Node.js** with Express.js framework
- **PostgreSQL** database with Prisma ORM
- **Google OAuth 2.0** for authentication
- **WebSocket** support for real-time updates
- **JWT** for session management

### Frontend
- **Vanilla JavaScript** with modern ES6+ features
- **Tailwind CSS** for responsive, modern UI
- **Vite** for fast development and building
- **Real-time WebSocket** client integration

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- Google OAuth 2.0 credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd EthicsBowlManagement
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   
   Create `backend/.env` file:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/ethics_bowl"
   JWT_SECRET="your-jwt-secret-key"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   NODE_ENV="development"
   PORT=3000
   ```

4. **Database Setup**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start Development Servers**
   ```bash
   # Start backend (from backend directory)
   npm run dev

   # Start frontend (from frontend directory, in another terminal)
   npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:80000
   - Backend API: http://localhost:3000

## Usage Guide

### Getting Started
1. **First Time Setup**: Register using a pre-approved email address
2. **Admin Access**: First user becomes admin automatically
3. **Create Event**: Set up your first Ethics Bowl event
4. **Add Teams**: Register participating teams
5. **Generate Matches**: Use Round Robin or Swiss tournament generation
6. **Start Tournament**: Begin matches and scoring

### User Roles

#### Admin
- Full system access
- Event and team management
- User role management
- Match creation and oversight
- System configuration

#### Judge
- Score assigned matches
- View match details and criteria
- Submit scoring decisions
- Access judging interface

#### Moderator
- Manage match flow and timing
- Control match status progression
- Oversee team presentations
- Coordinate with judges

### Tournament Formats

#### Round Robin
- Each team plays once per round
- Consistent number of matches per round
- Fair distribution across multiple rounds
- Automatic handling of odd team numbers

#### Swiss Tournament
- Performance-based pairing system
- Avoids repeat matchups
- Balanced competitive progression
- Ideal for larger tournaments

### Scoring System
- **Customizable Criteria**: Define scoring categories and point values
- **Judge Collaboration**: Multiple judges score each match
- **Automatic Calculation**: Real-time score totals and rankings
- **Detailed Analytics**: Comprehensive scoring breakdowns

## Architecture

### Project Structure
```
EthicsBowlManagement/
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Authentication & validation
│   │   └── utils/           # Helper functions
│   ├── prisma/              # Database schema and migrations
│   └── package.json
├── frontend/                # Vite-based web application
│   ├── src/
│   │   ├── js/              # Core JavaScript modules
│   │   ├── pages/           # Page-specific components
│   │   ├── styles/          # CSS and styling
│   │   └── assets/          # Static resources
│   ├── index.html           # Main HTML template
│   └── package.json
└── README.md
```

### API Documentation
The backend provides RESTful APIs for:
- `/api/auth` - Authentication and user management
- `/api/events` - Event operations
- `/api/teams` - Team management
- `/api/matches` - Match scheduling and status
- `/api/scores` - Scoring and results
- `/api/users` - User administration

## Development

### Code Style
- ESLint configuration for consistent JavaScript style
- Prettier for automated code formatting
- Modern ES6+ JavaScript features throughout

### Database Management
```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# View database
npx prisma studio
```

### Building for Production
```bash
# Build frontend
cd frontend
npm run build

# Start production backend
cd backend
npm start
```

## Deployment

### Frontend (Vercel)
1. Build the frontend: `npm run build` in frontend directory
2. Deploy the `dist` folder to your hosting service
3. Configure environment variables for API endpoints

### Backend (Render)
1. Set up PostgreSQL database
2. Configure environment variables
3. Deploy backend code
4. Run database migrations: `npx prisma migrate deploy`

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
JWT_SECRET=your_production_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Make Changes**: Follow existing code style and patterns
4. **Test Thoroughly**: Ensure all features work as expected
5. **Commit Changes**: `git commit -m 'Add amazing feature'`
6. **Push to Branch**: `git push origin feature/amazing-feature`
7. **Open Pull Request**: Describe your changes clearly

### Development Guidelines
- Follow existing code structure and naming conventions
- Add comments for complex logic
- Test new features thoroughly
- Update documentation as needed

### Suggested Improvement
- **Restrict access for judges and moderators** – Each moderator or judge should only be able to access the event space(s) they are specifically assigned to.  
- **Allow judge management in ongoing events** – Admin users should be able to modify an ongoing match, such as adding a fourth judge or replacing an existing judge, and removing previously submitted scores if needed.  
- **Provide a predefined room list** – When creating a match for an event, allow selection from a predefined list of rooms.  
- **Prevent duplicate team assignments** – Display an error if the same team is assigned more than once in a single round, regardless of whether they compete against the same or a different team.  
- **Enable round-specific scheduling** – Allow setting a specific start time for each round, ensuring all matches in that round begin within the same time window.  
- **Moderator scoring access** – Allow moderators to view the scoring results for the matches they are assigned to.  
- **Expand login options** – Support username/password authentication in addition to Google sign-in.  
- **Stage-based scoring** – Allow judges to assign scores to different questions in different stages, based on the stage set by the moderator.  
  
## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions, issues, or contributions:

1. **Check existing issues** in the GitHub repository
2. **Create new issue** with detailed description
3. **Join discussions** in project forums
4. **Contact maintainers** for urgent matters

## Acknowledgments

- Built for Ethics Bowl tournament organizers and participants
- Inspired by the need for comprehensive tournament management
- Thanks to all contributors and the Ethics Bowl community

---

**Made with love for the Ethics Bowl Community**
