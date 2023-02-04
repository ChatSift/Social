/* eslint-disable consistent-return */
import { dirname, join, sep as pathSep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readdirRecurse } from '@chatsift/readdir';
import { REST } from '@discordjs/rest';
import type { PermissionResolvable } from 'discord.js';
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	type CommandInteraction,
	inlineCode,
	type MessageComponentInteraction,
	type RESTPutAPIApplicationCommandsJSONBody,
	Routes,
	type ThreadChannel,
	PermissionsBitField,
} from 'discord.js';
import { container, singleton } from 'tsyringe';
import { logger } from '../util/logger.js';
import type { Command, CommandConstructor, CommandWithSubcommands, Subcommand } from './Command.js';
import { type Component, type ComponentConstructor, getComponentInfo } from './Component.js';
import { Env } from './Env.js';

@singleton()
export class CommandHandler {
	public readonly commands = new Map<string, Command | CommandWithSubcommands | Subcommand>();

	public readonly components = new Map<string, Component>();

	public constructor(private readonly env: Env) {}

	public async handleAutocomplete(interaction: AutocompleteInteraction) {
		const command = this.commands.get(interaction.commandName) as Command | CommandWithSubcommands | undefined;

		if (!command?.handleAutocomplete && !command?.containsSubcommands) {
			return interaction.respond([]);
		}

		if (command.interactionOptions.dm_permission && interaction.inCachedGuild()) {
			return;
		}

		try {
			const subcommandName = interaction.options.getSubcommand(false);
			const subcommand = this.commands.get(`${command.interactionOptions.name}-${subcommandName!}`);

			const autocompleteHandler = subcommand?.handleAutocomplete ? subcommand : command;
			const options = await autocompleteHandler.handleAutocomplete?.(interaction);
			if (!options) {
				await interaction.respond([]);
				return;
			}

			await interaction.respond(options.slice(0, 25));
			return;
		} catch (error) {
			logger.error(
				{
					err: error,
					command: interaction.commandName,
				},
				'Error handling autocomplete',
			);
			return interaction.respond([
				{
					name: 'Something went wrong fetching auto complete options. Please report this bug.',
					value: 'noop',
				},
			]);
		}
	}

	public async handleMessageComponent(interaction: MessageComponentInteraction<'cached'>) {
		const [name, ...args] = interaction.customId.split('|') as [string, ...string[]];
		const component = this.components.get(name);

		try {
			// eslint-disable-next-line @typescript-eslint/return-await
			return await component?.handle(interaction, ...args);
		} catch (error) {
			logger.error(
				{
					err: error,
					component: name,
				},
				'Error handling message component',
			);
			const content = `Something went wrong running component. Please report this bug.\n\n${inlineCode(
				error as Error['message'],
			)}`;

			// Try to display something to the user. We don't actually know what our component has done response wise, though
			await interaction.reply({ content }).catch(() => null);
			await interaction.update({ content }).catch(() => null);
		}
	}

	public async handleCommand(interaction: CommandInteraction) {
		const command = this.commands.get(interaction.commandName) as Command | CommandWithSubcommands | undefined;
		if (!command) {
			logger.warn(interaction, 'Command interaction not registered locally was not chatInput');
			return;
		}

		if (!command.interactionOptions.dm_permission && !interaction.inCachedGuild()) {
			logger.warn(
				{
					interaction,
					command,
				},
				'Command interaction had dm_permission off and was not in cached guild',
			);
			return;
		}

		try {
			if (!command.containsSubcommands) {
				if (!command.interactionOptions.dm_permission && command.requiredClientPermissions) {
					const missingRequiredClientPermissions = this.checkForMissingClientPermissions(
						interaction.appPermissions!,
						command.requiredClientPermissions,
					);
					if (missingRequiredClientPermissions.length) {
						return await interaction.reply({
							content: `The bot is missing the following permissions to run this command: ${inlineCode(
								missingRequiredClientPermissions.join(', '),
							)}`,
							ephemeral: true,
						});
					}
				}

				// eslint-disable-next-line @typescript-eslint/return-await
				return await command.handle(interaction as ChatInputCommandInteraction<'cached'>);
			}

			if (!interaction.isChatInputCommand()) {
				logger.warn(interaction, 'Command interaction with subcommand call was not chatInput');
				return;
			}

			const subcommand = this.commands.get(`${interaction.commandName}-${interaction.options.getSubcommand()}`) as
				| Subcommand
				| undefined;

			if (!subcommand) {
				logger.warn(interaction, 'Command interaction with subcommands map had no subcommand');
				return;
			}

			if (!command.interactionOptions.dm_permission && subcommand.requiredClientPermissions) {
				const missingRequiredClientPermissions = this.checkForMissingClientPermissions(
					interaction.appPermissions!,
					subcommand.requiredClientPermissions,
				);
				if (missingRequiredClientPermissions.length) {
					return await interaction.reply({
						content: `The bot is missing the following permissions to run this command: ${inlineCode(
							missingRequiredClientPermissions.join(', '),
						)}`,
						ephemeral: true,
					});
				}
			}

			// eslint-disable-next-line @typescript-eslint/return-await
			return await subcommand.handle(interaction as ChatInputCommandInteraction<'cached'>);
		} catch (error) {
			// TODO(DD): Consider dealing with specific error
			logger.error(
				{
					err: error,
					command: interaction.commandName,
				},
				'Error handling command',
			);
			const content = `Something went wrong running command. This could be a bug, or it could be related to your permissions.\n\n${inlineCode(
				error as Error['message'],
			)}`;

			// Try to display something to the user.
			if (interaction.replied) {
				await interaction.followUp({ content, ephemeral: true });
				return;
			}

			await interaction.reply({ content, ephemeral: true });
		}
	}

