import { PrismaClient } from '@prisma/client';
import type {
	APIApplicationCommandSubcommandOption,
	ChatInputCommandInteraction,
	ApplicationCommandDataResolvable,
} from 'discord.js';
import { ApplicationCommandOptionType } from 'discord.js';
import { singleton } from 'tsyringe';
import type { Subcommand } from '../../struct/Command';

@singleton()
export default class implements Subcommand {
	public readonly interactionOptions: Omit<APIApplicationCommandSubcommandOption, 'type'> = {
		name: 'create',
		description: 'Create a new interaction',
		options: [
			{
				name: 'name',
				description: 'The name for this interaction',
				type: ApplicationCommandOptionType.String,
				required: true,
			},
			{
				name: 'content',
				description: 'The content for this interaction',
				type: ApplicationCommandOptionType.String,
				required: true,
			},
			{
				name: 'plain-content',
				description: 'If using embeds, content that should go outside of it',
				type: ApplicationCommandOptionType.String,
			},
			{
				name: 'color',
				description: 'If using embeds, the color of the embed',
				type: ApplicationCommandOptionType.String,
			},
			{
				name: 'attachment-url',
				description: 'Optional attachment URL',
				type: ApplicationCommandOptionType.String,
			},
			{
				name: 'embed',
				description: 'Wether or not to use an embed',
				type: ApplicationCommandOptionType.Boolean,
			},
			{
				name: 'allow-targets',
				description: 'Wether or not to allow targets',
				type: ApplicationCommandOptionType.Boolean,
			},
		],
	};

	public constructor(private readonly prisma: PrismaClient) {}

	public async handle(interaction: ChatInputCommandInteraction<'cached'>) {
		await interaction.deferReply();

		const name = interaction.options.getString('name', true);
		const content = interaction.options.getString('content', true);
		const plainContent = interaction.options.getString('plain-content');
		const color = interaction.options.getString('color');
		const attachmentUrl = interaction.options.getString('attachment-url');
		const embed = interaction.options.getBoolean('embed');
		const allowTargets = interaction.options.getBoolean('allow-targets');

		const existing = await this.prisma.socialInteraction.findFirst({
			where: {
				guildId: interaction.guildId,
				name,
			},
		});

		const data: ApplicationCommandDataResolvable = {
			name,
			description: `Social interaction for ${interaction.guild.name}`,
			options:
				allowTargets ?? existing?.allowTargets
					? [
							{
								name: 'target1',
								description: 'The first target',
								type: ApplicationCommandOptionType.User,
								required: true,
							},
							{
								name: 'target2',
								description: 'The second target',
								type: ApplicationCommandOptionType.User,
							},
							{
								name: 'target3',
								description: 'The third target',
								type: ApplicationCommandOptionType.User,
							},
							{
								name: 'target4',
								description: 'The fourth target',
								type: ApplicationCommandOptionType.User,
							},
							{
								name: 'target5',
								description: 'The fifth target',
								type: ApplicationCommandOptionType.User,
							},
					  ]
					: [],
		};

		if (existing) {
			const command = await interaction.guild.commands.fetch(existing.commandId).catch(() => null);
			await command?.delete();

			const created = await interaction.guild.commands.create(data);

			await this.prisma.socialInteraction.update({
				data: {
					commandId: created.id,
					content,
					plainContent: plainContent ?? existing.plainContent,
					color: color ?? existing.color,
					attachmentUrl: attachmentUrl ?? existing.attachmentUrl,
					embed: embed ?? existing.embed,
					allowTargets: allowTargets ?? existing.allowTargets,
				},
				where: {
					guildId_name: {
						guildId: interaction.guildId,
						name,
					},
				},
			});

			return interaction.editReply(`Updated interaction \`${name}\``);
		}

		const created = await interaction.guild.commands.create(data);

		await this.prisma.socialInteraction.create({
			data: {
				commandId: created.id,
				guildId: interaction.guildId,
				name,
				content,
				plainContent,
				color,
				attachmentUrl,
				embed: embed ?? undefined,
				allowTargets: allowTargets ?? undefined,
			},
		});

		return interaction.editReply(`Created interaction \`${name}\``);
	}
}
