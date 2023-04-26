import { Route, RouteMethod } from '@chatsift/rest-utils';
import { PrismaClient } from '@prisma/client';
import type { Request, Response } from 'polka';
import { singleton } from 'tsyringe';
import type { SocialInteraction } from '../util/models.js';

@singleton()
export default class extends Route<SocialInteraction[], never> {
	public info = {
		method: RouteMethod.get,
		path: '/social/v1/guilds/:guildId/interactions',
	} as const;

	public constructor(private readonly prisma: PrismaClient) {
		super();
	}

	public async handle(req: Request, res: Response) {
		const { guildId } = req.params as { guildId: string };
		const interactions = await this.prisma.socialInteraction.findMany({
			where: { guildId },
		});

		res.statusCode = 200;
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify(interactions));
	}
}
