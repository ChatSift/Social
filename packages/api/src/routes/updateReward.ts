import type { TRequest } from '@chatsift/rest-utils';
import { Route, RouteMethod } from '@chatsift/rest-utils';
import { notFound } from '@hapi/boom';
import { Prisma, PrismaClient } from '@prisma/client';
import type { InferType } from '@sapphire/shapeshift';
import { s } from '@sapphire/shapeshift';
import type { NextHandler, Response } from 'polka';
import { PrismaError } from 'prisma-error-enum';
import { singleton } from 'tsyringe';
import type { Reward } from '../util/models.js';

const schema = s.object({
	level: s.number.greaterThanOrEqual(1).optional,
	clean: s.boolean.optional,
}).strict;
type Body = InferType<typeof schema>;

@singleton()
export default class extends Route<Reward, Body> {
	public info = {
		method: RouteMethod.patch,
		path: '/social/v1/guilds/:guildId/rewards/:roleId',
	} as const;

	public override readonly bodyValidationSchema = schema;

	public constructor(private readonly prisma: PrismaClient) {
		super();
	}

	public async handle(req: TRequest<Body>, res: Response, next: NextHandler) {
		const { guildId, roleId } = req.params as { guildId: string; roleId: string };

		try {
			const reward = await this.prisma.reward.update({
				data: req.body,
				where: {
					roleId_guildId: {
						roleId,
						guildId,
					},
				},
			});

			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(reward));
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PrismaError.RecordsNotFound) {
				return next(notFound('reward does not exist for that role'));
			}

			throw error;
		}
	}
}
