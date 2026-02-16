-- Create UserFollows table for following relationships
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "UserFollows" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "followerId" UUID NOT NULL,
  "followedId" UUID NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("followerId", "followedId")
);

CREATE INDEX IF NOT EXISTS "UserFollows_follower_idx" ON "UserFollows" ("followerId");
CREATE INDEX IF NOT EXISTS "UserFollows_followed_idx" ON "UserFollows" ("followedId");
