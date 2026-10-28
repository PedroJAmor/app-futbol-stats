-- CreateEnum
CREATE TYPE "MatchCategory" AS ENUM ('LEAGUE', 'MIDWEEK', 'SPECIAL');

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "address" TEXT,
ADD COLUMN     "mapUrl" TEXT,
ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "category" "MatchCategory",
ADD COLUMN     "courtId" INTEGER,
ADD COLUMN     "locationIsDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MatchTeam" ADD COLUMN     "defendedGoalId" INTEGER;

-- CreateTable
CREATE TABLE "Court" (
    "id" SERIAL NOT NULL,
    "venueId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "format" INTEGER,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Court_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" SERIAL NOT NULL,
    "courtId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Court_venueId_normalizedName_key" ON "Court"("venueId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "Goal_courtId_position_key" ON "Goal"("courtId", "position");

-- CreateIndex
CREATE INDEX "Match_courtId_playedAt_idx" ON "Match"("courtId", "playedAt");

-- CreateIndex
CREATE INDEX "Match_category_playedAt_idx" ON "Match"("category", "playedAt");

-- CreateIndex
CREATE INDEX "MatchTeam_defendedGoalId_idx" ON "MatchTeam"("defendedGoalId");

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchTeam" ADD CONSTRAINT "MatchTeam_defendedGoalId_fkey" FOREIGN KEY ("defendedGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

