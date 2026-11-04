CREATE TABLE IF NOT EXISTS "SswDashboardTrackingCache" (
  "cacheKey" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "consultadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SswDashboardTrackingCache_pkey" PRIMARY KEY ("cacheKey")
);

CREATE INDEX IF NOT EXISTS "SswDashboardTrackingCache_expiresAt_idx"
  ON "SswDashboardTrackingCache"("expiresAt");
