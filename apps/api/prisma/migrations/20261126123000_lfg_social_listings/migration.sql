CREATE TABLE "lfg_listings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "creatorId" UUID NOT NULL,
  "partyId" UUID NOT NULL,
  "gameId" UUID NOT NULL,
  "mode" VARCHAR(32) NOT NULL,
  "region" VARCHAR(16) NOT NULL,
  "targetSize" INTEGER NOT NULL,
  "desiredRole" VARCHAR(32),
  "minimumRating" INTEGER,
  "maximumRating" INTEGER,
  "message" VARCHAR(240),
  "status" TEXT NOT NULL DEFAULT 'active',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "lfg_listings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lfg_applications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "listingId" UUID NOT NULL,
  "applicantId" UUID NOT NULL,
  "role" VARCHAR(32),
  "message" VARCHAR(240),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "lfg_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lfg_listings_partyId_key" ON "lfg_listings"("partyId");
CREATE INDEX "lfg_listings_gameId_mode_region_status_expiresAt_idx"
  ON "lfg_listings"("gameId", "mode", "region", "status", "expiresAt");
CREATE INDEX "lfg_listings_creatorId_status_idx" ON "lfg_listings"("creatorId", "status");
CREATE UNIQUE INDEX "lfg_applications_listingId_applicantId_key"
  ON "lfg_applications"("listingId", "applicantId");
CREATE INDEX "lfg_applications_listingId_status_idx" ON "lfg_applications"("listingId", "status");
CREATE INDEX "lfg_applications_applicantId_status_idx" ON "lfg_applications"("applicantId", "status");

ALTER TABLE "lfg_listings"
ADD CONSTRAINT "lfg_listings_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "lfg_listings_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "lfg_listings_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lfg_applications"
ADD CONSTRAINT "lfg_applications_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "lfg_listings"("id")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "lfg_applications_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
