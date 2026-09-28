-- Existing sessions keep NULL and their original layout until the next play.
ALTER TABLE "LearningSession" ADD COLUMN "huntRound" JSONB;
