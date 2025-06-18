# API Design for Ethics Bowl Scoring Platform

## Base URL
```
https://api.ethicsbowl.com/v1
```

## Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Permission Hierarchy
- **Admin**: Can perform ALL operations (inherits all judge and moderator permissions)
- **Moderator**: Can moderate matches and view related data
- **Judge**: Can score matches and view assigned data

Note: When an endpoint lists specific roles, admin can always access it as well.

## Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

## API Endpoints

### 1. Authentication (Google OAuth Only)

#### GET /auth/google
Initiate Google OAuth flow
```json
// Response
{
  "authUrl": "https://accounts.google.com/oauth/authorize?client_id=..."
}
```

#### POST /auth/google/callback
Handle Google OAuth callback
```json
// Request
{
  "code": "authorization_code_from_google"
}

// Response
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "judge",
    "avatarUrl": "https://lh3.googleusercontent.com/...",
    "isEmailVerified": true,
    "googleId": "google_user_id"
  }
}
```

#### POST /auth/google/token
Verify Google ID token (frontend-initiated flow)
```json
// Request
{
  "idToken": "google_id_token_here"
}

// Response - Same as Google callback
```

#### POST /auth/logout
Logout (invalidate token)
```json
// Response
{
  "message": "Successfully logged out"
}
```

#### GET /auth/me
Get current user info
```json
// Response
{
  "id": "uuid",
  "email": "judge@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "judge",
  "avatarUrl": "https://lh3.googleusercontent.com/...",
  "googleId": "google_user_id",
  "isEmailVerified": true,
  "lastLoginAt": "2024-01-15T10:30:00Z"
}
```

### 2. Events (Admin Only)

#### GET /events
Get all events
```json
// Response
{
  "events": [
    {
      "id": "uuid",
      "name": "Regional Ethics Bowl 2024",
      "description": "Annual regional competition",
      "totalRounds": 4,
      "currentRound": 1,
      "status": "active",
      "startDate": "2024-03-15",
      "endDate": "2024-03-16",
      "createdBy": "admin_uuid"
    }
  ]
}
```

#### POST /events
Create new event
```json
// Request
{
  "name": "Regional Ethics Bowl 2024",
  "description": "Annual regional competition",
  "totalRounds": 4,
  "startDate": "2024-03-15",
  "endDate": "2024-03-16",
  "scoringCriteria": {
    "presentationMaxScore": 100,
    "commentaryMaxScore": 100
  }
}

// Response
{
  "id": "uuid",
  "name": "Regional Ethics Bowl 2024",
  "status": "draft",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### PUT /events/:eventId
Update event details

#### DELETE /events/:eventId
Delete event

#### PUT /events/:eventId/status
Update event status (draft -> active -> completed)

### 3. Teams (Admin Only)

#### GET /events/:eventId/teams
Get all teams for an event

#### POST /events/:eventId/teams
Add team to event
```json
// Request
{
  "name": "University Team A",
  "school": "State University",
  "coachName": "Dr. Smith",
  "coachEmail": "smith@university.edu"
}
```

#### PUT /events/:eventId/teams/:teamId
Update team details

#### DELETE /events/:eventId/teams/:teamId
Remove team from event

### 4. Users (Admin Only)

#### GET /users
Get all users with filtering
```
?role=judge&search=john&isActive=false
```

#### GET /users/pending
Get pending users awaiting activation (Admin only)
```json
// Response
{
  "users": [
    {
      "id": "uuid",
      "email": "newuser@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "judge",
      "isActive": false,
      "googleId": "google_user_id",
      "createdAt": "2024-01-15T09:30:00Z"
    }
  ]
}
```

#### POST /users/:userId/activate
Activate user account (Admin only)
```json
// Request
{
  "role": "judge",  // or "moderator", "admin"
  "isActive": true
}

// Response
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "judge",
  "isActive": true,
  "googleId": "google_user_id",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

#### PUT /users/:userId
Update user details

// Note: All active users are automatically available for all events.
// No need for event-specific participant management.

### 5. Matches

#### GET /events/:eventId/matches
Get all matches for an event
```
?round=1&status=scheduled
```

#### POST /events/:eventId/matches
Create new match (Admin only)
```json
// Request
{
  "roundNumber": 1,
  "teamAId": "uuid",
  "teamBId": "uuid",
  "moderatorId": "uuid",
  "room": "Room A",
  "scheduledTime": "2024-03-15T09:00:00Z"
}
```

#### GET /matches/my
Get matches assigned to current user (Judge/Moderator)
```json
// Response for Judge
{
  "matches": [
    {
      "id": "uuid",
      "round": 1,
      "teamA": {"id": "uuid", "name": "Team A"},
      "teamB": {"id": "uuid", "name": "Team B"},
      "room": "Room A",
      "scheduledTime": "2024-03-15T09:00:00Z",
      "status": "scheduled",
      "currentStep": "intro",
      "myScoresSubmitted": false
    }
  ]
}
```

#### PUT /matches/:matchId/step
Update match step (Moderator only)
```json
// Request
{
  "step": "presentation_a"
}
```

#### PUT /matches/:matchId/status
Update match status (Moderator only)

#### POST /matches/:matchId/assignments
Assign judge to match (Admin only)
```json
// Request
{
  "judgeId": "uuid",
  "isHeadJudge": false
}
```

### 6. Scoring

