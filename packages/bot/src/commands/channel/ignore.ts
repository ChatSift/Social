import { PrismaClient } from '@prisma/client';
import type { APIApplicationCommandSubcommandOption, ChatInputCommandInteraction } from 'discord.js';
import { ChannelType, ApplicationCommandOptionType } from 'discord.js';
import { singleton } from 'tsyringe';
import type { Subcommand } from '../../struct/Command';

@singleton()
export default class implements Subcommand {
	public readonly interactionOptions: Omit<APIApplicationCommandSubcommandOption, 'type'> = {
		name: 'ignore',
		description: 'Ignores a channel from XP gain',
		options: [
			{
				name: 'channel',
				description: 'The channel to ignore',
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
		],
	};

	public constructor(private readonly prisma: PrismaClient) {}

	public async handle(interaction: ChatInputCommandInteraction<'cached'>) {
		const channel = interaction.options.getChannel('channel', true);

		await this.prisma.channel.upsert({
			create: {
				channelId: channel.id,
				guildId: interaction.guildId,
				ignored: true,
			},
			update: {
				ignored: true,
			},
			where: {
				channelId_guildId: {
					channelId: channel.id,
					guildId: interaction.guildId,
				},
			},
		});

		await interaction.reply('Successfully ignored the given channel.');
	}
}
