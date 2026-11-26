ALTER TABLE "games"
ADD COLUMN "playersPerMatch" INTEGER NOT NULL DEFAULT 10;

UPDATE "games"
SET "playersPerMatch" = 8
WHERE "slug" = 'tft';

ALTER TABLE "matchmaking_queues"
ADD COLUMN "matchId" UUID;

ALTER TABLE "matchmaking_queues"
ADD CONSTRAINT "matchmaking_queues_matchId_fkey"
FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "matchmaking_queues_matchId_idx"
ON "matchmaking_queues"("matchId");

ALTER TABLE "match_players"
ADD COLUMN "acceptedAt" TIMESTAMP(3);
