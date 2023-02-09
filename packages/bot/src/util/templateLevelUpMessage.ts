export type TemplateData = {
	earnedRewards: string;
	guildName: string;
	level: string;
	username: string;
};

export function templateLevelUpMessage(content: string, data: TemplateData): string {
	return content.replaceAll(/{{ (?<template>\w+?) }}/gm, (_, template: string) =>
		Object.hasOwn(data, template) ? data[template as keyof TemplateData] : `[unknown template ${template}]`,
	);
}
