import type { GuildSettings, User } from '@prisma/client';
import { logger } from './logger.js';

export function calculateTotalRequiredXp(settings: GuildSettings, level: number): number {
	if (level <= 0) {
		const error = new Error('level must be greater than 0');
		logger.error({ err: error, settings, level });
		throw error;
	}

	const { requiredXpBase, requiredXpMultiplier } = settings;
	if (requiredXpBase == null || requiredXpMultiplier == null) {
		const error = new Error('missing required fields');
		logger.error({ err: error, settings, level });
		throw error;
	}

	// https://didinele.me/blog/math-journey - closed form formula for https://oeis.org/A000217, avoiding a recurring series
	return requiredXpBase + (requiredXpMultiplier * (level * (level - 1))) / 2;
}

export function calculateUserLevel(settings: GuildSettings, user: User): number {
	for (let level = 1; ; level++) {
		const requiredXp = calculateTotalRequiredXp(settings, level);
		if (user.xp < requiredXp) {
			return level - 1;
		}
	}
}
