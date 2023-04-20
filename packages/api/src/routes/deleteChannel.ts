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
		path: '/social/v1/guilds/:guildId/channels/:channelId',
	} as const;

	public constructor(private readonly prisma: PrismaClient) {
		super();
	}

	public async handle(req: Request, res: Response, next: NextHandler) {
		const { guildId, channelId } = req.params as { channelId: string; guildId: string };

		try {
			const channel = await this.prisma.channel.delete({
				where: {
					channelId_guildId: {
						guildId,
						channelId,
					},
				},
			});

			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(channel));
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PrismaError.RecordsNotFound) {
				return next(notFound('channel does not exist'));
			}

			throw error;
		}
	}
}
