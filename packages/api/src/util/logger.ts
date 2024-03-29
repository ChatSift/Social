import { join } from 'node:path';
import process from 'node:process';
import type { PinoRotateFileOptions } from '@chatsift/pino-rotate-file';
import { pino as createLogger, multistream, transport } from 'pino';
import type { PrettyOptions } from 'pino-pretty';
import { container } from 'tsyringe';
import { Env } from './env.js';

const env = container.resolve(Env);

const pinoPrettyOptions: PrettyOptions = {
	colorize: true,
	levelFirst: true,
	translateTime: true,
};

const pinoRotateFileOptions: PinoRotateFileOptions = {
	dir: join(process.cwd(), 'logs', 'api'),
	mkdir: true,
	maxAgeDays: 14,
	prettyOptions: {
		...pinoPrettyOptions,
		colorize: false,
	},
};

export const logger = env.useLocalLogging
	? createLogger(
			{
				name: 'api',
				level: 'trace',
			},
			multistream([
				{
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					stream: transport({
						target: 'pino-pretty',
						options: pinoPrettyOptions,
					}),
					level: 'trace',
				},
				{
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					stream: transport({
						target: '@chatsift/pino-rotate-file',
						options: pinoRotateFileOptions,
					}),
					level: 'trace',
				},
			]),
	  )
	: createLogger({ level: 'trace' });
