-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "total_rounds" INTEGER NOT NULL DEFAULT 3,
    "current_round" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "event_date" DATETIME,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "location" TEXT,
    "max_teams" INTEGER,
    "scoring_criteria" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_events" ("created_at", "created_by", "current_round", "description", "end_date", "id", "name", "scoring_criteria", "start_date", "status", "total_rounds", "updated_at") SELECT "created_at", "created_by", "current_round", "description", "end_date", "id", "name", "scoring_criteria", "start_date", "status", "total_rounds", "updated_at" FROM "events";
DROP TABLE "events";
ALTER TABLE "new_events" RENAME TO "events";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
