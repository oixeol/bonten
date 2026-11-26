ALTER TABLE "games"
ADD COLUMN "roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "games"
SET "roles" = ARRAY['top', 'jungle', 'mid', 'adc', 'support']::TEXT[]
WHERE "slug" = 'lol';

ALTER TABLE "party_members"
ADD COLUMN "role" TEXT;

UPDATE "party_members"
SET "role" = CASE COALESCE("primaryRole", "secondaryRole")
  WHEN 'bot' THEN 'adc'
  ELSE COALESCE("primaryRole", "secondaryRole")
END;

ALTER TABLE "party_members"
DROP COLUMN "primaryRole",
DROP COLUMN "secondaryRole";

ALTER TABLE "matchmaking_queue_members"
ADD COLUMN "role" TEXT;

UPDATE "matchmaking_queue_members"
SET "role" = CASE COALESCE("primaryRole", "secondaryRole")
  WHEN 'bot' THEN 'adc'
  ELSE COALESCE("primaryRole", "secondaryRole")
END;

ALTER TABLE "matchmaking_queue_members"
DROP COLUMN "primaryRole",
DROP COLUMN "secondaryRole";

UPDATE "match_players"
SET "role" = 'adc'
WHERE "role" = 'bot';
