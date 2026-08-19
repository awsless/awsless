import MagicString from "magic-string";
import { readFile, stat, writeFile } from "fs/promises";
import { join } from "path";
import { glob } from "glob";
import { walk } from "estree-walker";
import lineColumn from "line-column";
import { parse } from "svelte/compiler";
import { parseSync } from "oxc-parser";
import { generateObject } from "ai";
import chunk from "chunk";
import { z } from "zod";
//#region src/cache.ts
const GENERATED_CACHE_FILE = "i18n.generated.json";
const OVERRIDE_CACHE_FILE = "i18n.json";
const loadFile = async (cwd, fileName) => {
	const file = join(cwd, fileName);
	try {
		await stat(file);
	} catch {
		return new Cache();
	}
	const data = await readFile(file, "utf8");
	return new Cache(JSON.parse(data));
};
const loadGeneratedCache = async (cwd) => {
	return loadFile(cwd, GENERATED_CACHE_FILE);
};
const loadOverrideCache = async (cwd) => {
	return loadFile(cwd, OVERRIDE_CACHE_FILE);
};
const saveCache = async (cwd, cache) => {
	await writeFile(join(cwd, GENERATED_CACHE_FILE), JSON.stringify(cache.toJSON(), void 0, "	") + "\n");
};
const mergeCaches = (...caches) => {
	const merged = new Cache();
	for (const cache of caches) for (const item of cache.entries()) merged.replace(item.source, item.locale, item.translation);
	return merged;
};
var Cache = class {
	data;
	constructor(data = {}) {
		this.data = data;
	}
	set(source, locale, translation) {
		if (!this.data[source]) this.data[source] = {};
		if (typeof this.data[source][locale] === "undefined") this.data[source][locale] = translation;
	}
	replace(source, locale, translation) {
		if (!this.data[source]) this.data[source] = {};
		this.data[source][locale] = translation;
	}
	get(source, locale) {
		return this.data[source]?.[locale];
	}
	has(source, locale) {
		return typeof this.get(source, locale) === "string";
	}
	delete(source, locale) {
		if (typeof this.data[source]?.[locale] !== "undefined") delete this.data[source][locale];
		if (this.data[source] && Object.keys(this.data[source]).length === 0) delete this.data[source];
	}
	*entries() {
		for (const [source, locales] of Object.entries(this.data)) for (const [locale, translation] of Object.entries(locales)) yield {
			source,
			locale,
			translation
		};
	}
	toJSON() {
		return Object.fromEntries(Object.entries(this.data).toSorted(([left], [right]) => left.localeCompare(right)).map(([source, locales]) => {
			return [source, Object.fromEntries(Object.entries(locales).toSorted(([left], [right]) => left.localeCompare(right)))];
		}));
	}
};
//#endregion
//#region src/diff.ts
const findNewTranslations = (cache, sources, locales) => {
	const list = [];
	for (const source of sources) for (const locale of locales) if (!cache.has(source, locale)) list.push({
		source,
		locale
	});
	return list;
};
const removeUnusedTranslations = (cache, sources, locales) => {
	for (const item of cache.entries()) if (!locales.includes(item.locale) || !sources.includes(item.source)) cache.delete(item.source, item.locale);
};
//#endregion
//#region src/find/svelte.ts
const findSvelteTranslatable = (code) => {
	const found = [];
	const origin = lineColumn(code);
	const ast = parse(code);
	const enter = (node) => {
		if (node.type === "TaggedTemplateExpression" && node.tag.type === "MemberExpression" && node.tag.object.type === "Identifier" && node.tag.object.name === "lang" && node.tag.property.type === "Identifier" && node.tag.property.name === "t" && node.quasi.type === "TemplateLiteral" && node.quasi.loc) {
			const start = node.quasi.loc.start;
			const end = node.quasi.loc.end;
			const content = code.substring(origin.toIndex(start.line, start.column) + 2, origin.toIndex(end.line, end.column));
			found.push(content);
		}
	};
	walk(ast.html, { enter });
	if (ast.instance) walk(ast.instance.content, { enter });
	if (ast.module) walk(ast.module.content, { enter });
	return found;
};
//#endregion
//#region src/find/typescript.ts
const findTypescriptTranslatable = async (code) => {
	const found = [];
	const ast = parseSync("module.ts", code);
	walk(ast.program, { enter(node) {
		if (node.type === "TaggedTemplateExpression" && node.tag.type === "MemberExpression" && node.tag.object.type === "Identifier" && node.tag.object.name === "lang" && node.tag.property.type === "Identifier" && node.tag.property.name === "t") {
			const quasi = node.quasi;
			found.push(code.slice(quasi.start + 1, quasi.end - 1));
		}
	} });
	return found;
};
//#endregion
//#region src/find.ts
const findTranslatable = async (cwd) => {
	const files = await glob("**/*.{js,ts,svelte}", {
		cwd,
		ignore: [
			"**/node_modules/**",
			"**/.svelte-kit/**",
			"**/.*/**"
		]
	});
	const found = [];
	for (const file of files) {
		const code = await readFile(join(cwd, file), "utf8");
		if (code.includes("lang.t`")) {
			if (file.endsWith(".svelte")) found.push(...findSvelteTranslatable(code));
			else {
				const entries = await findTypescriptTranslatable(code);
				found.push(...entries);
			}
		}
	}
	return found;
};
//#endregion
//#region src/vite.ts
const i18n = (props) => {
	let cache;
	let generatedCache;
	return {
		name: "awsless/i18n",
		enforce: "pre",
		async buildStart() {
			const cwd = process.cwd();
			this.info("Finding all translatable text...");
			const sourceTexts = await findTranslatable(cwd);
			generatedCache = await loadGeneratedCache(cwd);
			const overrideCache = await loadOverrideCache(cwd);
			removeUnusedTranslations(generatedCache, sourceTexts, props.locales);
			cache = mergeCaches(generatedCache, overrideCache);
			const newSourceTexts = findNewTranslations(cache, sourceTexts, props.locales);
			if (newSourceTexts.length > 0) {
				this.info(`Translating ${newSourceTexts.length} new texts.`);
				const translations = await props.translate(props.default ?? "en", newSourceTexts);
				this.info(`Translated ${translations.length} texts.`);
				for (const item of translations) generatedCache.set(item.source, item.locale, item.translation);
			}
			cache = mergeCaches(generatedCache, overrideCache);
			await saveCache(cwd, generatedCache);
			this.info(`Translating done.`);
		},
		transform(code) {
			if (code.includes("lang.t`")) {
				const transformedCode = new MagicString(code);
				for (const item of cache.entries()) transformedCode.replaceAll(`lang.t\`${item.source}\``, `lang.t.get(\`${item.source}\`, {${props.locales.map((locale) => {
					const translation = cache.get(item.source, locale);
					if (translation === item.source) return;
					return `"${locale}":\`${translation}\``;
				}).filter((v) => !!v).join(",")}})`);
				return {
					code: transformedCode.toString(),
					map: transformedCode.generateMap({ hires: true })
				};
			}
		}
	};
};
//#endregion
//#region src/translate/ai.ts
const ai = (props) => {
	return async (originalLocale, texts) => {
		const batches = chunk(texts, props.batchSize ?? 1e3);
		return (await Promise.all(batches.map(async (texts) => {
			return (await generateObject({
				model: props.model,
				maxOutputTokens: props.maxOutputTokens,
				schema: z.object({ translations: z.object({
					source: z.string(),
					locale: z.string(),
					translation: z.string()
				}).array() }),
				prompt: [
					`You have to translate the text inside the JSON file below from "${originalLocale}" to the provided locale.`,
					...props?.rules ?? [],
					"",
					`JSON FILE:`,
					JSON.stringify(texts)
				].join("\n"),
				system: "You are a helpful translator."
			})).object.translations;
		}))).flat(3);
	};
};
//#endregion
export { ai, i18n };
