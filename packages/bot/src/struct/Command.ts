import type {
	PermissionResolvable,
	ApplicationCommandOptionChoiceData,
	ApplicationCommandType,
	AutocompleteInteraction,
	Awaitable,
	ChatInputCommandInteraction,
	MessageContextMenuCommandInteraction,
	RESTPostAPIApplicationCommandsJSONBody,
	UserContextMenuCommandInteraction,
	APIApplicationCommandSubcommandOption,
} from 'discord.js';

interface InteractionTypeMapping {
	[ApplicationCommandType.ChatInput]: ChatInputCommandInteraction<'cached'>;
	[ApplicationCommandType.User]: UserContextMenuCommandInteraction<'cached'>;
	[ApplicationCommandType.Message]: MessageContextMenuCommandInteraction<'cached'>;
}

export type CommandBody<Type extends ApplicationCommandType> = RESTPostAPIApplicationCommandsJSONBody & {
	type: Type;
};

export interface Command<Type extends ApplicationCommandType = ApplicationCommandType> {
	readonly containsSubcommands?: false;
	handle(interaction: InteractionTypeMapping[Type]): Awaitable<unknown>;
	handleAutocomplete?(interaction: AutocompleteInteraction<any>): Awaitable<ApplicationCommandOptionChoiceData[]>;
	readonly interactionOptions: CommandBody<Type>;
	readonly requiredClientPermissions?: PermissionResolvable;
}

export interface CommandWithSubcommands {
	readonly containsSubcommands: true;
	handleAutocomplete?(interaction: AutocompleteInteraction<any>): Awaitable<ApplicationCommandOptionChoiceData[]>;
	readonly interactionOptions: Omit<CommandBody<ApplicationCommandType.ChatInput>, 'options' | 'type'>;
	readonly requiredClientPermissions?: PermissionResolvable;
}

export type Subcommand = Omit<
	Command<ApplicationCommandType.ChatInput>,
	'containsSubcommands' | 'interactionOptions'
> & {
	readonly interactionOptions: Omit<APIApplicationCommandSubcommandOption, 'type'>;
};

export type CommandConstructor = new (...args: any[]) => Command | CommandWithSubcommands | Subcommand;