	public async init(): Promise<void> {
		await Promise.all([this.registerCommands(), this.registerComponents()]);
	}

	public checkForMissingClientPermissions(
		clientPermissions: PermissionsBitField,
		requiredClientPermissions: PermissionResolvable,
	) {
		const requiredClientPermissionsBitField = new PermissionsBitField(clientPermissions);
		if (requiredClientPermissionsBitField.bitfield) {
			const missingClientPermissions = clientPermissions.missing(requiredClientPermissions);
			if (missingClientPermissions.length) {
				return missingClientPermissions;
			}
		}

		return [];
	}

	public async registerInteractions(): Promise<void> {
		const api = new REST().setToken(this.env.discordToken);
		const commands = [...this.commands.values()];

		const commandsWithSubcommands = commands.filter(
			(cmd) => 'containsSubcommands' in cmd && cmd.containsSubcommands,
		) as CommandWithSubcommands[];

		const normalCommands = commands
			.filter((cmd) => 'type' in cmd.interactionOptions)
			.map((cmd) => cmd.interactionOptions) as RESTPutAPIApplicationCommandsJSONBody;

		const subcommands = commandsWithSubcommands.map((cmd) => ({
			...cmd.interactionOptions,
			type: ApplicationCommandType.ChatInput,
			options: [...this.commands.entries()]
				.filter(([key]) => key.startsWith(cmd.interactionOptions.name) && key !== cmd.interactionOptions.name)
				.map(([, subcmd]) => ({
					...subcmd.interactionOptions,
					type: ApplicationCommandOptionType.Subcommand,
				})),
		})) as RESTPutAPIApplicationCommandsJSONBody;

		const options: RESTPutAPIApplicationCommandsJSONBody = normalCommands.concat(subcommands);
		await api.put(Routes.applicationCommands(this.env.discordClientId), { body: options });
	}

	private async registerCommands(): Promise<void> {
		const path = join(dirname(fileURLToPath(import.meta.url)), '..', 'commands');
		const files = readdirRecurse(path, { fileExtensions: ['js'] });

		for await (const file of files) {
			const mod = (await import(pathToFileURL(file).toString())) as { default: CommandConstructor };
			const command = container.resolve(mod.default);

			const directory = dirname(file).split(pathSep).pop()!;
			const isSubcommand = (cmd: Command | CommandWithSubcommands | Subcommand): cmd is Subcommand =>
				!['commands', 'context-menus'].includes(directory) && !file.endsWith('index.js');

			if (isSubcommand(command)) {
				this.commands.set(`${directory}-${command.interactionOptions.name}`, command);
			} else {
				this.commands.set(command.interactionOptions.name, command);
			}
		}
	}

	private async registerComponents(): Promise<void> {
		const path = join(dirname(fileURLToPath(import.meta.url)), '..', 'components');
		const files = readdirRecurse(path, { fileExtensions: ['js'] });

		for await (const file of files) {
			const info = getComponentInfo(file);
			if (!info) {
				continue;
			}

			const mod = (await import(pathToFileURL(file).toString())) as { default: ComponentConstructor };
			const component = container.resolve(mod.default);
			const name = component.name ?? info.name;

			this.components.set(name, component);
		}
	}
}
