import type { TRequest } from '@chatsift/rest-utils';
import { Route, RouteMethod } from '@chatsift/rest-utils';
import { REST } from '@discordjs/rest';
import { notFound } from '@hapi/boom';
import { PrismaClient } from '@prisma/client';
import type { InferType } from '@sapphire/shapeshift';
import { s } from '@sapphire/shapeshift';
import type { RESTPatchAPIApplicationGuildCommandJSONBody } from 'discord-api-types/v10';
import { Routes, ApplicationCommandOptionType } from 'discord-api-types/v10';
import type { NextHandler, Response } from 'polka';
import { singleton } from 'tsyringe';
import { Env } from '../util/env.js';
import type { SocialInteraction } from '../util/models.js';

const schema = s.object({
	content: s.string.lengthLessThanOrEqual(1_000),
	color: s.string.nullish,
	plainContent: s.string.lengthLessThanOrEqual(1_000).nullish,
	attachmentUrl: s.string.url().nullish,
	embed: s.boolean.optional,
	allowTargets: s.boolean.optional,
}).strict;
type Body = InferType<typeof schema>;

@singleton()
export default class extends Route<SocialInteraction, Body> {
	public info = {
		method: RouteMethod.patch,
		path: '/social/v1/guilds/:guildId/interactions/:name',
	} as const;

	public override readonly bodyValidationSchema = schema;

	public constructor(private readonly prisma: PrismaClient, private readonly rest: REST, private readonly env: Env) {
		super();
	}

	public async handle(req: TRequest<Body>, res: Response, next: NextHandler) {
		const { guildId, name } = req.params as { guildId: string; name: string };

		const existing = await this.prisma.socialInteraction.findFirst({
			where: {
				guildId,
				name,
			},
		});

		if (!existing) {
			return next(notFound('interaction with that name does not exist'));
		}

		const data: RESTPatchAPIApplicationGuildCommandJSONBody = {
			name,
			description: 'Local social interaction',
			options:
				req.body.allowTargets ?? existing.allowTargets
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

		await this.rest.patch(Routes.applicationGuildCommand(this.env.discordClientId, guildId, existing.commandId), {
			body: data,
		});

		const interaction = await this.prisma.socialInteraction.update({
			data: {
				content: req.body.content,
				color: req.body.color,
				plainContent: req.body.plainContent,
				attachmentUrl: req.body.attachmentUrl,
				embed: req.body.embed,
				allowTargets: req.body.allowTargets,
			},
			where: {
				guildId_name: {
					guildId,
					name,
				},
			},
		});

		res.statusCode = 200;
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify(interaction));
	}
}
