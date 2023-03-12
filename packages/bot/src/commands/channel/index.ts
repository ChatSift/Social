import type { ApplicationCommandType } from 'discord.js';
import { singleton } from 'tsyringe';
import type { CommandWithSubcommands, CommandBody } from '../../struct/Command';

@singleton()
export default class implements CommandWithSubcommands {
	public readonly containsSubcommands = true;

	public readonly interactionOptions: Omit<CommandBody<ApplicationCommandType.ChatInput>, 'options' | 'type'> = {
		name: 'channel',
		description: 'Allows you to manage a given channel in the server',
		default_member_permissions: '0',
		dm_permission: false,
	};
}
