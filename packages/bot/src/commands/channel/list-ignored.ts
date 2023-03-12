import { PrismaClient } from '@prisma/client';
import type { APIApplicationCommandSubcommandOption, ChatInputCommandInteraction, GuildChannel } from 'discord.js';
import { Client } from 'discord.js';
import { singleton } from 'tsyringe';
import type { Subcommand } from '../../struct/Command';

@singleton()
export default class implements Subcommand {
	public readonly interactionOptions: Omit<APIApplicationCommandSubcommandOption, 'type'> = {
		name: 'list-ignored',
		description: 'Lists the channels ignored from XP gain',
		options: [],
	};

	public constructor(private readonly prisma: PrismaClient, private readonly client: Client) {}

	public async handle(interaction: ChatInputCommandInteraction<'cached'>) {
		const rawChannels = await this.prisma.channel.findMany({
			where: {
				guildId: interaction.guildId,
				ignored: true,
			},
		});

		const channels = rawChannels
			.map((channel) => this.client.channels.cache.get(channel.channelId))
			.filter(Boolean) as GuildChannel[];

		return interaction.reply({
			content: channels.map((channel) => `• ${channel.toString()} (${channel.name})`).join('\n'),
		});
	}
}
