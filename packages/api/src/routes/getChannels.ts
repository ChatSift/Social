import { Route, RouteMethod } from '@chatsift/rest-utils';
import { PrismaClient } from '@prisma/client';
import type { Middleware, Request, Response } from 'polka';
import { singleton } from 'tsyringe';
import type { Reward } from '../util/models.js';

@singleton()
export default class extends Route<Reward[], never> {
	public info = {
		method: RouteMethod.get,
		path: '/social/v1/guilds/:guildId/channels',
	} as const;

	public constructor(private readonly prisma: PrismaClient) {
		super();
	}

	public async handle(req: Request, res: Response) {
		const { guildId } = req.params as { guildId: string };
		const channels = await this.prisma.reward.findMany({
			where: { guildId },
		});

		res.statusCode = 200;
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify(channels));
	}
}
