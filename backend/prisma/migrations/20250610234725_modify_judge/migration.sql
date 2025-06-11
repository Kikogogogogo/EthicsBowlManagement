/*
  Warnings:

  - You are about to drop the column `is_head_judge` on the `match_assignments` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_match_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "match_id" TEXT NOT NULL,
    "judge_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "match_assignments_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "match_assignments_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_match_assignments" ("created_at", "id", "judge_id", "match_id") SELECT "created_at", "id", "judge_id", "match_id" FROM "match_assignments";
DROP TABLE "match_assignments";
ALTER TABLE "new_match_assignments" RENAME TO "match_assignments";
CREATE UNIQUE INDEX "match_assignments_match_id_judge_id_key" ON "match_assignments"("match_id", "judge_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
