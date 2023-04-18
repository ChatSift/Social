-- AlterTable
ALTER TABLE "GuildSettings" ALTER COLUMN "requiredMessages" DROP NOT NULL,
ALTER COLUMN "xpGain" DROP NOT NULL,
ALTER COLUMN "requiredXpBase" DROP NOT NULL,
ALTER COLUMN "requiredXpMultiplier" DROP NOT NULL;
