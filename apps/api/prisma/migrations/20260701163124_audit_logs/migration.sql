/*
  Warnings:

  - You are about to drop the column `createdAt` on the `password_reset_token` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `password_reset_token` table. All the data in the column will be lost.
  - You are about to drop the column `tokenHash` on the `password_reset_token` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `password_reset_token` table. All the data in the column will be lost.
  - You are about to drop the column `usedAt` on the `password_reset_token` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `password_reset_token` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `refresh_token` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `refresh_token` table. All the data in the column will be lost.
  - You are about to drop the column `familyId` on the `refresh_token` table. All the data in the column will be lost.
  - You are about to drop the column `parentId` on the `refresh_token` table. All the data in the column will be lost.
  - You are about to drop the column `revokedAt` on the `refresh_token` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `refresh_token` table. All the data in the column will be lost.
  - You are about to drop the column `tokenHash` on the `refresh_token` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `refresh_token` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `revokedAt` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[token_hash]` on the table `password_reset_token` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[token_hash]` on the table `refresh_token` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expires_at` to the `password_reset_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token_hash` to the `password_reset_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `password_reset_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `password_reset_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expires_at` to the `refresh_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `family_id` to the `refresh_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_id` to the `refresh_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token_hash` to the `refresh_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `refresh_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expires_at` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "password_reset_token" DROP CONSTRAINT "password_reset_token_userId_fkey";

-- DropForeignKey
ALTER TABLE "refresh_token" DROP CONSTRAINT "refresh_token_parentId_fkey";

-- DropForeignKey
ALTER TABLE "refresh_token" DROP CONSTRAINT "refresh_token_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropIndex
DROP INDEX "password_reset_token_tokenHash_idx";

-- DropIndex
DROP INDEX "password_reset_token_tokenHash_key";

-- DropIndex
DROP INDEX "password_reset_token_userId_idx";

-- DropIndex
DROP INDEX "refresh_token_familyId_idx";

-- DropIndex
DROP INDEX "refresh_token_parentId_idx";

-- DropIndex
DROP INDEX "refresh_token_sessionId_idx";

-- DropIndex
DROP INDEX "refresh_token_tokenHash_key";

-- AlterTable
ALTER TABLE "password_reset_token" DROP COLUMN "createdAt",
DROP COLUMN "expiresAt",
DROP COLUMN "tokenHash",
DROP COLUMN "updatedAt",
DROP COLUMN "usedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "token_hash" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "used_at" TIMESTAMP(3),
ADD COLUMN     "user_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "refresh_token" DROP COLUMN "createdAt",
DROP COLUMN "expiresAt",
DROP COLUMN "familyId",
DROP COLUMN "parentId",
DROP COLUMN "revokedAt",
DROP COLUMN "sessionId",
DROP COLUMN "tokenHash",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "family_id" UUID NOT NULL,
ADD COLUMN     "parent_id" UUID,
ADD COLUMN     "revoked_at" TIMESTAMP(3),
ADD COLUMN     "session_id" UUID NOT NULL,
ADD COLUMN     "token_hash" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "createdAt",
DROP COLUMN "expiresAt",
DROP COLUMN "ipAddress",
DROP COLUMN "revokedAt",
DROP COLUMN "updatedAt",
DROP COLUMN "userAgent",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "revoked_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_agent" TEXT,
ADD COLUMN     "user_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_meta_idx" ON "audit_logs" USING GIN ("meta");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_token_token_hash_key" ON "password_reset_token"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_token_user_id_idx" ON "password_reset_token"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_token_token_hash_idx" ON "password_reset_token"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_token_family_id_idx" ON "refresh_token"("family_id");

-- CreateIndex
CREATE INDEX "refresh_token_session_id_idx" ON "refresh_token"("session_id");

-- CreateIndex
CREATE INDEX "refresh_token_parent_id_idx" ON "refresh_token"("parent_id");

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "refresh_token"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
