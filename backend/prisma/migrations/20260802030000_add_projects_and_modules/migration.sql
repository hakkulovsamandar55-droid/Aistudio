-- AlterEnum
-- New AI modules. Values are only added here, never used in this migration,
-- so the "cannot use a new enum value in the same transaction" rule is safe.
ALTER TYPE "GenerationType" ADD VALUE 'VOICE';
ALTER TYPE "GenerationType" ADD VALUE 'MUSIC';
ALTER TYPE "GenerationType" ADD VALUE 'SCRIPT';

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "user_request" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "intent" JSONB NOT NULL,
    "plan" JSONB NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "credits_used" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "generations" ADD COLUMN     "project_id" TEXT,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "result_text" TEXT;

-- CreateIndex
CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");

-- CreateIndex
CREATE INDEX "generations_project_id_idx" ON "generations"("project_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generations" ADD CONSTRAINT "generations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
