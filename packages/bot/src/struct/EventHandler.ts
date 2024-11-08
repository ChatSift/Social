import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readdirRecurse } from '@chatsift/readdir';
import type { ClientEvents } from 'discord.js';
import { Client } from 'discord.js';
import { container, singleton } from 'tsyringe';
import type { EventConstructor } from './Event.js';
import { getEventInfo } from './Event.js';

@singleton()
export class EventHandler {
	public constructor(private readonly client: Client) {}

	public async init(): Promise<void> {
		const path = join(dirname(fileURLToPath(import.meta.url)), '..', 'events');
		const files = readdirRecurse(path, { fileExtensions: ['js'] });

		for await (const file of files) {
			const info = getEventInfo(file);
			if (!info) {
				continue;
			}

			const mod = (await import(pathToFileURL(file).toString())) as { default: EventConstructor };
			const event = container.resolve(mod.default);
			const name = event.name ?? (info.name as keyof ClientEvents);

			this.client.on(name, (...data) => event.handle(...data));
		}
	}
}
