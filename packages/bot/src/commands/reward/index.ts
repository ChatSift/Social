import type { ApplicationCommandType } from 'discord.js';
import { singleton } from 'tsyringe';
import type { CommandWithSubcommands, CommandBody } from '../../struct/Command';

@singleton()
export default class implements CommandWithSubcommands {
	public readonly containsSubcommands = true;

	public readonly interactionOptions: Omit<CommandBody<ApplicationCommandType.ChatInput>, 'options' | 'type'> = {
		name: 'reward',
		description: 'Allows you to manage the rewards in your server',
		default_member_permissions: '0',
		dm_permission: false,
	};
}
