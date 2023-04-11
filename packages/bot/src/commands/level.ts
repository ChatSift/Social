import { PrismaClient } from '@prisma/client';
import type { ChatInputCommandInteraction } from 'discord.js';
import { Colors, EmbedBuilder, ApplicationCommandType } from 'discord.js';
import { singleton } from 'tsyringe';
import type { Command, CommandBody } from '../struct/Command';
import { calculateUserLevel, calculateTotalRequiredXp } from '../util/calculateLevel.js';

@singleton()
export default class implements Command<ApplicationCommandType.ChatInput> {
	public readonly interactionOptions: CommandBody<ApplicationCommandType.ChatInput> = {
		name: 'level',
		description: 'Displays information about your current level',
		type: ApplicationCommandType.ChatInput,
		dm_permission: false,
		options: [],
	};

	public constructor(private readonly prisma: PrismaClient) {}

	public async handle(interaction: ChatInputCommandInteraction<'cached'>) {
		const settings = await this.prisma.guildSettings.findFirst({
			where: {
				guildId: interaction.guildId,
			},
		});

		if (!settings) {
			return interaction.reply({
				content: 'This server has not been configured yet.',
				ephemeral: true,
			});
		}

		await interaction.deferReply({ ephemeral: true });

		const user = await this.prisma.user.upsert({
			create: {
				guildId: interaction.guildId,
				userId: interaction.user.id,
			},
			update: {},
			where: {
				userId_guildId: {
					guildId: interaction.guildId,
					userId: interaction.user.id,
				},
			},
		});

		const level = calculateUserLevel(settings, user);
		const required = level === 0 ? 0 : calculateTotalRequiredXp(settings, level);
		const currentProgress = user.xp - required;
		const requiredNextTotal = calculateTotalRequiredXp(settings, level + 1);
		const requiredNext = requiredNextTotal - required;

		const rewards = await this.prisma.reward.findMany({
			where: {
				guildId: interaction.guildId,
				level: {
					lte: level + 1,
				},
			},
		});

		const currentRewards = rewards.filter((reward) => reward.level <= level);
		const nextRewards = rewards.filter((reward) => reward.level === level + 1);

		const info = [
			`**Level**: ${level.toString()} (${user.xp.toString()} Total XP)`,
			`**Current rewards**: ${
				currentRewards.length ? `${currentRewards.map((reward) => `<@&${reward.roleId}>`).join(', ')}` : 'None'
			}`,
			`**Progress**: ${currentProgress.toString()} / ${requiredNext.toString()}XP`,
			`**Reward at next level**: ${
				nextRewards.length ? `${nextRewards.map((reward) => `<@&${reward.roleId}>`).join(', ')}` : 'None'
			}`,
		] as const satisfies readonly string[];

		const embed = new EmbedBuilder()
			.setAuthor({
				name: interaction.user.tag,
				iconURL: interaction.member.displayAvatarURL(),
			})
			.setColor(Colors.Blurple)
			.setDescription(info.map((chunk) => `• ${chunk}`).join('\n'));

		return interaction.editReply({
			embeds: [embed],
		});
	}
}
