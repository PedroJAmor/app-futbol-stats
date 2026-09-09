CREATE TABLE "Venue" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Venue" ("name", "normalizedName")
SELECT MIN(REGEXP_REPLACE(BTRIM("venue"), '[[:space:]]+', ' ', 'g')), LOWER(REGEXP_REPLACE(BTRIM("venue"), '[[:space:]]+', ' ', 'g'))
FROM "Match"
WHERE NULLIF(BTRIM("venue"), '') IS NOT NULL
GROUP BY LOWER(REGEXP_REPLACE(BTRIM("venue"), '[[:space:]]+', ' ', 'g'));

ALTER TABLE "Match" ADD COLUMN "venueId" INTEGER;

UPDATE "Match" AS match
SET "venueId" = venue.id
FROM "Venue" AS venue
WHERE LOWER(REGEXP_REPLACE(BTRIM(match."venue"), '[[:space:]]+', ' ', 'g')) = venue."normalizedName";

ALTER TABLE "Match" DROP COLUMN "venue";

CREATE UNIQUE INDEX "Venue_normalizedName_key" ON "Venue"("normalizedName");
CREATE INDEX "Venue_name_idx" ON "Venue"("name");
CREATE INDEX "Match_venueId_idx" ON "Match"("venueId");

ALTER TABLE "Match" ADD CONSTRAINT "Match_venueId_fkey"
  FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
