import { Route, RouteMethod } from '@chatsift/rest-utils';
import { notFound } from '@hapi/boom';
import { Prisma, PrismaClient } from '@prisma/client';
import type { NextHandler, Request, Response } from 'polka';
import { PrismaError } from 'prisma-error-enum';
import { singleton } from 'tsyringe';
import type { SocialInteraction } from '../util/models.js';

@singleton()
export default class extends Route<SocialInteraction, never> {
	public info = {
		method: RouteMethod.delete,
		path: '/social/v1/guilds/:guildId/interactions/:name',
	} as const;

	public constructor(private readonly prisma: PrismaClient) {
		super();
	}

	public async handle(req: Request, res: Response, next: NextHandler) {
		const { guildId, name } = req.params as { guildId: string; name: string };

		try {
			const interaction = await this.prisma.socialInteraction.delete({
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
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PrismaError.RecordsNotFound) {
				return next(notFound('interaction does not exist'));
			}

			throw error;
		}
	}
}
