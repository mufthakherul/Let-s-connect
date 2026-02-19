-- Migration: add email verification fields to Users
-- Run manually in production if you don't use sequelize.sync({ alter: true })

ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isEmailVerified" BOOLEAN DEFAULT false;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "emailVerificationCode" VARCHAR;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "emailVerificationCodeExpiresAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "emailVerificationToken" VARCHAR;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "emailVerificationTokenExpiresAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "lastVerificationSentAt" TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS "users_email_verification_token_idx" ON "Users" ("emailVerificationToken");
