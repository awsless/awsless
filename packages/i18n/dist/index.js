import { n as i18n } from "./vite-CcDQa0Ms.js";
import { generateObject } from "ai";
import chunk from "chunk";
import { z } from "zod";
//#region src/translate/ai.ts
const ai = (props) => {
	return async (originalLocale, texts) => {
		const batches = chunk(texts, props.batchSize ?? 1e3);
		return (await Promise.all(batches.map(async (batch) => {
			const result = await generateObject({
				model: props.model,
				maxOutputTokens: props.maxOutputTokens,
				schema: z.object({ translations: z.object({
					id: z.number(),
					translation: z.string()
				}).array() }),
				prompt: [
					`You have to translate the text inside the JSON file below from "${originalLocale}" to the provided locale.`,
					"Return the id of every entry together with its translation.",
					"Some texts contain tags like <b>...</b> or <Link_1>...</Link_1> and placeholders like {count} or ${name}.",
					"Keep every tag and placeholder exactly as written, but move them when the grammar of the target language needs it.",
					"Never translate, add, remove, or rename a tag or placeholder.",
					"A \"context\" field describes where the text is used. Use it to pick the right wording, but never translate it.",
					...props?.rules ?? [],
					"",
					`JSON FILE:`,
					JSON.stringify(batch.map((item, id) => ({
						id,
						...item
					})))
				].join("\n"),
				system: "You are a helpful translator."
			});
			return matchTranslations(batch, result.object.translations);
		}))).flat();
	};
};
const matchTranslations = (requests, responses) => {
	const list = [];
	for (const { id, translation } of responses) {
		const request = requests[id];
		if (request) list.push({
			...request,
			translation
		});
	}
	return list;
};
//#endregion
export { ai, i18n };
