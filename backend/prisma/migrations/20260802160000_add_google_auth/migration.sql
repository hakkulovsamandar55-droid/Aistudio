-- AlterTable
-- Google Sign-In accounts never set a password, and an existing
-- password-based account can later link a Google identity, so both columns
-- have to allow null / be optional-unique independently of each other.
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL,
ADD COLUMN     "google_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
