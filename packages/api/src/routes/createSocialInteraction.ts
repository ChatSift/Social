import type { TRequest } from '@chatsift/rest-utils';
import { Route, RouteMethod } from '@chatsift/rest-utils';
import { REST } from '@discordjs/rest';
import { conflict } from '@hapi/boom';
import { PrismaClient } from '@prisma/client';
import type { InferType } from '@sapphire/shapeshift';
import { s } from '@sapphire/shapeshift';
import type {
	RESTPostAPIApplicationCommandsJSONBody,
	RESTPostAPIApplicationGuildCommandsResult,
} from 'discord-api-types/v10';
import { Routes, ApplicationCommandOptionType } from 'discord-api-types/v10';
import type { NextHandler, Response } from 'polka';
import { singleton } from 'tsyringe';
import { Env } from '../util/env.js';
import type { SocialInteraction } from '../util/models.js';

const schema = s.object({
	name: s.string.lengthLessThan(32),
	content: s.string.lengthLessThanOrEqual(1_000),
	color: s.string.nullish,
	plainContent: s.string.lengthLessThanOrEqual(1_000).nullish,
	attachmentUrl: s.string.url().nullish,
	embed: s.boolean.default(false),
	allowTargets: s.boolean.default(false),
}).strict;
type Body = InferType<typeof schema>;

@singleton()
export default class extends Route<SocialInteraction, Body> {
	public info = {
		method: RouteMethod.put,
		path: '/social/v1/guilds/:guildId/interactions',
	} as const;

	public override readonly bodyValidationSchema = schema;

	public constructor(private readonly prisma: PrismaClient, private readonly rest: REST, private readonly env: Env) {
		super();
	}

	public async handle(req: TRequest<Body>, res: Response, next: NextHandler) {
		const { guildId } = req.params as { guildId: string };

		const existing = await this.prisma.socialInteraction.findFirst({
			where: {
				guildId,
				name: req.body.name,
			},
		});

		if (existing) {
			return next(conflict('interaction with that name already exists'));
		}

		const data: RESTPostAPIApplicationCommandsJSONBody = {
			name: req.body.name,
			description: 'Local social interaction',
			options: req.body.allowTargets
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

		const command = (await this.rest.post(Routes.applicationGuildCommands(this.env.discordClientId, guildId), {
			body: data,
		})) as RESTPostAPIApplicationGuildCommandsResult;

		const interaction = await this.prisma.socialInteraction.create({
			data: {
				guildId,
				commandId: command.id,
				...req.body,
			},
		});

		res.statusCode = 200;
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify(interaction));
	}
}
