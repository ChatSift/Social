import { PrismaClient } from '@prisma/client';
import type { APIApplicationCommandSubcommandOption, ChatInputCommandInteraction } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord.js';
import { singleton } from 'tsyringe';
import type { Subcommand } from '../../struct/Command';

@singleton()
export default class implements Subcommand {
	public readonly interactionOptions: Omit<APIApplicationCommandSubcommandOption, 'type'> = {
		name: 'set-multiplier',
		description: 'Sets the XP multiplier for a given role',
		options: [
			{
				name: 'role',
				description: 'The role to change the multiplier for',
				type: ApplicationCommandOptionType.Role,
				required: true,
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
		const role = interaction.options.getChannel('role', true);
		const multiplier = interaction.options.getInteger('multiplier', true);

		await this.prisma.role.upsert({
			create: {
				roleId: role.id,
				guildId: interaction.guildId,
				multiplier,
			},
			update: {
				multiplier,
			},
			where: {
				roleId_guildId: {
					roleId: role.id,
					guildId: interaction.guildId,
				},
			},
		});

		await interaction.reply('Successfully updated the multiplier for the given role.');
	}
}
