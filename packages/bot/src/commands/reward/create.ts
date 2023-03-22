import { PrismaClient } from '@prisma/client';
import type { APIApplicationCommandSubcommandOption, ChatInputCommandInteraction } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord.js';
import { singleton } from 'tsyringe';
import type { Subcommand } from '../../struct/Command';

@singleton()
export default class implements Subcommand {
	public readonly interactionOptions: Omit<APIApplicationCommandSubcommandOption, 'type'> = {
		name: 'create',
		description: 'Create a new reward',
		options: [
			{
				name: 'role',
				description: 'The role to give when the reward is reached',
				type: ApplicationCommandOptionType.Role,
				required: true,
			},
			{
				name: 'level',
				description: 'The level to give the reward at',
				type: ApplicationCommandOptionType.Integer,
				required: true,
				min_value: 1,
			},
			{
				name: 'clean',
				description: 'Whether this reward should be removed when the user surpasses it',
				type: ApplicationCommandOptionType.Boolean,
				required: true,
			},
		],
	};

	public constructor(private readonly prisma: PrismaClient) {}

	public async handle(interaction: ChatInputCommandInteraction<'cached'>) {
		const role = interaction.options.getRole('role', true);
		const level = interaction.options.getInteger('level', true);
		const clean = interaction.options.getBoolean('clean', true);

		const data = {
			roleId: role.id,
			level,
			clean,
		};

		await this.prisma.reward.upsert({
			create: {
				...data,
				guildId: interaction.guildId,
			},
			update: data,
			where: {
				roleId_guildId: {
					guildId: interaction.guildId,
					roleId: role.id,
				},
			},
		});

		await interaction.reply(`Created reward for "${role.name}" at level ${level}`);
	}
}
