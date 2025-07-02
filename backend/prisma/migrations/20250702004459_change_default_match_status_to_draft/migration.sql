-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_matches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "team_a_id" TEXT,
    "team_b_id" TEXT,
    "moderator_id" TEXT,
    "room" TEXT,
    "scheduled_time" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "current_step" TEXT NOT NULL DEFAULT 'intro',
    "winner_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "matches_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "matches_team_b_id_fkey" FOREIGN KEY ("team_b_id") REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "matches_team_a_id_fkey" FOREIGN KEY ("team_a_id") REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "matches_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_matches" ("created_at", "current_step", "event_id", "id", "moderator_id", "room", "round_number", "scheduled_time", "status", "team_a_id", "team_b_id", "updated_at", "winner_id") SELECT "created_at", "current_step", "event_id", "id", "moderator_id", "room", "round_number", "scheduled_time", "status", "team_a_id", "team_b_id", "updated_at", "winner_id" FROM "matches";
DROP TABLE "matches";
ALTER TABLE "new_matches" RENAME TO "matches";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
