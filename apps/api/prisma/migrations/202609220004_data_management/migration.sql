ALTER TABLE "Account" ADD COLUMN "cleanupToken" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "ContentDraft" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "ContentUpload" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "ContentAudit" ALTER COLUMN "actorId" DROP NOT NULL;
CREATE TABLE "DataDeletion" (
 "requestId" UUID PRIMARY KEY, "accountId" UUID NOT NULL, "learnerId" UUID,
 "learnerIds" JSONB NOT NULL, "scope" TEXT NOT NULL, "cleanupTokenHash" TEXT,
 "deletedAt" TIMESTAMPTZ NOT NULL
);
CREATE INDEX "DataDeletion_accountId_idx" ON "DataDeletion"("accountId");
