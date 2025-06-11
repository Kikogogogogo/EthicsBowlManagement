# Database Design for Ethics Bowl Scoring Platform

## Core Entities and Relationships

### 1. Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'judge', 'moderator') NOT NULL,
    avatar_url VARCHAR(500),
    
    -- Google OAuth fields (required for all users)
    google_id VARCHAR(255) UNIQUE NOT NULL, -- Google user ID
    is_email_verified BOOLEAN DEFAULT true, -- Google emails are pre-verified
    
    is_active BOOLEAN DEFAULT false, -- New users require admin activation
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User Registration Flow:
-- 1. User logs in with Google OAuth for the first time
-- 2. System automatically creates user record with default 'judge' role
-- 3. User account is created as inactive (is_active = false)
-- 4. Admin must manually activate user and assign proper role
```

### 2. Events Table
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_rounds INTEGER NOT NULL,
    current_round INTEGER DEFAULT 1,
    status ENUM('draft', 'active', 'completed') DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    scoring_criteria JSONB, -- Flexible scoring rules
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Teams Table
```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    school VARCHAR(255),
    coach_name VARCHAR(255),
    coach_email VARCHAR(255),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Matches Table
```sql
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    team_a_id UUID REFERENCES teams(id),
    team_b_id UUID REFERENCES teams(id),
    moderator_id UUID REFERENCES users(id),
    room VARCHAR(100),
    scheduled_time TIMESTAMP,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    current_step ENUM('intro', 'presentation_a', 'commentary_b', 'questions_a', 'presentation_b', 'commentary_a', 'questions_b', 'deliberation', 'completed') DEFAULT 'intro',
    winner_id UUID REFERENCES teams(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Match Assignments Table (Many-to-Many: Matches and Judges)
```sql
CREATE TABLE match_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    judge_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_head_judge BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(match_id, judge_id)
);
```

### 6. Scores Table
```sql
CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    judge_id UUID REFERENCES users(id),
    team_id UUID REFERENCES teams(id),
    presentation_score INTEGER CHECK (presentation_score >= 0 AND presentation_score <= 100),
    commentary_score INTEGER CHECK (commentary_score >= 0 AND commentary_score <= 100),
    total_score INTEGER GENERATED ALWAYS AS (presentation_score + commentary_score) STORED,
    notes TEXT,
    is_submitted BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(match_id, judge_id, team_id)
);
```

### 7. Event Participants Table (Many-to-Many: Events and Users)
```sql
CREATE TABLE event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role ENUM('judge', 'moderator') NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);
```

### 8. Team Statistics View (for rankings)
```sql
CREATE VIEW team_statistics AS
WITH team_scores AS (
    SELECT 
        t.id as team_id,
        t.name as team_name,
        t.event_id,
        m.id as match_id,
        COALESCE(AVG(s.total_score), 0) as team_match_score,
        CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END as is_winner,
        -- Calculate opponent average score for point differential
        COALESCE(AVG(
            CASE WHEN m.team_a_id = t.id 
                 THEN (SELECT AVG(s2.total_score) FROM scores s2 WHERE s2.match_id = m.id AND s2.team_id = m.team_b_id AND s2.is_submitted = true)
                 ELSE (SELECT AVG(s2.total_score) FROM scores s2 WHERE s2.match_id = m.id AND s2.team_id = m.team_a_id AND s2.is_submitted = true)
            END
        ), 0) as opponent_match_score
    FROM teams t
    LEFT JOIN matches m ON (m.team_a_id = t.id OR m.team_b_id = t.id) AND m.status = 'completed'
    LEFT JOIN scores s ON s.match_id = m.id AND s.team_id = t.id AND s.is_submitted = true
    GROUP BY t.id, t.name, t.event_id, m.id, m.winner_id
)
SELECT 
    team_id,
    team_name,
    event_id,
    COUNT(match_id) as total_matches,
    SUM(is_winner) as wins,
    COUNT(match_id) - SUM(is_winner) as losses,
    COALESCE(AVG(team_match_score), 0) as average_score,
    COALESCE(SUM(team_match_score), 0) as total_points,
    COALESCE(SUM(team_match_score) - SUM(opponent_match_score), 0) as point_differential
FROM team_scores
GROUP BY team_id, team_name, event_id;
```

## Indexes for Performance

```sql
-- User authentication
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

CREATE INDEX idx_users_active ON users(is_active);

-- Event queries
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_created_by ON events(created_by);

-- Match queries
CREATE INDEX idx_matches_event_round ON matches(event_id, round_number);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_moderator ON matches(moderator_id);

-- Score queries
CREATE INDEX idx_scores_match_judge ON scores(match_id, judge_id);
CREATE INDEX idx_scores_submitted ON scores(is_submitted, submitted_at);

-- Assignment queries
CREATE INDEX idx_match_assignments_judge ON match_assignments(judge_id);
CREATE INDEX idx_event_participants_user ON event_participants(user_id);
``` 