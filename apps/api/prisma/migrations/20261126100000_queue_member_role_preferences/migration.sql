ALTER TABLE "party_members"
ADD COLUMN "primaryRole" TEXT,
ADD COLUMN "secondaryRole" TEXT;

ALTER TABLE "match_players"
ADD COLUMN "role" TEXT;

CREATE TABLE "matchmaking_queue_members" (
  "id" UUID NOT NULL,
  "queueId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "primaryRole" TEXT,
  "secondaryRole" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "matchmaking_queue_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "matchmaking_queue_members_queueId_userId_key"
ON "matchmaking_queue_members"("queueId", "userId");
CREATE INDEX "matchmaking_queue_members_userId_idx"
ON "matchmaking_queue_members"("userId");

INSERT INTO "matchmaking_queue_members" ("id", "queueId", "userId", "primaryRole", "secondaryRole")
SELECT gen_random_uuid(), queue."id", member."userId", member."primaryRole", member."secondaryRole"
FROM "matchmaking_queues" AS queue
JOIN "party_members" AS member ON member."partyId" = queue."partyId"
WHERE queue."status" IN ('waiting', 'matched')
  AND queue."partyId" IS NOT NULL;

INSERT INTO "matchmaking_queue_members" ("id", "queueId", "userId")
SELECT gen_random_uuid(), queue."id", queue."userId"
FROM "matchmaking_queues" AS queue
WHERE queue."status" IN ('waiting', 'matched')
  AND queue."partyId" IS NULL
  AND queue."userId" IS NOT NULL;

ALTER TABLE "matchmaking_queue_members"
ADD CONSTRAINT "matchmaking_queue_members_queueId_fkey"
FOREIGN KEY ("queueId") REFERENCES "matchmaking_queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "matchmaking_queue_members"
ADD CONSTRAINT "matchmaking_queue_members_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
