ALTER TABLE "team_rosters"
ADD COLUMN "gameId" UUID,
ADD COLUMN "showOwner" BOOLEAN NOT NULL DEFAULT false;

WITH ranked_rosters AS (
  SELECT "id", "teamId", ROW_NUMBER() OVER (PARTITION BY "teamId" ORDER BY "createdAt", "id") AS position
  FROM "team_rosters"
)
UPDATE "team_rosters" AS roster
SET "gameId" = team."gameId"
FROM ranked_rosters AS ranked
JOIN "teams" AS team ON team."id" = ranked."teamId"
WHERE roster."id" = ranked."id"
  AND ranked.position = 1
  AND team."gameId" IS NOT NULL;

INSERT INTO "team_rosters" ("id", "teamId", "gameId", "name", "players", "showOwner", "createdAt")
SELECT gen_random_uuid(), team."id", game."id", team."name" || ' - ' || game."name", '[]'::jsonb, false, CURRENT_TIMESTAMP
FROM "teams" AS team
CROSS JOIN "games" AS game
WHERE game."hasTeams" = true
  AND NOT EXISTS (
    SELECT 1
    FROM "team_rosters" AS roster
    WHERE roster."teamId" = team."id"
      AND roster."gameId" = game."id"
  );

CREATE UNIQUE INDEX "team_rosters_teamId_gameId_key" ON "team_rosters"("teamId", "gameId");

CREATE TABLE "team_roster_members" (
  "id" UUID NOT NULL,
  "rosterId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'player',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_roster_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "team_roster_members_rosterId_userId_key" ON "team_roster_members"("rosterId", "userId");
CREATE INDEX "team_roster_members_userId_idx" ON "team_roster_members"("userId");

ALTER TABLE "team_rosters"
ADD CONSTRAINT "team_rosters_gameId_fkey"
FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_roster_members"
ADD CONSTRAINT "team_roster_members_rosterId_fkey"
FOREIGN KEY ("rosterId") REFERENCES "team_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_roster_members"
ADD CONSTRAINT "team_roster_members_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "team_roster_members" ("id", "rosterId", "userId", "role")
SELECT gen_random_uuid(), roster."id", member."userId",
  CASE member."role"
    WHEN 'captain' THEN 'captain'
    WHEN 'reserve' THEN 'reserve'
    ELSE 'player'
  END
FROM "team_rosters" AS roster
JOIN "teams" AS team ON team."id" = roster."teamId" AND team."gameId" = roster."gameId"
JOIN "team_members" AS member ON member."teamId" = team."id"
WHERE member."leftAt" IS NULL
  AND member."role" <> 'owner'
ON CONFLICT ("rosterId", "userId") DO NOTHING;
