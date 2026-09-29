-- Keep first-attempt evidence immutable; corrections are practice history only.
ALTER TABLE "QuestionPresentation" ADD COLUMN "retries" JSONB NOT NULL DEFAULT '[]';
