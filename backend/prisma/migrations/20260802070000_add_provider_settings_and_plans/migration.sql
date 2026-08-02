-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'PRO');

-- AlterTable
-- Existing users default to FREE, which is the correct starting state.
ALTER TABLE "users" ADD COLUMN     "plan" "PlanType" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "plan_expires_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "provider_settings" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "api_key_enc" TEXT,
    "base_url" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provider_settings_provider_key" ON "provider_settings"("provider");
