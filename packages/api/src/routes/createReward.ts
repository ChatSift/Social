import type { TRequest } from '@chatsift/rest-utils';
import { Route, RouteMethod } from '@chatsift/rest-utils';
import { conflict } from '@hapi/boom';
import { Prisma, PrismaClient } from '@prisma/client';
import type { InferType } from '@sapphire/shapeshift';
import { s } from '@sapphire/shapeshift';
import type { NextHandler, Response } from 'polka';
import { PrismaError } from 'prisma-error-enum';
import { singleton } from 'tsyringe';
import type { Reward } from '../util/models.js';
import { snowflakeSchema } from '../util/snowflakeSchema.js';

const schema = s.object({
	roleId: snowflakeSchema,
	level: s.number.greaterThanOrEqual(1),
	clean: s.boolean.default(false),
}).strict;
type Body = InferType<typeof schema>;

@singleton()
export default class extends Route<Reward, Body> {
	public info = {
		method: RouteMethod.put,
		path: '/social/v1/guilds/:guildId/rewards',
	} as const;

	public override readonly bodyValidationSchema = schema;

	public constructor(private readonly prisma: PrismaClient) {
		super();
	}

	public async handle(req: TRequest<Body>, res: Response, next: NextHandler) {
		const { guildId } = req.params as { guildId: string };

		try {
			const reward = await this.prisma.reward.create({
				data: {
					guildId,
					roleId: req.body.roleId,
					level: req.body.level,
					clean: req.body.clean,
				},
			});

			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(reward));
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === PrismaError.UniqueConstraintViolation
			) {
				return next(conflict('reward already exists for that role'));
			}

			throw error;
		}
	}
}
