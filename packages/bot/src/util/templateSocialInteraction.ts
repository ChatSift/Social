export type SocialInteractionTemplateData = {
	author: string;
	targets?: string;
};

export function templateSocialInteraction(content: string, data: SocialInteractionTemplateData): string {
	return content.replaceAll(/{{ (?<template>\w+?) }}/gm, (_, template: string) => {
		const unknownTemplate = `[unknown template ${template}]`;
		return Object.hasOwn(data, template)
			? data[template as keyof SocialInteractionTemplateData] ?? unknownTemplate
			: unknownTemplate;
	});
}
