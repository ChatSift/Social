import { PrismaClient } from '@prisma/client';
import type { GuildSettings, Prisma } from '@prisma/client';
import type { MessageActionRowComponentBuilder, MessageCreateOptions, ChatInputCommandInteraction } from 'discord.js';
import {
	bold,
	ButtonBuilder,
	Client,
	Colors,
	EmbedBuilder,
	inlineCode,
	ActionRowBuilder,
	MessageEditOptions,
} from 'discord.js';
import { Evt } from 'evt';
import { injectable } from 'tsyringe';
import { ellipsis } from '../util/ellipsis.js';

type SettingsValidationResult = {
	settings: GuildSettings;
	warnings: string[];
};

// TODO: Complete and use in the future
@injectable()
export class SetupMachine {
	private readonly changeEvt = new Evt();

	public constructor(private readonly client: Client, private readonly prisma: PrismaClient) {}

	private async validateSettings(settings: GuildSettings): Promise<SettingsValidationResult> {
		const update: Prisma.GuildSettingsUpdateInput = {};
		const warnings: string[] = [];

		if (settings.levelUpNotificationFallbackChannelId) {
			const levelUpNotificationFallbackChannel = this.client.channels.cache.get(
				settings.levelUpNotificationFallbackChannelId,
			);

			if (!levelUpNotificationFallbackChannel) {
				update.levelUpNotificationFallbackChannelId = null;
				warnings.push('Level up notification fallback channel no longer exists; unsetting');
			}
		}

		return {
			settings: await this.prisma.guildSettings.update({
				data: update,
				where: { guildId: settings.guildId },
			}),
			warnings,
		};
	}

	private async buildConfigMessageOptions(
		settings?: GuildSettings | null,
	): Promise<Omit<MessageCreateOptions, 'flags'>> {
		const errors: string[] = [];
		const warnings: string[] = [];

		if (settings) {
			const validated = await this.validateSettings(settings);
			// eslint-disable-next-line no-param-reassign
			settings = validated.settings;
			warnings.push(...validated.warnings);
		}

		const headings = ['General settings', 'Leveling formula', 'Notifications'] as const satisfies readonly string[];
		const values = [
			[
				`Required messages to gain XP: ${inlineCode(settings?.requiredMessages.toString() ?? 'Not set ❗')}`,
				`Required message timespan to gain XP: ${inlineCode(
					settings?.requiredMessagesTimespan?.toString() ?? 'Not set',
				)}`,
				`XP gain: ${inlineCode(settings?.xpGain?.toString() ?? 'Not set ❗')}`,
				`Clean level rewards: ${inlineCode(settings?.cleanRewardRoles ? 'Yes' : 'No')}`,
			],
			[
				`Required XP base: ${inlineCode(settings?.requiredXpBase?.toString() ?? 'Not set ❗')}`,
				`Required XP multiplier: ${inlineCode(settings?.requiredXpMultiplier?.toString() ?? 'Not set ❗')}`,
			],
			[
				`Level up notification mode: ${inlineCode(settings?.levelUpNotificationMode ?? 'None')}`,
				`Level up notification fallback channel: ${inlineCode(
					settings?.levelUpNotificationFallbackChannelId ?? 'Not set',
				)}`,
				`Level up notification message: ${inlineCode(ellipsis(settings?.levelUpNotificationMessage ?? 'Not set', 50))}`,
			],
		] as const satisfies readonly (readonly string[])[] & { length: typeof headings.length };

		if (!settings?.requiredMessages) {
			errors.push('Required messages is not set');
		}

		if (!settings?.xpGain) {
			errors.push('XP gain is not set');
		}

		if (!settings?.requiredXpBase) {
			errors.push('Required XP base is not set');
		}

		if (!settings?.requiredXpMultiplier) {
			errors.push('Required XP multiplier is not set');
		}

		const configSection = headings
			.map((heading, idx) => {
				const valuesForHeading = values[idx]!;
				const valueSection = valuesForHeading.map((value) => `• ${value}`).join('\n');
				return `${bold(heading)}\n${valueSection}`;
			})
			.join('\n');

		const description = `This is the leveling setup wizard.

            ${configSection}
            ${errors.length ? `\n${errors.map((error) => `❗ ${error}`).join('\n')}` : ''}
            ${warnings.length ? `\n${warnings.map((error) => `⚠️ ${error}`).join('\n')}` : ''}
        `;

		const embed = new EmbedBuilder().setTitle('Leveling setup').setDescription(description).setColor(Colors.Blurple);
		const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ButtonBuilder().setCustomId('manage:generalSettings'),
			),
		];

		return { embeds: [embed], components };
	}

	public async run(interaction: ChatInputCommandInteraction<'cached'>) {
		const settings = await this.prisma.guildSettings.findFirst({ where: { guildId: interaction.guildId } });
		const options = await this.buildConfigMessageOptions(settings);
		await interaction.reply(options);
	}
}
