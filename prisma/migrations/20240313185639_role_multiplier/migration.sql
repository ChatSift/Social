-- CreateTable
CREATE TABLE "Role" (
    "roleId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "multiplier" INTEGER DEFAULT 1,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("roleId","guildId")
);
