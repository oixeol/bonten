ALTER TABLE "matchmaking_queue_members"
ADD COLUMN "ratingSnapshot" INTEGER NOT NULL DEFAULT 1000;
