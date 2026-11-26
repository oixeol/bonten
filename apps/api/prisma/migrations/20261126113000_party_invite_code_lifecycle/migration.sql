ALTER TABLE "parties"
ADD COLUMN "inviteCode" TEXT,
ADD COLUMN "inviteCodeExpiresAt" TIMESTAMP(3);

UPDATE "parties"
SET
  "inviteCode" = gen_random_uuid()::TEXT,
  "inviteCodeExpiresAt" = CURRENT_TIMESTAMP + INTERVAL '30 days'
WHERE "status" IN ('lobby', 'in_queue');

CREATE UNIQUE INDEX "parties_inviteCode_key" ON "parties"("inviteCode");
CREATE INDEX "parties_inviteCodeExpiresAt_idx" ON "parties"("inviteCodeExpiresAt");
