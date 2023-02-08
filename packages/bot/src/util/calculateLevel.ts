import type { GuildSettings, User } from '@prisma/client';
import { logger } from './logger.js';

export function calculateRequiredXp(settings: GuildSettings, level: number): number {
	if (level <= 0) {
		const error = new Error('level must be greater than 0');
		logger.error({ err: error, settings, level });
		throw error;
	}

	const { requiredXpBase, requiredXpMultiplier } = settings;
	// https://didinele.me/blog/math-journey - closed form formula for https://oeis.org/A000217, avoiding a recurring series
	return requiredXpBase + level * requiredXpMultiplier * (2 * level - 1);
}

export function calculateUserLevel(settings: GuildSettings, user: User): number {
	for (let level = 1; ; level++) {
		const requiredXp = calculateRequiredXp(settings, level);
		if (user.xp < requiredXp) {
			return level - 1;
		}
	}
}
