/*
  Warnings:

  - You are about to drop the column `cleanRewardRoles` on the `GuildSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GuildSettings" DROP COLUMN "cleanRewardRoles";

-- AlterTable
ALTER TABLE "Reward" ADD COLUMN     "clean" BOOLEAN NOT NULL DEFAULT false;
