ALTER TABLE "Learner" ADD COLUMN "huntDistractorCount" INTEGER;
ALTER TABLE "Learner" ADD CONSTRAINT "Learner_huntDistractorCount_check" CHECK ("huntDistractorCount" IS NULL OR "huntDistractorCount" IN (2, 4));
