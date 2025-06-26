-- Drop old columns
ALTER TABLE "scores" DROP COLUMN "presentation_score";
ALTER TABLE "scores" DROP COLUMN "commentary_score";

-- Add new column for comment scores
ALTER TABLE "scores" ADD COLUMN "comment_scores" TEXT;
