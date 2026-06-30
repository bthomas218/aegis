-- CreateEnum
CREATE TYPE "UserRoles" AS ENUM ('USER', 'ADMIN', 'SYSTEM_ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRoles" NOT NULL DEFAULT 'USER';
