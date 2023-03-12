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
		description: 'Deletes a reward',
		options: [
			{
				name: 'role',
				description: 'The reward to delete',
				type: ApplicationCommandOptionType.Role,
				required: true,
			},
		],
	};

	public constructor(private readonly prisma: PrismaClient) {}

	public async handle(interaction: ChatInputCommandInteraction<'cached'>) {
		const role = interaction.options.getRole('role', true);

		try {
			await this.prisma.reward.delete({
				where: {
					roleId_guildId: {
						guildId: interaction.guildId,
						roleId: role.id,
					},
				},
			});
		} catch (error) {
			logger.error(error);
			return interaction.reply('Could not delete reward for the given role; does it exist?');
		}

		await interaction.reply('Deleted reward.');
	}
}
