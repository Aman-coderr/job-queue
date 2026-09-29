/*
  Warnings:

  - A unique constraint covering the columns `[userId,idempotencyKey]` on the table `Job` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Job_idempotencyKey_key";

-- CreateIndex
CREATE UNIQUE INDEX "Job_userId_idempotencyKey_key" ON "Job"("userId", "idempotencyKey");
