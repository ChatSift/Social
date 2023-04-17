import type { GuildSettings, User } from '@prisma/client';
import { PrismaClient, LevelUpNotificationMode } from '@prisma/client';
import { DiscordSnowflake } from '@sapphire/snowflake';
import type { Message, TextChannel } from 'discord.js';
import { Events } from 'discord.js';
import { Redis } from 'ioredis';
import { inject, singleton } from 'tsyringe';
import type { Event } from '../../struct/Event.js';
import { assertDebug } from '../../util/assert.js';
import { calculateTotalRequiredXp, calculateUserLevel } from '../../util/calculateLevel.js';
import { logger } from '../../util/logger.js';
import { SYMBOLS } from '../../util/symbols.js';
import type { LevelUpMessageTemplateData } from '../../util/templateLevelUpMessage.js';
import { templateLevelUpMessage } from '../../util/templateLevelUpMessage.js';

@singleton()
export default class implements Event<typeof Events.MessageCreate> {
	public readonly name = Events.MessageCreate;

	public constructor(private readonly prisma: PrismaClient, @inject(SYMBOLS.redis) private readonly redis: Redis) {}

	public async handle(message: Message) {
		// First, see if we're in a guild
		if (!message.inGuild()) {
			return null;
		}

		if (message.author.bot) {
			return null;
		}

		// Next, check if the guild is set up (indicated by the presence of a GuildSettings)
		const settings = await this.prisma.guildSettings.findFirst({
			where: {
				guildId: message.guildId,
			},
		});

		if (!settings) {
			return null;
		}

		assertDebug(
			settings.requiredMessages > 0 &&
				(settings.requiredMessagesTimespan == null || settings.requiredMessagesTimespan > 0) &&
				settings.xpGain > 0,
			new Error('settings have bad integers. undefined behavior ahead'),
		);

		// Next, ensure a User exists
		const data = {
			userId: message.author.id,
			guildId: message.guildId,
		};
		const user = await this.prisma.user.upsert({
			create: data,
			update: {},
			where: {
				userId_guildId: data,
			},
		});

		if (user.ignored) {
			return null;
		}

		const channel = await this.prisma.channel.findFirst({
			where: {
				guildId: message.guildId,
				OR: [
					{
						channelId: message.channelId,
					},
					{
						channelId: message.channel.parentId ?? undefined,
					},
					{
						channelId: message.channel.isThread() ? message.channel.parent?.parentId ?? undefined : undefined,
					},
				],
			},
		});

		if (channel?.ignored) {
			return null;
		}

		// Run user eligibility checks
		if (!(await this.isEligible(settings, user, message))) {
			return null;
		}

		// Grant XP
		const updated = await this.prisma.user.update({
			where: {
				userId_guildId: {
					userId: user.userId,
					guildId: user.guildId,
				},
			},
			data: {
				xp: {
					increment: settings.xpGain * (channel?.multiplier ?? 1),
				},
			},
		});

		// Check if the user leveled up
		// calculateUserLevel is O(n) where n is the user's level, so we want to avoid calling it twice
		// we'll calculate their level prior to gaining XP, calculate how much is required for the next level,
		// and see if they've surpassed that amount
		const oldLevel = calculateUserLevel(settings, user);
		const requiredXp = calculateTotalRequiredXp(settings, oldLevel + 1);

		logger.trace({ oldLevel, requiredXp, updatedXp: updated.xp }, 'Checking if user leveled up');

		if (updated.xp >= requiredXp) {
			// Query for all rewards that are eligible for the user just in case they're missing a role
			// for whatever reason
			const rewards = await this.prisma.reward.findMany({
				where: {
					guildId: user.guildId,
					level: {
						lte: oldLevel + 1,
					},
				},
			});
			const rewardRoles = message.guild.roles.cache.filter((role) =>
				rewards.find((reward) => reward.roleId === role.id),
			);
			// Now compute the rewards they actually just earned
			const earnedRewards = rewards.filter((reward) => reward.level === oldLevel + 1);

			const nonManagedExistingRoles = [
				...message.member!.roles.cache.filter((role) => !role.managed && !rewardRoles.has(role.id)).values(),
			];

			// Use a set to de-dupe. Iterate over all the rewards and give the user all the non-clean ones, as well as
			// the rewards for their current level.
			const roles = [
				...new Set([
					...rewards.filter((reward) => !reward.clean).map((reward) => reward.roleId),
					...earnedRewards.map((reward) => reward.roleId),
					...nonManagedExistingRoles,
				]),
			];

			try {
				await message.member!.roles.set(roles);
			} catch (error) {
				logger.warn({ err: error }, 'Failed to set roles for user after leveling up');
			}

			const template: LevelUpMessageTemplateData = {
				earnedRewards: earnedRewards.length
					? ` and received: ${earnedRewards.map((reward) => rewardRoles.get(reward.roleId)!.name).join(', ')}`
					: '',
				guildName: message.guild.name,
				level: String(oldLevel + 1),
				username: message.author.username,
			};
			const notification = templateLevelUpMessage(
				settings.levelUpNotificationMessage ??
					`{{ username }}, you just reached level {{ level }} in {{ guildName }}{{ earnedRewards }}!`,
				template,
			);

			switch (settings.levelUpNotificationMode) {
				case LevelUpNotificationMode.None: {
					break;
				}

				case LevelUpNotificationMode.DM: {
					try {
						await message.author.send(notification);
					} catch (error) {
						logger.warn({ err: error }, 'Failed to send level up notification to user');
					}

					break;
				}

				case LevelUpNotificationMode.Channel: {
					try {
						await message.channel.send(notification);
					} catch (error) {
						logger.warn({ err: error }, 'Failed to send level up notification to current channel');
						if (settings.levelUpNotificationFallbackChannelId) {
							const fallbackChannel = message.guild.channels.cache.get(
								settings.levelUpNotificationFallbackChannelId,
							) as TextChannel | undefined;
							if (fallbackChannel) {
								try {
									await fallbackChannel.send(notification);
								} catch (error) {
									logger.warn({ err: error }, 'Failed to send level up notification to fallback channel');
								}
							} else {
								logger.warn({ settings }, 'Fallback channel no longer exists in guild');
								await this.prisma.guildSettings.update({
									data: {
										levelUpNotificationFallbackChannelId: null,
									},
									where: {
										guildId: message.guildId,
									},
								});
							}
						}
					}

					break;
				}
			}
		}
	}

