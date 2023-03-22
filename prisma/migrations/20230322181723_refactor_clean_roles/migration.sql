/*
  Warnings:

  - You are about to drop the column `cleanRewardRoles` on the `GuildSettings` table. All the data in the column will be lost.
  - Added the required column `clean` to the `Reward` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GuildSettings" DROP COLUMN "cleanRewardRoles";

-- AlterTable
ALTER TABLE "Reward" ADD COLUMN     "clean" BOOLEAN NOT NULL;
