export interface LevelUpMessageTemplateData {
	earnedRewards: string;
	guildName: string;
	level: string;
	username: string;
}

export function templateLevelUpMessage(content: string, data: LevelUpMessageTemplateData): string {
	return content.replaceAll(/{{ (?<template>\w+?) }}/gm, (_, template: string) =>
		Object.hasOwn(data, template)
			? data[template as keyof LevelUpMessageTemplateData]
			: `[unknown template ${template}]`,
	);
}
