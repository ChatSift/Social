-- CreateEnum
CREATE TYPE "LevelUpNotificationMode" AS ENUM ('None', 'DM', 'Channel');

-- CreateTable
CREATE TABLE "GuildSettings" (
    "guildId" TEXT NOT NULL,
    "requiredMessages" INTEGER NOT NULL,
    "requiredMessagesTimespan" INTEGER,
    "xpGain" INTEGER NOT NULL,
    "requiredXpBase" INTEGER NOT NULL,
    "requiredXpMultiplier" INTEGER NOT NULL,
    "levelUpNotificationMode" "LevelUpNotificationMode" NOT NULL DEFAULT 'None',
    "levelUpNotificationFallbackChannelId" TEXT,
    "levelUpNotificationMessage" TEXT,
    "cleanRewardRoles" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GuildSettings_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "Reward" (
    "roleId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("roleId","guildId")
);

-- CreateTable
CREATE TABLE "User" (
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "ignored" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId","guildId")
);

-- CreateTable
CREATE TABLE "Channel" (
    "channelId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "ignored" BOOLEAN NOT NULL DEFAULT false,
    "multiplier" INTEGER DEFAULT 1,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("channelId","guildId")
);
