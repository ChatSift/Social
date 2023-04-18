// !!! PLEASE READ !!!
// This file's content is snatched straight out of our generated @prisma/client
// It's here because we need it for Routes to use types that DON'T rely on prisma
// Because otherwise we would need to somehow share our prisma.schema (and 2 others) with the frontend
// Which would NOT work. Absolutely make sure to use the types below and to cast away any types from @prsisma/client

export interface GuildSettings {
	guildId: string;
	levelUpNotificationFallbackChannelId: string | null;
	levelUpNotificationMessage: string | null;
	levelUpNotificationMode: LevelUpNotificationMode;
	requiredMessages: number;
	requiredMessagesTimespan: number | null;
	requiredXpBase: number;
	requiredXpMultiplier: number;
	xpGain: number;
}

export interface Reward {
	clean: boolean;
	guildId: string;
	level: number;
	roleId: string;
}

export interface User {
	guildId: string;
	ignored: boolean;
	userId: string;
	xp: number;
}

export interface Channel {
	channelId: string;
	guildId: string;
	ignored: boolean;
	multiplier: number | null;
}

export interface SocialInteraction {
	allowTargets: boolean;
	attachmentUrl: string | null;
	color: string | null;
	commandId: string;
	content: string;
	embed: boolean;
	guildId: string;
	name: string;
	plainContent: string | null;
	uses: number;
}

export const LevelUpNotificationMode = {
	Channel: 'Channel',
	DM: 'DM',
	None: 'None',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type LevelUpNotificationMode = (typeof LevelUpNotificationMode)[keyof typeof LevelUpNotificationMode];
