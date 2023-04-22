import { PrismaClient } from '@prisma/client';
import type { APIApplicationCommandSubcommandOption, ChatInputCommandInteraction } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord.js';
import { singleton } from 'tsyringe';
import type { Subcommand } from '../../struct/Command';
import { logger } from '../../util/logger.js';

@singleton()
export default class implements Subcommand {
	public readonly interactionOptions: Omit<APIApplicationCommandSubcommandOption, 'type'> = {
		name: 'delete',
		description: 'Deletes a social interaction',
		options: [
			{
				name: 'name',
				description: 'The interaction to delete',
				type: ApplicationCommandOptionType.String,
				required: true,
			},
		],
	};

	public constructor(private readonly prisma: PrismaClient) {}

	public async handle(interaction: ChatInputCommandInteraction<'cached'>) {
		await interaction.deferReply();

		const name = interaction.options.getString('name', true);

		try {
			const deleted = await this.prisma.socialInteraction.delete({
				where: {
					guildId_name: {
						guildId: interaction.guildId,
						name,
					},
				},
			});

			const command = await interaction.guild.commands.fetch(deleted.commandId).catch(() => null);
			try {
				await command?.delete();
			} catch (error) {
				logger.error(error);
				return interaction.reply('Could not delete the local slash command. This is likely a bug.');
			}
		} catch (error) {
			logger.error(error);
			return interaction.reply('Could not delete social interaction from the database; does it exist?');
		}

		await interaction.editReply('Deleted interaction.');
	}
}