	private async isEligible(settings: GuildSettings, user: User, message: Message): Promise<boolean> {
		// Don't bother with eligibility checks if the guild only requires 1 message
		if (settings.requiredMessages <= 1) {
			return true;
		}

		const ineligibleKey = `leveling_ineligible:${settings.guildId}:${user.userId}`;
		const trackingKey = `leveling_tracking:${settings.guildId}:${user.userId}`;

		// Check if the user recently gained XP
		const ineligibleFor = await this.redis.pttl(ineligibleKey);
		if (ineligibleFor >= 0) {
			logger.trace({ user, ineligibleFor }, 'User is ineligible for XP gain (ineligible key exists)');
			return false;
		}

		const now = Date.now();
		await this.redis.zadd(trackingKey, now, message.id);
		// We want a TTL on those sets to not have them grow indefinitely.
		// We can use the timespan as a TTL here, but we'll add 5 seconds to it to be safe.
		// Otherwise, we'll use a default of 10 minutes. This does mean that technically,
		// if there is no requiredMessageTimepsan, a user is NOT guaranteed to have gained XP N times where
		// N = (theirTotalMessages / requiredMessages). This is why we don't support high values for requiredMessages
		await this.redis.expire(
			trackingKey,
			settings.requiredMessagesTimespan ? settings.requiredMessagesTimespan + 5 : 300,
		);

		// This isn't enough though, it's still possible for a user to send messages every couple of seconds, but never
		// fast enough to gain XP, and thus never have their messages expire. To fix this, we'll also clean up anything older
		// than 10 minutes
		await this.redis.zremrangebyscore(trackingKey, 0, now - 10 * 60 * 1_000);

		// We'll use zrangebyscore to get the messages that are within the timeframe
		// If there's no timespan set, we'll just get all messages
		const messageIds = await this.redis.zrangebyscore(
			trackingKey,
			settings.requiredMessagesTimespan ? now - settings.requiredMessagesTimespan * 1_000 : 0,
			now,
		);

		logger.trace(
			{
				user,
				messageIds,
				eligible: messageIds.length >= settings.requiredMessages,
			},
			'Collected user messages in timeframe',
		);

		// If there's more messages than the required amount, the user is eligible
		// Because our tracking works in a "rolling window" fashion, this would mean that any subsequent messages
		// would be immediately eligible as well. We can't solve this by just deleting the set
		// (but we still do to freeup memory), as the user wouldn't need to wait for the remainder of the timespan
		// As such, we'll also mark the user as ineligible with a simple key
		if (messageIds.length >= settings.requiredMessages) {
			if (settings.requiredMessagesTimespan) {
				const [first] = messageIds as [string];
				const firstCreatedAt = DiscordSnowflake.timestampFrom(first);

				// The user should be ineligible for the remainder of the timespan
				const ineligibleFor = settings.requiredMessagesTimespan * 1_000 - (now - firstCreatedAt);
				logger.trace({ user, diff: now - firstCreatedAt, ineligibleFor }, 'Marking user as ineligible for XP gain');
				assertDebug(
					ineligibleFor > 0,
					new Error('ineligibleFor is negative. will be treating it as |x| to prevent crashing'),
				);

				await this.redis.set(ineligibleKey, 'true', 'PX', Math.abs(ineligibleFor));
			}

			await this.redis.del(trackingKey);
			return true;
		}

		return false;
	}
}
