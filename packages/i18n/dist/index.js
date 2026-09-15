import MagicString from "magic-string";
import { readFile, stat, writeFile } from "fs/promises";
import { join } from "path";
import { glob } from "glob";
import { walk } from "estree-walker";
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
	const file = join(cwd, GENERATED_CACHE_FILE);
	const content = JSON.stringify(cache.toJSON(), void 0, "	") + "\n";
	try {
		if (await readFile(file, "utf8") === content) return false;
	} catch {}
	await writeFile(file, content);
	return true;
};
const mergeCaches = (...caches) => {
	const merged = new Cache();
	for (const cache of caches) for (const item of cache.entries()) merged.replace(item, item.locale, item.translation);
	return merged;
};
const migrate = (data) => {
	return Object.values(data).some((value) => Object.values(value).some((entry) => typeof entry === "string")) ? { "": data } : data;
};
const sorted = (record, map = (value) => value) => {
	return Object.fromEntries(Object.entries(record).toSorted(([left], [right]) => left.localeCompare(right)).map(([key, value]) => [key, map(value)]));
};
var Cache = class {
	data;
	constructor(data = {}) {
		this.data = migrate(data);
	}
	group(key, create = false) {
		const context = key.context ?? "";
		if (create) {
			this.data[context] ??= {};
			this.data[context][key.source] ??= {};
		}
		return this.data[context]?.[key.source];
	}
	set(key, locale, translation) {
		const group = this.group(key, true);
		if (typeof group[locale] === "undefined") group[locale] = translation;
	}
	replace(key, locale, translation) {
		this.group(key, true)[locale] = translation;
	}
	get(key, locale) {
		return this.group(key)?.[locale];
	}
	has(key, locale) {
		return typeof this.get(key, locale) === "string";
	}
	delete(key, locale) {
		const context = key.context ?? "";
		const group = this.group(key);
		if (!group) return;
		delete group[locale];
		if (Object.keys(group).length === 0) delete this.data[context][key.source];
		if (Object.keys(this.data[context]).length === 0) delete this.data[context];
	}
	*keys() {
		for (const [context, sources] of Object.entries(this.data)) for (const source of Object.keys(sources)) yield context ? {
			source,
			context
		} : { source };
	}
	*entries() {
		for (const key of this.keys()) for (const [locale, translation] of Object.entries(this.group(key))) yield {
			...key,
			locale,
			translation
		};
	}
	toJSON() {
		return sorted(this.data, (sources) => sorted(sources, (locales) => sorted(locales)));
	}
};
//#endregion
//#region src/tree.ts
const TOKEN = /<(\/?)([A-Za-z][\w.:-]*)\s*(\/?)>|(\$?)\{([^{}]*)\}/g;
/** Split a source string into text and the nodes it references. */
const parseSource = (source) => {
	const tokens = [];
	const nodes = [];
	const open = [];
	let last = 0;
	const text = (end) => {
		if (end > last) tokens.push({
			kind: "text",
			text: source.slice(last, end)
		});
	};
	for (const match of source.matchAll(TOKEN)) {
		text(match.index);
		last = match.index + match[0].length;
		const [, closing, tag, selfClosing, prefix, expression] = match;
		if (tag && closing) {
			const node = open.pop();
			if (node?.label !== tag) {
				if (node) open.push(node);
				tokens.push({
					kind: "text",
					text: match[0]
				});
				continue;
			}
			tokens.push({
				kind: "close",
				id: node.id
			});
			continue;
		}
		const node = tag ? {
			id: nodes.length,
			label: tag,
			kind: "element",
			leaf: !!selfClosing,
			prefix: ""
		} : {
			id: nodes.length,
			label: expression,
			kind: "expression",
			leaf: true,
			prefix: prefix + "{"
		};
		nodes.push(node);
		if (node.leaf) tokens.push({
			kind: "leaf",
			id: node.id
		});
		else {
			open.push(node);
			tokens.push({
				kind: "open",
				id: node.id
			});
		}
	}
	text(source.length);
	return {
		tokens,
		nodes
	};
};
/** Split a translation into text and the nodes of its source. */
const tokenizeTranslation = (translation, nodes) => {
	const candidates = /* @__PURE__ */ new Map();
	const add = (text, kind, id) => {
		const entry = candidates.get(text) ?? {
			kind,
			ids: []
		};
		entry.ids.push(id);
		candidates.set(text, entry);
	};
	for (const node of nodes) if (node.kind === "expression") add(`${node.prefix}${node.label}}`, "leaf", node.id);
	else if (node.leaf) {
		add(`<${node.label}/>`, "leaf", node.id);
		add(`<${node.label} />`, "leaf", node.id);
		add(`<${node.label}>`, "leaf", node.id);
	} else {
		add(`<${node.label}>`, "open", node.id);
		add(`</${node.label}>`, "close", node.id);
	}
	const texts = [...candidates.keys()].toSorted((a, b) => b.length - a.length);
	const tokens = [];
	let text = "";
	for (let i = 0; i < translation.length; i++) {
		const char = translation[i];
		if (char === "<" || char === "{" || char === "$") {
			const found = texts.find((t) => translation.startsWith(t, i));
			if (found) {
				const entry = candidates.get(found);
				if (text) {
					tokens.push({
						kind: "text",
						text
					});
					text = "";
				}
				tokens.push({
					kind: entry.kind,
					id: entry.ids[0]
				});
				if (entry.kind !== "close") entry.ids.push(entry.ids.shift());
				i += found.length - 1;
				continue;
			}
		}
		text += char;
	}
	if (text) tokens.push({
		kind: "text",
		text
	});
	return tokens;
};
/** Build the render tree. Returns an error when the nodes of the source
* are not all used exactly once. */
const buildTree = (tokens, nodes, decode = (text) => text) => {
	const root = [];
	const stack = [{ children: root }];
	const used = /* @__PURE__ */ new Map();
	const use = (id) => used.set(id, (used.get(id) ?? 0) + 1);
	const describe = (id) => {
		const node = nodes[id];
		return node.kind === "element" ? `<${node.label}>` : `${node.prefix}${node.label}}`;
	};
	for (const token of tokens) {
		const parent = stack.at(-1);
		if (token.kind === "text") {
			const last = parent.children.at(-1);
			if (typeof last === "string") parent.children[parent.children.length - 1] = last + decode(token.text);
			else parent.children.push(decode(token.text));
		} else if (token.kind === "leaf") {
			use(token.id);
			parent.children.push([token.id]);
		} else if (token.kind === "open") {
			use(token.id);
			const children = [];
			parent.children.push([token.id, children]);
			stack.push({
				id: token.id,
				children
			});
		} else if (parent.id === token.id) stack.pop();
		else return { error: `unexpected closing tag for ${describe(token.id)}` };
	}
	if (stack.length > 1) return { error: `missing closing tag for ${describe(stack.at(-1).id)}` };
	for (const node of nodes) {
		const count = used.get(node.id) ?? 0;
		if (count !== 1) return { error: `${describe(node.id)} is ${count === 0 ? "missing" : "used more than once"}` };
	}
	return { tree: root };
};
/** Check that a translation keeps every tag and placeholder of its source.
* Returns the problem, or nothing when the translation is fine. */
const validateTranslation = (source, translation) => {
	const { nodes } = parseSource(source);
	if (nodes.length === 0) return;
	return buildTree(tokenizeTranslation(translation, nodes), nodes).error;
};
//#endregion
//#region src/component.ts
const ENTITIES = {
	lt: "<",
	gt: ">",
	amp: "&",
	quot: "\"",
	apos: "'",
	nbsp: "\xA0"
};
const decodeEntities = (text) => {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
		if (entity[0] === "#") {
			const hex = entity[1] === "x" || entity[1] === "X";
			return String.fromCodePoint(parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10));
		}
		return ENTITIES[entity.toLowerCase()] ?? match;
	});
};
/** Rewrite a <T> into the T component with a render tree per locale and a
* snippet per node of the original markup. */
const rewriteComponent = (match, locales, cache, inline, warn) => {
	const { tokens, nodes } = parseSource(match.source);
	const trees = { src: buildTree(tokens, nodes, decodeEntities).tree };
	for (const locale of locales) {
		const translation = cache.get(match, locale);
		if (typeof translation !== "string" || translation === match.source) continue;
		const result = buildTree(tokenizeTranslation(translation, nodes), nodes, decodeEntities);
		if (result.error !== void 0) {
			warn(`Skipped the "${locale}" translation of "${match.source}": ${result.error}`);
			continue;
		}
		trees[locale] = result.tree;
	}
	const snippets = match.snippets.map((markup, id) => {
		return `{#snippet n${id}(${nodes[id].leaf ? "" : "__children"})}${inline(markup)}{/snippet}`;
	});
	return `<T tree={${JSON.stringify(trees)}}>${snippets.join("")}</T>`;
};
//#endregion
//#region src/diff.ts
const findNewTranslations = (cache, keys, locales) => {
	const list = [];
	for (const key of keys) for (const locale of locales) if (!cache.has(key, locale)) list.push({
		...key,
		locale
	});
	return list;
};
const removeUnusedTranslations = (cache, keys, locales) => {
	const used = new Set(keys.map((key) => `${key.context ?? ""}\n${key.source}`));
	for (const item of cache.entries()) if (!locales.includes(item.locale) || !used.has(`${item.context ?? ""}\n${item.source}`)) cache.delete(item, item.locale);
};
//#endregion
//#region src/find/svelte.ts
const ELEMENTS = /* @__PURE__ */ new Set([
	"RegularElement",
	"SvelteElement",
	"Component",
	"SvelteComponent",
	"SvelteSelf",
	"SvelteFragment",
	"SvelteBoundary",
	"TitleElement",
	"SlotElement"
]);
const LEAVES = /* @__PURE__ */ new Set([
	"ExpressionTag",
	"HtmlTag",
	"RenderTag"
]);
const collapse = (text) => text.replace(/\s+/g, " ");
const parseSvelte = (code) => {
	const templates = [];
	const components = [];
	const ast = parse(code, { modern: true });
	const enter = (node) => {
		if (node.type === "TaggedTemplateExpression" && node.tag.type === "MemberExpression" && node.tag.object.type === "Identifier" && node.tag.object.name === "lang" && node.tag.property.type === "Identifier" && node.tag.property.name === "t") {
			const quasi = node.quasi;
			templates.push(code.slice(quasi.start + 1, quasi.end - 1));
		}
	};
	walk(ast.fragment, { enter(node) {
		enter(node);
		const component = node;
		if (component.type === "Component" && component.name === "T") components.push(extract(code, component));
	} });
	if (ast.instance) walk(ast.instance.content, { enter });
	if (ast.module) walk(ast.module.content, { enter });
	return {
		templates,
		components
	};
};
const extract = (code, component) => {
	const { start, end } = component;
	const snippets = [];
	const labels = /* @__PURE__ */ new Map();
	const label = (part, key) => {
		const list = labels.get(key) ?? [];
		list.push(part);
		labels.set(key, list);
	};
	const collect = (nodes) => {
		const parts = [];
		for (const node of nodes) if (node.type === "Text") parts.push(collapse(node.raw));
		else if (node.type === "Comment") continue;
		else if (LEAVES.has(node.type)) {
			const expression = collapse(code.slice(node.start + 1, node.end - 1));
			const part = {
				kind: "leaf",
				id: snippets.length,
				label: expression,
				prefix: "{"
			};
			snippets.push(code.slice(node.start, node.end));
			label(part, "{" + (/[{}]/.test(expression) ? "expr" : expression));
			parts.push(part);
		} else if (ELEMENTS.has(node.type)) {
			if (node.name === "T") return "nested <T> components are not supported";
			const id = snippets.length;
			snippets.push("");
			const children = collect(node.fragment.nodes);
			if (typeof children === "string") return children;
			if (children.length === 0) {
				const part = {
					kind: "leaf",
					id,
					label: node.name,
					prefix: "<"
				};
				snippets[id] = code.slice(node.start, node.end);
				label(part, "<" + node.name);
				parts.push(part);
			} else {
				const first = node.fragment.nodes[0];
				const last = node.fragment.nodes.at(-1);
				const part = {
					kind: "element",
					id,
					label: node.name,
					children
				};
				snippets[id] = code.slice(node.start, first.start) + "{@render __children()}" + code.slice(last.end, node.end);
				label(part, "<" + node.name);
				parts.push(part);
			}
		} else return `{${node.type.endsWith("Tag") ? "@" : "#"}${node.type.replace(/Block$|Tag$/, "").toLowerCase()}} is not supported inside <T>`;
		return trim(parts);
	};
	const context = readContext(component);
	if (typeof context === "object") return {
		start,
		end,
		error: context.error
	};
	const parts = collect(component.fragment.nodes);
	if (typeof parts === "string") return {
		start,
		end,
		error: parts
	};
	for (const [key, list] of labels) {
		const name = key.slice(1);
		if (new Set(list.map((part) => snippets[part.id])).size > 1 || key[0] === "<" && list.length > 1) list.forEach((part, index) => {
			part.label = `${name}_${index + 1}`;
		});
		else list.forEach((part) => {
			part.label = name;
		});
	}
	return {
		start,
		end,
		source: serialize(parts),
		snippets,
		context
	};
};
const readContext = (component) => {
	let context;
	for (const attribute of component.attributes ?? []) {
		if (attribute.type !== "Attribute" || attribute.name !== "context") return { error: `<T> only supports the context attribute` };
		const value = Array.isArray(attribute.value) ? attribute.value : [attribute.value];
		if (value.length !== 1 || typeof value[0] !== "object" || value[0].type !== "Text") return { error: `the context of a <T> must be plain text` };
		context = collapse(value[0].data).trim();
	}
	return context;
};
const trim = (parts) => {
	const merged = [];
	for (const part of parts) {
		const last = merged.at(-1);
		if (typeof part === "string" && typeof last === "string") merged[merged.length - 1] = collapse(last + part);
		else merged.push(part);
	}
	const first = merged[0];
	if (typeof first === "string") merged[0] = first.trimStart();
	const last = merged.at(-1);
	if (typeof last === "string") merged[merged.length - 1] = last.trimEnd();
	return merged.filter((part) => part !== "");
};
const serialize = (parts) => {
	return parts.map((part) => {
		if (typeof part === "string") return part;
		if (part.kind === "leaf") return part.prefix === "<" ? `<${part.label}/>` : `{${part.label}}`;
		return `<${part.label}>${serialize(part.children)}</${part.label}>`;
	}).join("");
};
const findSvelteTranslatable = (code) => {
	const { templates, components } = parseSvelte(code);
	return [...templates.map((source) => ({ source })), ...components.filter((match) => !match.error && match.source).map((match) => ({
		source: match.source,
		context: match.context
	}))];
};
//#endregion
//#region src/find/typescript.ts
const findTypescriptTranslatable = (code) => {
	const found = [];
	const ast = parseSync("module.ts", code);
	walk(ast.program, { enter(node) {
		if (node.type === "TaggedTemplateExpression" && node.tag.type === "MemberExpression" && node.tag.object.type === "Identifier" && node.tag.object.name === "lang" && node.tag.property.type === "Identifier" && node.tag.property.name === "t") {
			const quasi = node.quasi;
			found.push({ source: code.slice(quasi.start + 1, quasi.end - 1) });
		}
	} });
	return found;
};
//#endregion
//#region src/find.ts
const isIgnoredPath = (file) => /[\\/](node_modules|\.[^\\/]+)[\\/]/.test(file);
const hasTemplates = (code) => code.includes("lang.t`");
const hasComponents = (file, code) => file.endsWith(".svelte") && /<T[\s/>]/.test(code);
const findTranslatable = async (cwd) => {
	const files = await glob("**/*.{js,ts,svelte}", {
		cwd,
		ignore: ["**/node_modules/**", "**/.*/**"]
	});
	const found = [];
	for (const file of files) found.push(...findTranslatableInCode(file, await readFile(join(cwd, file), "utf8")));
	return dedupe(found);
};
const dedupe = (list) => {
	const found = /* @__PURE__ */ new Map();
	for (const item of list) found.set(`${item.context ?? ""}\n${item.source}`, item);
	return [...found.values()];
};
const findTranslatableInCode = (file, code) => {
	if (!hasTemplates(code) && !hasComponents(file, code)) return [];
	return file.endsWith(".svelte") ? findSvelteTranslatable(code) : findTypescriptTranslatable(code);
};
//#endregion
//#region src/vite.ts
const SOURCE_FILE = /\.(svelte|ts|js)$/;
const parseComponents = (code) => {
	try {
		return parseSvelte(code).components;
	} catch {
		return [];
	}
};
const i18n = (props) => {
	let cache;
	let generatedCache;
	let overrideCache;
	let queue = Promise.resolve();
	const translateMissing = (cwd, sourceTexts, log) => {
		queue = queue.catch(() => {}).then(() => translateNow(cwd, sourceTexts, log));
		return queue;
	};
	const translateNow = async (cwd, sourceTexts, log) => {
		const newSourceTexts = findNewTranslations(cache, sourceTexts, props.locales);
		if (newSourceTexts.length > 0) {
			log.info(`Translating ${newSourceTexts.length} new texts.`);
			const translations = await props.translate(props.default ?? "en", newSourceTexts);
			log.info(`Translated ${translations.length} texts.`);
			for (const item of translations) {
				const error = validateTranslation(item.source, item.translation);
				if (error) {
					log.warn(`Skipped the "${item.locale}" translation of "${item.source}": ${error}`);
					continue;
				}
				generatedCache.set(item, item.locale, item.translation);
			}
		}
		cache = mergeCaches(generatedCache, overrideCache);
		await saveCache(cwd, generatedCache);
	};
	const templateReplacement = (source) => {
		return `lang.t.get(\`${source}\`, {${props.locales.map((locale) => {
			const translation = cache.get({ source }, locale);
			if (typeof translation !== "string" || translation === source) return;
			return `"${locale}":\`${translation}\``;
		}).filter((v) => !!v).join(",")}})`;
	};
	const inlineTemplates = (code) => {
		if (!hasTemplates(code)) return code;
		for (const { source, context } of cache.keys()) {
			if (context) continue;
			code = code.replaceAll(`lang.t\`${source}\``, templateReplacement(source));
		}
		return code;
	};
	return {
		name: "awsless/i18n",
		enforce: "pre",
		async buildStart() {
			const cwd = process.cwd();
			this.info("Finding all translatable text...");
			const sourceTexts = await findTranslatable(cwd);
			generatedCache = await loadGeneratedCache(cwd);
			overrideCache = await loadOverrideCache(cwd);
			removeUnusedTranslations(generatedCache, sourceTexts, props.locales);
			cache = mergeCaches(generatedCache, overrideCache);
			await translateMissing(cwd, sourceTexts, {
				info: (message) => this.info(message),
				warn: (message) => this.warn(message)
			});
			this.info(`Translating done.`);
		},
		async hotUpdate({ file, read }) {
			if (!cache || !SOURCE_FILE.test(file) || isIgnoredPath(file)) return;
			const sourceTexts = dedupe(findTranslatableInCode(file, await read()));
			if (sourceTexts.length > 0) {
				const logger = this.environment.logger;
				await translateMissing(process.cwd(), sourceTexts, {
					info: (message) => logger.info(message),
					warn: (message) => logger.warn(message)
				});
			}
		},
		transform(code, id) {
			const file = id?.split("?")[0] ?? "";
			const templates = hasTemplates(code);
			const components = hasComponents(file, code);
			if (!templates && !components) return;
			const transformedCode = new MagicString(code);
			if (templates) {
				for (const { source, context } of cache.keys()) if (!context) transformedCode.replaceAll(`lang.t\`${source}\``, templateReplacement(source));
			}
			if (components) {
				for (const match of parseComponents(code)) if (match.error) this.warn(`${match.error} (${file})`);
				else if (match.source) transformedCode.overwrite(match.start, match.end, rewriteComponent(match, props.locales, cache, inlineTemplates, (message) => this.warn(message)));
			}
			return {
				code: transformedCode.toString(),
				map: transformedCode.generateMap({ hires: true })
			};
		}
	};
};
//#endregion
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
