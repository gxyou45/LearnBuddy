-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "ContentRelease" (
    "id" TEXT NOT NULL,
    "contentVersion" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetVersion" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "AssetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonVersion" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "LessonVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterVersion" (
    "id" TEXT NOT NULL,
    "lessonVersionId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "CharacterVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordVersion" (
    "id" TEXT NOT NULL,
    "lessonVersionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "audioAssetId" TEXT NOT NULL,

    CONSTRAINT "WordVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryVersion" (
    "id" TEXT NOT NULL,
    "lessonVersionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "StoryVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonStep" (
    "id" TEXT NOT NULL,
    "lessonVersionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "LessonStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionVersion" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "options" JSONB NOT NULL,
    "ruleVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "QuestionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuntSceneVersion" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "imageAssetId" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "HuntSceneVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Identity" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "passwordHash" TEXT,

    CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Learner" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "nickname" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Learner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningSession" (
    "id" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "lessonVersionId" TEXT NOT NULL,
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ,

    CONSTRAINT "LearningSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionPresentation" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "questionVersionId" TEXT NOT NULL,
    "renderedOptions" JSONB NOT NULL,
    "sceneSnapshot" JSONB,

    CONSTRAINT "QuestionPresentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningEvent" (
    "id" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "clientEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMPTZ NOT NULL,
    "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "presentationId" UUID NOT NULL,
    "answer" JSONB NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "prompted" BOOLEAN NOT NULL,
    "ruleVersion" INTEGER NOT NULL,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningProgress" (
    "learnerId" UUID NOT NULL,
    "characterId" TEXT NOT NULL,
    "mastery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "reviewDueAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "LearningProgress_pkey" PRIMARY KEY ("learnerId","characterId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Theme_releaseId_position_key" ON "Theme"("releaseId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "AssetVersion_releaseId_sourceId_key" ON "AssetVersion"("releaseId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonVersion_releaseId_lessonId_key" ON "LessonVersion"("releaseId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterVersion_lessonVersionId_characterId_key" ON "CharacterVersion"("lessonVersionId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryVersion_lessonVersionId_key" ON "StoryVersion"("lessonVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonStep_lessonVersionId_position_key" ON "LessonStep"("lessonVersionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionVersion_stepId_key" ON "QuestionVersion"("stepId");

-- CreateIndex
CREATE UNIQUE INDEX "Identity_provider_subject_key" ON "Identity"("provider", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "Learner_accountId_idx" ON "Learner"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningSession_id_learnerId_key" ON "LearningSession"("id", "learnerId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionPresentation_id_sessionId_key" ON "QuestionPresentation"("id", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningEvent_learnerId_clientEventId_key" ON "LearningEvent"("learnerId", "clientEventId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningEvent_id_sessionId_key" ON "LearningEvent"("id", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_eventId_key" ON "Attempt"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_eventId_sessionId_key" ON "Attempt"("eventId", "sessionId");

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "ContentRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetVersion" ADD CONSTRAINT "AssetVersion_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "ContentRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonVersion" ADD CONSTRAINT "LessonVersion_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "ContentRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterVersion" ADD CONSTRAINT "CharacterVersion_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordVersion" ADD CONSTRAINT "WordVersion_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordVersion" ADD CONSTRAINT "WordVersion_audioAssetId_fkey" FOREIGN KEY ("audioAssetId") REFERENCES "AssetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryVersion" ADD CONSTRAINT "StoryVersion_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonStep" ADD CONSTRAINT "LessonStep_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionVersion" ADD CONSTRAINT "QuestionVersion_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "LessonStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HuntSceneVersion" ADD CONSTRAINT "HuntSceneVersion_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "ContentRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HuntSceneVersion" ADD CONSTRAINT "HuntSceneVersion_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "AssetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Identity" ADD CONSTRAINT "Identity_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Learner" ADD CONSTRAINT "Learner_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_lessonVersionId_fkey" FOREIGN KEY ("lessonVersionId") REFERENCES "LessonVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPresentation" ADD CONSTRAINT "QuestionPresentation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LearningSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPresentation" ADD CONSTRAINT "QuestionPresentation_questionVersionId_fkey" FOREIGN KEY ("questionVersionId") REFERENCES "QuestionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_sessionId_learnerId_fkey" FOREIGN KEY ("sessionId", "learnerId") REFERENCES "LearningSession"("id", "learnerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_eventId_sessionId_fkey" FOREIGN KEY ("eventId", "sessionId") REFERENCES "LearningEvent"("id", "sessionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_presentationId_sessionId_fkey" FOREIGN KEY ("presentationId", "sessionId") REFERENCES "QuestionPresentation"("id", "sessionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningProgress" ADD CONSTRAINT "LearningProgress_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

