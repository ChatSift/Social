import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { Client, IntentsBitField, Options, Partials } from 'discord.js';
import { Redis } from 'ioredis';
import { container } from 'tsyringe';
import { CommandHandler } from './struct/CommandHandler.js';
import { Env } from './struct/Env.js';
import { EventHandler } from './struct/EventHandler.js';
import { SYMBOLS } from './util/symbols.js';

const env = container.resolve(Env);

const client = new Client({
	intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages],
	partials: [Partials.Channel, Partials.Message],
	makeCache: Options.cacheWithLimits({ MessageManager: 100 }),
}).setMaxListeners(20);

container.register(Client, { useValue: client });
container.register(PrismaClient, { useValue: new PrismaClient() });
container.register(SYMBOLS.redis, { useValue: new Redis(env.redisUrl) });

const commandHandler = container.resolve(CommandHandler);
await commandHandler.init();

if (env.deploySlashCommands || !env.isProd) {
	await commandHandler.registerInteractions();
}

await container.resolve(EventHandler).init();

await client.login(env.discordToken);
