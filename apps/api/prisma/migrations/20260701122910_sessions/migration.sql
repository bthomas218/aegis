/*
  Warnings:

  - You are about to drop the column `userId` on the `refresh_token` table. All the data in the column will be lost.
  - Added the required column `familyId` to the `refresh_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionId` to the `refresh_token` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "refresh_token" DROP CONSTRAINT "refresh_token_userId_fkey";

-- AlterTable
ALTER TABLE "refresh_token" DROP COLUMN "userId",
ADD COLUMN     "familyId" UUID NOT NULL,
ADD COLUMN     "parentId" UUID,
ADD COLUMN     "sessionId" UUID NOT NULL;

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refresh_token_familyId_idx" ON "refresh_token"("familyId");

-- CreateIndex
CREATE INDEX "refresh_token_sessionId_idx" ON "refresh_token"("sessionId");

-- CreateIndex
CREATE INDEX "refresh_token_parentId_idx" ON "refresh_token"("parentId");

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "refresh_token"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
