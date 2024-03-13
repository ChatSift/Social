import { LevelUpNotificationMode, PrismaClient } from '@prisma/client';
import type { ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { bold, inlineCode, ApplicationCommandOptionType, ApplicationCommandType, ChannelType } from 'discord.js';
import { singleton } from 'tsyringe';
import type { Command, CommandBody } from '../struct/Command';
import { ellipsis } from '../util/ellipsis.js';

@singleton()
export default class implements Command<ApplicationCommandType.ChatInput> {
	public readonly interactionOptions: CommandBody<ApplicationCommandType.ChatInput> = {
		name: 'config',
		description: 'Allows you to set up the bot for your server',
		type: ApplicationCommandType.ChatInput,
		default_member_permissions: '0',
		dm_permission: false,
		options: [
			{
				name: 'required-messages',
				description: 'The amount of messages required to gain XP',
				type: ApplicationCommandOptionType.Integer,
				min_value: 1,
				max_value: 15,
			},
			{
				name: 'required-messages-timespan',
				description: 'The amount of time (in seconds) that the required messages must be sent in',
				type: ApplicationCommandOptionType.Integer,
				min_value: 1,
				max_value: 60,
			},
			{
				name: 'xp-gain',
				description: 'The amount of XP to gain per requiredMessages',
				type: ApplicationCommandOptionType.Integer,
				min_value: 1,
			},
			{
				name: 'required-xp-base',
				description: 'The base amount of XP required to level up',
				type: ApplicationCommandOptionType.Integer,
				min_value: 1,
				max_value: 500,
			},
			{
				name: 'required-xp-multiplier',
				description: 'The multiplier to apply to the required XP',
				type: ApplicationCommandOptionType.Integer,
				min_value: 1,
				max_value: 100,
			},
			{
				name: 'level-up-notification-mode',
				description: 'The mode to use for level up notifications',
				type: ApplicationCommandOptionType.String,
				choices: [
					{
						name: 'None',
						value: LevelUpNotificationMode.None,
					},
					{
						name: 'Direct Message',
						value: LevelUpNotificationMode.DM,
					},
					{
						name: 'Channel',
						value: LevelUpNotificationMode.Channel,
					},
				],
			},
			{
				name: 'level-up-notification-fallback',
				description: 'Fallback channel to use for level up notifications if the mode is set to channel',
				type: ApplicationCommandOptionType.Channel,
				channel_types: [ChannelType.GuildText],
			},
			{
				name: 'level-up-notification-message',
				description: 'The message to send when a user levels up',
				type: ApplicationCommandOptionType.String,
			},
		],
	};

	public constructor(private readonly prisma: PrismaClient) {}

	public async handle(interaction: ChatInputCommandInteraction<'cached'>) {
		const requiredMessages = interaction.options.getInteger('required-messages');
		const requiredMessagesTimespan = interaction.options.getInteger('required-messages-timespan');
		const xpGain = interaction.options.getInteger('xp-gain');
		const requiredXpBase = interaction.options.getInteger('required-xp-base');
		const requiredXpMultiplier = interaction.options.getInteger('required-xp-multiplier');
		const levelUpNotificationMode = interaction.options.getString(
			'level-up-notification-mode',
		) as LevelUpNotificationMode | null;
		const levelUpNotificationFallbackChannel = interaction.options.getChannel(
			'level-up-notification-fallback',
		) as TextChannel | null;
		const levelUpNotificationMessage = interaction.options.getString('level-up-notification-message');

		await interaction.deferReply();

		let settings = await this.prisma.guildSettings.findFirst({ where: { guildId: interaction.guildId } });
		if (settings) {
			settings = await this.prisma.guildSettings.update({
				data: {
					requiredMessages: requiredMessages ?? undefined,
					requiredMessagesTimespan: requiredMessagesTimespan ?? undefined,
					xpGain: xpGain ?? undefined,
					requiredXpBase: requiredXpBase ?? undefined,
					requiredXpMultiplier: requiredXpMultiplier ?? undefined,
					levelUpNotificationMode: levelUpNotificationMode ?? undefined,
					levelUpNotificationFallbackChannelId: levelUpNotificationFallbackChannel?.id ?? undefined,
					levelUpNotificationMessage: levelUpNotificationMessage ?? undefined,
				},
				where: {
					guildId: interaction.guildId,
				},
			});
		} else {
			if (!(requiredMessages !== null && xpGain !== null && requiredXpBase !== null && requiredXpMultiplier !== null)) {
				return interaction.reply({
					content:
						'For your first setup, you must provide `requiredMessages`, `xpGain`, `requiredXpbase`, and `requiredXpMultiplier`.',
				});
			}

			settings = await this.prisma.guildSettings.create({
				data: {
					guildId: interaction.guildId,
					requiredMessages,
					requiredMessagesTimespan,
					xpGain,
					requiredXpBase,
					requiredXpMultiplier,
					levelUpNotificationMode: levelUpNotificationMode ?? LevelUpNotificationMode.None,
					levelUpNotificationFallbackChannelId: levelUpNotificationFallbackChannel?.id,
					levelUpNotificationMessage,
				},
			});
		}

		const headings = ['General settings', 'Leveling formula', 'Notifications'] as const satisfies readonly string[];
		const values = [
			[
				`Required messages to gain XP: ${inlineCode(settings?.requiredMessages?.toString() ?? 'Not set ❗')}`,
				`Required message timespan to gain XP: ${inlineCode(
					settings?.requiredMessagesTimespan?.toString() ?? 'Not set',
				)}`,
				`XP gain: ${inlineCode(settings?.xpGain?.toString() ?? 'Not set ❗')}`,
			],
			[
				`Required XP base: ${inlineCode(settings?.requiredXpBase?.toString() ?? 'Not set ❗')}`,
				`Required XP multiplier: ${inlineCode(settings?.requiredXpMultiplier?.toString() ?? 'Not set ❗')}`,
			],
			[
				`Level up notification mode: ${inlineCode(settings?.levelUpNotificationMode ?? 'None')}`,
				`Level up notification fallback channel: ${inlineCode(
					settings?.levelUpNotificationFallbackChannelId ?? 'Not set',
				)}`,
				`Level up notification message: ${inlineCode(ellipsis(settings?.levelUpNotificationMessage ?? 'Not set', 50))}`,
			],
		] as const satisfies readonly (readonly string[])[] & { length: typeof headings.length };

		return interaction.editReply({
			content: headings
				.map((heading, idx) => {
					const valuesForHeading = values[idx]!;
					const valueSection = valuesForHeading.map((value) => `• ${value}`).join('\n');
					return `${bold(heading)}\n${valueSection}`;
				})
				.join('\n'),
		});
	}
}
