import type { TRequest } from '@chatsift/rest-utils';
import { Route, RouteMethod } from '@chatsift/rest-utils';
import { PrismaClient } from '@prisma/client';
import type { BaseValidator, InferType } from '@sapphire/shapeshift';
import { s } from '@sapphire/shapeshift';
import type { Response } from 'polka';
import { singleton } from 'tsyringe';
import type { GuildSettings } from '../util/models.js';
import { LevelUpNotificationMode } from '../util/models.js';
import { snowflakeSchema } from '../util/snowflakeSchema.js';

const schema = s.object({
	requiredMessages: s.number.greaterThanOrEqual(1).lessThanOrEqual(15).nullish,
	requiredMessagesTimespan: s.number.greaterThanOrEqual(1).lessThanOrEqual(60).nullish,
	xpGain: s.number.greaterThanOrEqual(1).nullish,
	requiredXpBase: s.number.greaterThanOrEqual(1).lessThanOrEqual(500).nullish,
	requiredXpMultiplier: s.number.greaterThanOrEqual(1).lessThanOrEqual(100).nullish,
	levelUpNotificationMode: s.enum(...Object.values(LevelUpNotificationMode)).optional,
	levelUpNotificationFallbackChannelId: snowflakeSchema.nullish,
	levelUpNotificationMessage: s.string.nullish,
}).strict;
type Body = InferType<typeof schema>;

@singleton()
export default class extends Route<GuildSettings, Body> {
	public info = {
		method: RouteMethod.patch,
		path: '/social/v1/guilds/:guildId/settings/',
	} as const;

	public override readonly bodyValidationSchema = schema;

	public constructor(private readonly prisma: PrismaClient) {
		super();
	}

	public async handle(req: TRequest<Body>, res: Response) {
		const { guildId } = req.params as { guildId: string };
		const data = req.body;

		const guildSettings = await this.prisma.guildSettings.upsert({
			create: {
				guildId,
				...data,
			},
			update: data,
			where: { guildId },
		});

		res.statusCode = 200;
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify(guildSettings ?? { guildId }));
	}
}
