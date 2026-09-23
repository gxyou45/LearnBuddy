ALTER TABLE "Learner" ADD COLUMN "learningReleaseId" TEXT REFERENCES "ContentRelease"("id") ON UPDATE CASCADE,
 ADD COLUMN "learningRevision" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "openAllCourses" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "learningTimeZone" TEXT NOT NULL DEFAULT 'Asia/Shanghai';
ALTER TABLE "LearningSession" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'lesson',
 ADD COLUMN "requestId" UUID, ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "currentStep" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "reviewStepId" TEXT,
 ADD COLUMN "huntFound" JSONB NOT NULL DEFAULT '[]',
 ADD COLUMN "lastActiveAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "LearningSession_learnerId_requestId_key" ON "LearningSession"("learnerId","requestId");
ALTER TABLE "QuestionPresentation" ADD COLUMN "prompted" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "audioHeard" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "audioFailed" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "QuestionPresentation_sessionId_questionVersionId_key" ON "QuestionPresentation"("sessionId","questionVersionId");
ALTER TABLE "Attempt" ADD COLUMN "skipped" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "audioHeard" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "audioFailed" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "targetId" TEXT, ADD COLUMN "skillType" TEXT,
 ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "Attempt_presentationId_key" ON "Attempt"("presentationId");
CREATE INDEX "Attempt_targetId_skillType_createdAt_idx" ON "Attempt"("targetId","skillType","createdAt");
CREATE TABLE "LearnerLesson" (
 "learnerId" UUID NOT NULL REFERENCES "Learner"("id") ON UPDATE CASCADE, "lessonId" TEXT NOT NULL,
 "firstCompletedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastCompletedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("learnerId","lessonId")
);
CREATE TABLE "LearningSkill" (
 "learnerId" UUID NOT NULL REFERENCES "Learner"("id") ON UPDATE CASCADE, "targetId" TEXT NOT NULL, "kind" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'practice', "wrongCount" INTEGER NOT NULL DEFAULT 0, "dueDate" TEXT NOT NULL,
 "questionVersionId" TEXT NOT NULL REFERENCES "QuestionVersion"("id") ON UPDATE CASCADE, "ruleVersion" INTEGER NOT NULL DEFAULT 1,
 "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY ("learnerId","targetId","kind")
);
CREATE INDEX "LearningSkill_learnerId_dueDate_idx" ON "LearningSkill"("learnerId","dueDate");
CREATE TABLE "MistakeItem" (
 "id" UUID PRIMARY KEY, "learnerId" UUID NOT NULL REFERENCES "Learner"("id") ON UPDATE CASCADE,
 "questionVersionId" TEXT NOT NULL REFERENCES "QuestionVersion"("id") ON UPDATE CASCADE, "targetId" TEXT NOT NULL, "kind" TEXT NOT NULL,
 "wrongCount" INTEGER NOT NULL DEFAULT 1, "status" TEXT NOT NULL DEFAULT 'practice',
 "firstWrongAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastWrongAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "latestWrongAttemptId" UUID NOT NULL REFERENCES "Attempt"("id") ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MistakeItem_learnerId_questionVersionId_key" ON "MistakeItem"("learnerId","questionVersionId");
CREATE INDEX "MistakeItem_learnerId_status_id_idx" ON "MistakeItem"("learnerId","status","id");
