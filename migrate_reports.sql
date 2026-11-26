ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "e2eePublicKey" TEXT;
CREATE TABLE IF NOT EXISTS "reports" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reporterId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "targetId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "evidenceUrl" TEXT,
  "status" TEXT DEFAULT 'PENDING',
  "reviewedBy" UUID REFERENCES "users"("id"),
  "action" TEXT,
  "actionReason" VARCHAR(500),
  "createdAt" TIMESTAMP(6) DEFAULT now(),
  "updatedAt" TIMESTAMP(6) DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_reports_reporter" ON reports("reporterId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_reports_target_status" ON reports("targetId", "status");
CREATE INDEX IF NOT EXISTS "idx_reports_status" ON reports("status");
CREATE TABLE IF NOT EXISTS "moderation_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "moderatorId" UUID NOT NULL REFERENCES "users"("id"),
  "actionType" TEXT NOT NULL,
  "targetId" UUID REFERENCES "users"("id"),
  "reason" VARCHAR(500),
  "reportId" UUID REFERENCES "reports"("id"),
  "createdAt" TIMESTAMP(6) DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_moderation_logs_moderator" ON moderation_logs("moderatorId", "createdAt");
SELECT 1;