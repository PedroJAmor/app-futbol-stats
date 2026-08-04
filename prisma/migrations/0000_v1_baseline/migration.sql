-- Baseline for databases that were originally created with prisma db push.
-- Apply with prisma migrate resolve --applied 0000_v1_baseline. Do not execute it.

CREATE TYPE "Role" AS ENUM ('ADMIN', 'ANOTADOR', 'JUGADOR', 'VIEWER');
CREATE TYPE "Resultado" AS ENUM ('WIN', 'LOSS', 'DRAW');

CREATE TABLE "User" (
  "id" SERIAL NOT NULL,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'VIEWER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Player" (
  "id" SERIAL NOT NULL,
  "nombre" TEXT NOT NULL,
  "apodo" TEXT,
  "foto" TEXT,
  "fechaNac" TIMESTAMP(3),
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Match" (
  "id" SERIAL NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL,
  "formato" INTEGER NOT NULL,
  "cancha" TEXT,
  "precio" DOUBLE PRECISION,
  "clima" TEXT,
  "temperatura" DOUBLE PRECISION,
  "notas" TEXT,
  "mvpId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchTeam" (
  "id" SERIAL NOT NULL,
  "matchId" INTEGER NOT NULL,
  "color" TEXT NOT NULL,
  "resultado" "Resultado" NOT NULL,
  CONSTRAINT "MatchTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchPlayerStat" (
  "id" SERIAL NOT NULL,
  "teamId" INTEGER NOT NULL,
  "playerId" INTEGER NOT NULL,
  "goles" INTEGER,
  "golesEc" INTEGER,
  CONSTRAINT "MatchPlayerStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "MatchPlayerStat_teamId_playerId_key" ON "MatchPlayerStat"("teamId", "playerId");
ALTER TABLE "MatchTeam" ADD CONSTRAINT "MatchTeam_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchPlayerStat" ADD CONSTRAINT "MatchPlayerStat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "MatchTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchPlayerStat" ADD CONSTRAINT "MatchPlayerStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
