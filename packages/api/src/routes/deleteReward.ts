import { Route, RouteMethod } from '@chatsift/rest-utils';
import { notFound } from '@hapi/boom';
import { Prisma, PrismaClient } from '@prisma/client';
import type { NextHandler, Request, Response } from 'polka';
import { PrismaError } from 'prisma-error-enum';
import { singleton } from 'tsyringe';
import type { Reward } from '../util/models.js';

@singleton()
export default class extends Route<Reward, never> {
	public info = {
		method: RouteMethod.delete,
		path: '/social/v1/guilds/:guildId/rewards/:roleId',
	} as const;

	public constructor(private readonly prisma: PrismaClient) {
		super();
	}

	public async handle(req: Request, res: Response, next: NextHandler) {
		const { guildId, roleId } = req.params as { guildId: string; roleId: string };

		try {
			const reward = await this.prisma.reward.delete({
				where: {
					roleId_guildId: {
						guildId,
						roleId,
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
