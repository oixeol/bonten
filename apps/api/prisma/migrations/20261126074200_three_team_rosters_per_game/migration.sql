ALTER TABLE "team_rosters"
ADD COLUMN "squad" INTEGER NOT NULL DEFAULT 1;

DROP INDEX "team_rosters_teamId_gameId_key";

UPDATE "team_rosters" AS roster
SET "name" = roster."name" || ' - Equipe 1'
WHERE roster."gameId" IS NOT NULL;

INSERT INTO "team_rosters" ("id", "teamId", "gameId", "squad", "name", "players", "showOwner", "createdAt")
SELECT
  gen_random_uuid(),
  team."id",
  game."id",
  squads.squad,
  team."name" || ' - ' || game."name" || ' - Equipe ' || squads.squad,
  '[]'::jsonb,
  false,
  CURRENT_TIMESTAMP
FROM "teams" AS team
CROSS JOIN "games" AS game
CROSS JOIN generate_series(1, 3) AS squads(squad)
WHERE game."hasTeams" = true
  AND NOT EXISTS (
    SELECT 1
    FROM "team_rosters" AS roster
    WHERE roster."teamId" = team."id"
      AND roster."gameId" = game."id"
      AND roster."squad" = squads.squad
  );

CREATE UNIQUE INDEX "team_rosters_teamId_gameId_squad_key"
ON "team_rosters"("teamId", "gameId", "squad");
