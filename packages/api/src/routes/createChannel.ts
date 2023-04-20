import type { TRequest } from '@chatsift/rest-utils';
import { Route, RouteMethod } from '@chatsift/rest-utils';
import { conflict } from '@hapi/boom';
import { Prisma, PrismaClient } from '@prisma/client';
import type { InferType } from '@sapphire/shapeshift';
import { s } from '@sapphire/shapeshift';
import type { NextHandler, Request, Response } from 'polka';
import { PrismaError } from 'prisma-error-enum';
import { singleton } from 'tsyringe';
import type { Channel } from '../util/models.js';

const schema = s.object({
	ignored: s.boolean.default(false),
	multiplier: s.number.greaterThanOrEqual(1).default(1),
}).strict;
type Body = InferType<typeof schema>;

@singleton()
export default class extends Route<Channel, Body> {
	public info = {
		method: RouteMethod.put,
		path: '/social/v1/guilds/:guildId/channels/:channelId',
	} as const;

	public override readonly bodyValidationSchema = schema;

	public constructor(private readonly prisma: PrismaClient) {
		super();
	}

	public async handle(req: TRequest<Body>, res: Response, next: NextHandler) {
		const { guildId, channelId } = req.params as { channelId: string; guildId: string };

		try {
			const channel = await this.prisma.channel.create({
				data: {
					guildId,
					channelId,
					ignored: req.body.ignored,
					multiplier: req.body.multiplier,
				},
			});

			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(channel));
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === PrismaError.UniqueConstraintViolation
			) {
				return next(conflict('channel already exists'));
			}

			throw error;
		}
	}
}
