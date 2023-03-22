import { PrismaClient } from '@prisma/client';
import type { APIApplicationCommandSubcommandOption, ChatInputCommandInteraction } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord.js';
import { singleton } from 'tsyringe';
import type { Subcommand } from '../../struct/Command';

@singleton()
export default class implements Subcommand {
	public readonly interactionOptions: Omit<APIApplicationCommandSubcommandOption, 'type'> = {
		name: 'list',
		description: 'Lists all rewards',
		options: [],
	};

	public constructor(private readonly prisma: PrismaClient) {}

	public async handle(interaction: ChatInputCommandInteraction<'cached'>) {
		const rewards = await this.prisma.reward.findMany({
			where: {
				guildId: interaction.guildId,
			},
		});

		await interaction.reply({
			content: rewards.length
				? rewards
						.map((reward) => `• Level ${reward.level}: <@&${reward.roleId}> (Clean: ${reward.clean ? 'Yes' : 'No'})`)
						.join('\n')
				: "You don't currently have any rewards.",
		});
	}
}