#### GET /matches/:matchId/scores
Get all scores for a match
- Judges: only their own scores
- Moderators: all scores for their matches  
- Admins: all scores

#### POST /matches/:matchId/scores
Submit score (Judge only)
```json
// Request
{
  "teamId": "uuid",
  "presentationScore": 85,
  "commentaryScore": 78,
  "notes": "Strong ethical reasoning, clear presentation"
}
```

#### PUT /matches/:matchId/scores/:scoreId
Update score (Judge only, before submission)

#### POST /matches/:matchId/scores/submit
Submit all scores for a match (Judge only)
```json
// Request
{
  "scoreIds": ["uuid1", "uuid2"]
}
```

### 7. Statistics and Rankings

#### GET /events/:eventId/standings
Get team standings for an event
```json
// Response
{
  "standings": [
    {
      "rank": 1,
      "team": {
        "id": "uuid",
        "name": "Team A",
        "school": "University A"
      },
      "wins": 3,
      "losses": 1,
      "totalMatches": 4,
      "totalPoints": 340,
      "averageScore": 85.0,
      "pointDifferential": 45
    }
  ]
}
```

#### GET /events/:eventId/matches/:matchId/results
Get detailed match results
```json
// Response
{
  "match": {
    "id": "uuid",
    "teamA": {"name": "Team A"},
    "teamB": {"name": "Team B"},
    "winner": {"name": "Team A"},
    "status": "completed"
  },
  "scores": [
    {
      "judge": {"firstName": "John", "lastName": "Doe"},
      "teamAScore": 85,
      "teamBScore": 78,
      "notes": "Close match, both teams performed well"
    }
  ],
  "summary": {
    "teamATotal": 255,
    "teamBTotal": 234,
    "teamAAverage": 85.0,
    "teamBAverage": 78.0
  }
}
```

### 8. Pre-approved Emails (Admin/Moderator Only)

#### GET /pre-approved-emails
Get all pre-approved emails
```json
// Response
{
  "success": true,
  "data": {
    "preApprovedEmails": [
      {
        "id": "uuid",
        "email": "judge@university.edu",
        "role": "judge",
        "notes": "Regional competition judge",
        "creator": {
          "id": "uuid",
          "firstName": "Admin",
          "lastName": "User",
          "email": "admin@ethicsbowl.com"
        },
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "count": 1
  },
  "message": "Pre-approved emails retrieved successfully"
}
```

#### POST /pre-approved-emails
Add multiple pre-approved emails
```json
// Request
{
  "emails": [
    {
      "email": "judge1@university.edu",
      "role": "judge",
      "notes": "Regional competition judge"
    },
    {
      "email": "moderator@university.edu",
      "role": "moderator",
      "notes": "Regional competition moderator"
    }
  ]
}

// Response
{
  "success": true,
  "data": {
    "success": [
      {
        "id": "uuid",
        "email": "judge1@university.edu",
        "role": "judge",
        "notes": "Regional competition judge",
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "failed": [
      {
        "email": "invalid-email",
        "reason": "Invalid email format"
      }
    ],
    "duplicates": [
      {
        "email": "moderator@university.edu",
        "reason": "Email already pre-approved",
        "existingData": {
          "id": "uuid",
          "email": "moderator@university.edu",
          "role": "moderator"
        }
      }
    ]
  },
  "message": "Successfully processed 2 emails. 1 added, 1 duplicate, 0 failed."
}
```

#### POST /pre-approved-emails/import
Import pre-approved emails from text format
```json
// Request
{
  "emailsText": "judge1@university.edu\njudge2@university.edu,moderator@university.edu",
  "defaultRole": "judge"
}

// Response
{
  "success": true,
  "data": {
    "success": [...],
    "failed": [...],
    "duplicates": [...]
  },
  "message": "Import completed. 2 added, 1 duplicate, 0 failed."
}
```

#### PUT /pre-approved-emails/:emailId
Update pre-approved email details
```json
// Request
{
  "role": "moderator",
  "notes": "Updated notes"
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "judge@university.edu",
    "role": "moderator",
    "notes": "Updated notes",
    "updatedAt": "2024-01-15T11:00:00Z"
  },
  "message": "Pre-approved email updated successfully"
}
```

#### DELETE /pre-approved-emails/:emailId
Delete single pre-approved email
```json
// Response
{
  "success": true,
  "data": null,
  "message": "Pre-approved email deleted successfully"
}
```

#### DELETE /pre-approved-emails
Delete multiple pre-approved emails
```json
// Request
{
  "emailIds": ["uuid1", "uuid2"]
}

// Response
{
  "success": true,
  "data": {
    "success": ["uuid1"],
    "failed": [
      {
        "id": "uuid2",
        "reason": "Email not found"
      }
    ]
  },
  "message": "Deletion completed. 1 deleted, 1 failed."
}
```

#### GET /pre-approved-emails/check/:email
Check if email is pre-approved
```json
// Response
{
  "success": true,
  "data": {
    "isPreApproved": true,
    "preApprovedData": {
      "id": "uuid",
      "email": "judge@university.edu",
      "role": "judge",
      "notes": "Regional competition judge",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  },
  "message": "Email is pre-approved"
}
```

## Response Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized  
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

## Rate Limiting

- 100 requests per minute per IP for auth endpoints
- 1000 requests per minute per authenticated user for other endpoints

## Pagination

For list endpoints that return many items:
```
?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
``` 