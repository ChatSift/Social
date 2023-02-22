// !!! PLEASE READ !!!
// This file's content is snatched straight out of our generated @prisma/client
// It's here because we need it for Routes to use types that DON'T rely on prisma
// Because otherwise we would need to somehow share our prisma.schema (and 2 others) with the frontend
// Which would NOT work. Absolutely make sure to use the types below and to cast away any types from @prsisma/client

export const LevelUpNotificationMode = {
	Channel: 'Channel',
	DM: 'DM',
	None: 'None',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type LevelUpNotificationMode = (typeof LevelUpNotificationMode)[keyof typeof LevelUpNotificationMode];

export type GuildSettings = {
	cleanRewardRoles: boolean;
	guildId: string;
	levelUpNotificationFallbackChannelId: string | null;
	levelUpNotificationMessage: string | null;
	levelUpNotificationMode: LevelUpNotificationMode;
	requiredMessages: number;
	requiredMessagesTimespan: number | null;
	requiredXpBase: number;
	requiredXpMultiplier: number;
	xpGain: number;
};

export type Reward = {
	guildId: string;
	level: number;
	roleId: string;
};

export type User = {
	guildId: string;
	ignored: boolean;
	userId: string;
	xp: number;
};

export type Channel = {
	channelId: string;
	guildId: string;
	ignored: boolean;
	multiplier: number | null;
};
