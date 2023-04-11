-- CreateTable
CREATE TABLE "SocialInteraction" (
    "guildId" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "embed" BOOLEAN NOT NULL DEFAULT false,
    "allowTargets" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SocialInteraction_pkey" PRIMARY KEY ("guildId","name")
);
