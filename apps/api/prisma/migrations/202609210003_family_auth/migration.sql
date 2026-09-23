-- Existing foundation rows have no login identity; reserved .invalid email preserves them.
ALTER TABLE "Account" ADD COLUMN "name" TEXT NOT NULL DEFAULT '家长',
 ADD COLUMN "email" TEXT,
 ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "image" TEXT,
 ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "role" TEXT NOT NULL DEFAULT 'parent';
UPDATE "Account" SET "email" = "id"::text || '@legacy.invalid';
ALTER TABLE "Account" ALTER COLUMN "email" SET NOT NULL;
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");
ALTER TABLE "Identity" ADD COLUMN "accessToken" TEXT, ADD COLUMN "refreshToken" TEXT,
 ADD COLUMN "idToken" TEXT, ADD COLUMN "accessTokenExpiresAt" TIMESTAMPTZ,
 ADD COLUMN "refreshTokenExpiresAt" TIMESTAMPTZ, ADD COLUMN "scope" TEXT,
 ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- Better Auth owns session token persistence; old placeholders are expired.
ALTER TABLE "AuthSession" RENAME COLUMN "tokenHash" TO "token";
ALTER INDEX "AuthSession_tokenHash_key" RENAME TO "AuthSession_token_key";
UPDATE "AuthSession" SET "expiresAt" = CURRENT_TIMESTAMP;
ALTER TABLE "AuthSession" ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "ipAddress" TEXT, ADD COLUMN "userAgent" TEXT;
CREATE TABLE "Verification" (
 "id" UUID NOT NULL, "identifier" TEXT NOT NULL, "value" TEXT NOT NULL,
 "expiresAt" TIMESTAMPTZ NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");
CREATE TABLE "RateLimit" (
 "id" UUID NOT NULL, "key" TEXT NOT NULL, "count" INTEGER NOT NULL, "lastRequest" BIGINT NOT NULL,
 CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");
