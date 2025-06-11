-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "avatar_url" TEXT,
    "google_id" TEXT NOT NULL,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "total_rounds" INTEGER NOT NULL,
    "current_round" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "start_date" DATETIME,
    "end_date" DATETIME,
    "scoring_criteria" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "school" TEXT,
    "coach_name" TEXT,
    "coach_email" TEXT,
    "event_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "teams_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "team_a_id" TEXT,
    "team_b_id" TEXT,
    "moderator_id" TEXT,
    "room" TEXT,
    "scheduled_time" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "current_step" TEXT NOT NULL DEFAULT 'intro',
    "winner_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "matches_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "matches_team_a_id_fkey" FOREIGN KEY ("team_a_id") REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "matches_team_b_id_fkey" FOREIGN KEY ("team_b_id") REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "matches_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "match_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "match_id" TEXT NOT NULL,
    "judge_id" TEXT NOT NULL,
    "is_head_judge" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "match_assignments_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "match_assignments_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "match_id" TEXT NOT NULL,
    "judge_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "presentation_score" INTEGER NOT NULL,
    "commentary_score" INTEGER NOT NULL,
    "notes" TEXT,
    "is_submitted" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "scores_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "scores_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "scores_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_assignments_match_id_judge_id_key" ON "match_assignments"("match_id", "judge_id");

-- CreateIndex
CREATE UNIQUE INDEX "scores_match_id_judge_id_team_id_key" ON "scores"("match_id", "judge_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_participants_event_id_user_id_key" ON "event_participants"("event_id", "user_id");
