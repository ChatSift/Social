import { PrismaClient } from '@prisma/client';
import type { APIApplicationCommandSubcommandOption, ChatInputCommandInteraction } from 'discord.js';
import { singleton } from 'tsyringe';
import type { Subcommand } from '../../struct/Command';

@singleton()
export default class implements Subcommand {
	public readonly interactionOptions: Omit<APIApplicationCommandSubcommandOption, 'type'> = {
		name: 'list',
		description: 'Lists configuration for all roles',
	};

	public constructor(private readonly prisma: PrismaClient) {}

	public async handle(interaction: ChatInputCommandInteraction<'cached'>) {
		const rawRoles = await this.prisma.role.findMany({
			where: {
				guildId: interaction.guildId,
			},
		});

		if (!rawRoles.length) {
			await interaction.reply('No roles have been configured yet.');
			return;
		}

		const roles = rawRoles.map((role) => `• <@&${role.roleId}> (${role.multiplier})`);

		return interaction.reply({
			content: roles.join('\n'),
			allowedMentions: { roles: [] },
		});
	}
}
