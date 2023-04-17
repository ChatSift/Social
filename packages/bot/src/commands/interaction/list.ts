import { PrismaClient } from '@prisma/client';
import type { APIApplicationCommandSubcommandOption, ChatInputCommandInteraction } from 'discord.js';
import { singleton } from 'tsyringe';
import type { Subcommand } from '../../struct/Command';

@singleton()
export default class implements Subcommand {
	public readonly interactionOptions: Omit<APIApplicationCommandSubcommandOption, 'type'> = {
		name: 'list',
		description: 'Lists all available social interactions',
		options: [],
	};

	public constructor(private readonly prisma: PrismaClient) {}

	public async handle(interaction: ChatInputCommandInteraction<'cached'>) {
		const socialInteractions = await this.prisma.socialInteraction.findMany({
			where: {
				guildId: interaction.guildId,
			},
		});

		await interaction.reply({
			content: socialInteractions.length
				? socialInteractions
						.map((socialInteraction) => `• \`${socialInteraction.name}\` used ${socialInteraction.uses} times`)
						.join('\n')
				: 'This community does not currently have any social interactions.',
		});
	}
}
