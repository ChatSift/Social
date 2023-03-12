import { PrismaClient } from '@prisma/client';
import type { APIApplicationCommandSubcommandOption, ChatInputCommandInteraction } from 'discord.js';
import { ChannelType, ApplicationCommandOptionType } from 'discord.js';
import { singleton } from 'tsyringe';
import type { Subcommand } from '../../struct/Command';

@singleton()
export default class implements Subcommand {
	public readonly interactionOptions: Omit<APIApplicationCommandSubcommandOption, 'type'> = {
		name: 'set-multiplier',
		description: 'Sets the XP multiplier for a given channel',
		options: [
			{
				name: 'channel',
				description: 'The channel to change the multiplier for',
				type: ApplicationCommandOptionType.Channel,
				required: true,
				channel_types: [
					ChannelType.GuildCategory,
					ChannelType.GuildText,
					ChannelType.GuildForum,
					ChannelType.GuildVoice,
					ChannelType.PublicThread,
				],
			},
			{
				name: 'multiplier',
				description: 'The multiplier to use',
				type: ApplicationCommandOptionType.Integer,
				required: true,
				min_value: 1,
				max_value: 10,
			},
		],
	};

	public constructor(private readonly prisma: PrismaClient) {}

	public async handle(interaction: ChatInputCommandInteraction<'cached'>) {
		const channel = interaction.options.getChannel('channel', true);
		const multiplier = interaction.options.getInteger('multiplier', true);

		await this.prisma.channel.upsert({
			create: {
				channelId: channel.id,
				guildId: interaction.guildId,
				multiplier,
			},
			update: {
				multiplier,
			},
			where: {
				channelId_guildId: {
					channelId: channel.id,
					guildId: interaction.guildId,
				},
			},
		});

		await interaction.reply('Successfully updated the multiplier for the given channel.');
	}
}
