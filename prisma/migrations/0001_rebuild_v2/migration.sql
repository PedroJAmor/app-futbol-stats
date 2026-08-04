-- Controlled in-place V2 migration. Run only after migration-scripts/preflight-v1.ts.

ALTER TYPE "Role" RENAME TO "LegacyRole";
ALTER TYPE "Resultado" RENAME TO "MatchResult";
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');
CREATE TYPE "TeamSide" AS ENUM ('A', 'B');
CREATE TYPE "ForumMentionTarget" AS ENUM ('MATCH', 'PLAYER');

ALTER TABLE "User" RENAME TO "LegacyCredentialUser";
ALTER INDEX "User_pkey" RENAME TO "LegacyCredentialUser_pkey";
ALTER INDEX "User_username_key" RENAME TO "LegacyCredentialUser_username_key";

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "playerId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "Player" RENAME COLUMN "nombre" TO "firstName";
ALTER TABLE "Player" RENAME COLUMN "apodo" TO "nickname";
ALTER TABLE "Player" RENAME COLUMN "foto" TO "photoUrl";
ALTER TABLE "Player" RENAME COLUMN "fechaNac" TO "birthDate";
ALTER TABLE "Player" RENAME COLUMN "activo" TO "isActive";
ALTER TABLE "Player" ADD COLUMN "legacyFullName" TEXT;
ALTER TABLE "Player" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Player" ADD COLUMN "lastName" TEXT;
ALTER TABLE "Player" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Player" SET "legacyFullName" = "firstName";

ALTER TABLE "Match" RENAME COLUMN "fecha" TO "playedAt";
ALTER TABLE "Match" RENAME COLUMN "formato" TO "format";
ALTER TABLE "Match" RENAME COLUMN "cancha" TO "venue";
ALTER TABLE "Match" RENAME COLUMN "clima" TO "weather";
ALTER TABLE "Match" RENAME COLUMN "notas" TO "notes";
ALTER TABLE "Match" ADD COLUMN "priceCents" INTEGER;
UPDATE "Match" SET "priceCents" = ROUND("precio" * 100)::INTEGER WHERE "precio" IS NOT NULL;
ALTER TABLE "Match" DROP COLUMN "precio";
ALTER TABLE "Match" ALTER COLUMN "temperatura" TYPE DECIMAL(5,2) USING "temperatura"::DECIMAL(5,2);
ALTER TABLE "Match" RENAME COLUMN "temperatura" TO "temperature";
ALTER TABLE "Match" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Match" ADD COLUMN "hiddenAt" TIMESTAMP(3);
ALTER TABLE "Match" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Match" ADD CONSTRAINT "Match_format_positive" CHECK ("format" > 0);

ALTER TABLE "MatchTeam" RENAME COLUMN "resultado" TO "result";
ALTER TABLE "MatchTeam" ADD COLUMN "side" "TeamSide";
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "matchId" ORDER BY "id") AS row_number
  FROM "MatchTeam"
)
UPDATE "MatchTeam" AS team
SET "side" = CASE WHEN ranked.row_number = 1 THEN 'A'::"TeamSide" ELSE 'B'::"TeamSide" END
FROM ranked
WHERE team."id" = ranked."id";
ALTER TABLE "MatchTeam" ALTER COLUMN "side" SET NOT NULL;

ALTER TABLE "MatchPlayerStat" RENAME TO "MatchParticipation";
ALTER TABLE "MatchParticipation" RENAME COLUMN "goles" TO "goals";
ALTER TABLE "MatchParticipation" RENAME COLUMN "golesEc" TO "ownGoals";
ALTER TABLE "MatchParticipation" ADD COLUMN "matchId" INTEGER;
UPDATE "MatchParticipation" AS participation
SET "matchId" = team."matchId"
FROM "MatchTeam" AS team
WHERE participation."teamId" = team."id";
ALTER TABLE "MatchParticipation" ALTER COLUMN "matchId" SET NOT NULL;
ALTER INDEX "MatchPlayerStat_pkey" RENAME TO "MatchParticipation_pkey";
ALTER INDEX "MatchPlayerStat_teamId_playerId_key" RENAME TO "MatchParticipation_teamId_playerId_key";
ALTER TABLE "MatchParticipation" RENAME CONSTRAINT "MatchPlayerStat_teamId_fkey" TO "MatchParticipation_teamId_fkey";
ALTER TABLE "MatchParticipation" RENAME CONSTRAINT "MatchPlayerStat_playerId_fkey" TO "MatchParticipation_playerId_fkey";

CREATE TABLE "ForumPost" (
  "id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "parentId" TEXT,
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ForumMention" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "targetType" "ForumMentionTarget" NOT NULL,
  "matchId" INTEGER,
  "playerId" INTEGER,
  "token" TEXT NOT NULL,
  "labelSnapshot" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ForumMention_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnonymousRateLimit" (
  "id" TEXT NOT NULL,
  "fingerprintHash" TEXT NOT NULL,
  "bucketStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnonymousRateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_playerId_key" ON "User"("playerId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE INDEX "Player_isHidden_isActive_idx" ON "Player"("isHidden", "isActive");
CREATE INDEX "Player_firstName_lastName_idx" ON "Player"("firstName", "lastName");
CREATE INDEX "Match_isHidden_playedAt_idx" ON "Match"("isHidden", "playedAt" DESC);
CREATE INDEX "Match_mvpId_idx" ON "Match"("mvpId");
CREATE UNIQUE INDEX "MatchTeam_matchId_side_key" ON "MatchTeam"("matchId", "side");
CREATE INDEX "MatchTeam_matchId_idx" ON "MatchTeam"("matchId");
CREATE UNIQUE INDEX "MatchParticipation_matchId_playerId_key" ON "MatchParticipation"("matchId", "playerId");
CREATE INDEX "MatchParticipation_playerId_matchId_idx" ON "MatchParticipation"("playerId", "matchId");
CREATE INDEX "MatchParticipation_teamId_idx" ON "MatchParticipation"("teamId");
CREATE INDEX "ForumPost_parentId_createdAt_idx" ON "ForumPost"("parentId", "createdAt");
CREATE INDEX "ForumPost_isHidden_createdAt_idx" ON "ForumPost"("isHidden", "createdAt" DESC);
CREATE UNIQUE INDEX "ForumMention_token_key" ON "ForumMention"("token");
CREATE INDEX "ForumMention_postId_idx" ON "ForumMention"("postId");
CREATE INDEX "ForumMention_matchId_idx" ON "ForumMention"("matchId");
CREATE UNIQUE INDEX "AnonymousRateLimit_fingerprintHash_bucketStart_key" ON "AnonymousRateLimit"("fingerprintHash", "bucketStart");
CREATE INDEX "AnonymousRateLimit_expiresAt_idx" ON "AnonymousRateLimit"("expiresAt");

ALTER TABLE "User" ADD CONSTRAINT "User_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_mvpId_fkey" FOREIGN KEY ("mvpId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MatchParticipation" ADD CONSTRAINT "MatchParticipation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ForumPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ForumMention" ADD CONSTRAINT "ForumMention_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumMention" ADD CONSTRAINT "ForumMention_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
