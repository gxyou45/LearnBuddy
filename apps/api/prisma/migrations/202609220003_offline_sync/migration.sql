ALTER TABLE "Attempt" ADD COLUMN "timeTrusted" BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE "SyncStream" (
 "id" UUID PRIMARY KEY, "learnerId" UUID NOT NULL REFERENCES "Learner"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
 "sessionId" UUID NOT NULL REFERENCES "LearningSession"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
 "nextSeq" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "SyncStream_learnerId_idx" ON "SyncStream"("learnerId");
CREATE TABLE "SyncEntry" (
 "streamId" UUID NOT NULL REFERENCES "SyncStream"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
 "seq" INTEGER NOT NULL, "payload" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'buffered', "message" TEXT,
 "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY("streamId","seq")
);
CREATE TABLE "ProgressSnapshot" (
 "learnerId" UUID NOT NULL REFERENCES "Learner"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
 "revision" INTEGER NOT NULL, "state" JSONB NOT NULL, PRIMARY KEY("learnerId","revision")
);
CREATE TABLE "LegacyImport" (
 "id" UUID PRIMARY KEY, "learnerId" UUID NOT NULL REFERENCES "Learner"("id") ON DELETE NO ACTION ON UPDATE CASCADE,
 "fingerprint" TEXT NOT NULL, "source" TEXT NOT NULL DEFAULT 'legacy_import', "raw" JSONB NOT NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "LegacyImport_learnerId_fingerprint_key" ON "LegacyImport"("learnerId","fingerprint");
