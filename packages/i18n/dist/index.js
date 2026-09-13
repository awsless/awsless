import { extname } from "node:path";
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
//#region src/t.ts
const range = (node) => node;
const hasT = (code) => /<T[\s/>]/.test(code);
const PRESERVE = /* @__PURE__ */ new Set(["pre", "textarea"]);
const ASCII_SPACE = /[ \t\n\r\f]+/g;
const isBlank = (node) => node.type === "Comment" || node.type === "Text" && node.data.trim() === "";
const parseT = (code, file) => {
	const ast = parse(code, { modern: true });
	const components = [];
	const preserveAll = ast.options?.preserveWhitespace === true;
	const fail = (offset, message) => {
		const position = lineColumn(code).fromIndex(offset);
		return /* @__PURE__ */ new Error(`${file ?? "component"}:${position?.line ?? 0}: ${message}`);
	};
	const blockBodies = (node) => {
		switch (node.type) {
			case "IfBlock": {
				const first = node.alternate?.nodes[0];
				const rest = !node.alternate ? [] : first?.type === "IfBlock" && first.elseif ? blockBodies(first) : [node.alternate.nodes];
				return [node.consequent.nodes, ...rest];
			}
			case "EachBlock": return node.fallback ? [node.body.nodes, node.fallback.nodes] : [node.body.nodes];
			case "AwaitBlock": return [
				node.pending,
				node.then,
				node.catch
			].flatMap((body) => body ? [body.nodes] : []);
			case "KeyBlock": return [node.fragment.nodes];
			case "SnippetBlock": return [node.body.nodes];
		}
	};
	const build = (nodes, preserve) => {
		const pieces = [];
		const expressions = [];
		const nested = [];
		let tags = 0;
		const visit = (nodes, preserve) => {
			for (const node of nodes) switch (node.type) {
				case "Text":
					pieces.push({
						start: node.start,
						end: node.end,
						token: {
							type: "text",
							value: node.data,
							preserve
						}
					});
					break;
				case "Comment": break;
				case "ExpressionTag":
					pieces.push({
						start: node.start,
						end: node.end,
						token: {
							type: "expr",
							index: expressions.length
						}
					});
					expressions.push(code.slice(range(node.expression).start, range(node.expression).end));
					break;
				case "HtmlTag":
				case "RenderTag":
				case "ConstTag":
				case "DebugTag":
				case "AttachTag":
				case "DeclarationTag":
					pieces.push({
						start: node.start,
						end: node.end,
						token: {
							type: "self",
							n: ++tags
						}
					});
					break;
				case "IfBlock":
				case "EachBlock":
				case "AwaitBlock":
				case "KeyBlock":
				case "SnippetBlock":
					pieces.push({
						start: node.start,
						end: node.end,
						token: {
							type: "self",
							n: ++tags
						}
					});
					for (const body of blockBodies(node)) nested.push(...build(body, preserve));
					break;
				default: {
					if (node.type === "Component" && node.name === "T") throw fail(node.start, "nested <T> is not supported inside <T>");
					const n = ++tags;
					const first = node.fragment.nodes[0];
					const last = node.fragment.nodes.at(-1);
					if (first && last) {
						pieces.push({
							start: node.start,
							end: first.start,
							token: {
								type: "open",
								n
							}
						});
						visit(node.fragment.nodes, preserve || PRESERVE.has(node.name));
						pieces.push({
							start: last.end,
							end: node.end,
							token: {
								type: "close",
								n
							}
						});
					} else pieces.push({
						start: node.start,
						end: node.end,
						token: {
							type: "self",
							n
						}
					});
				}
			}
		};
		visit(nodes, preserve);
		return [segment(normalize(pieces), expressions), ...nested];
	};
	collect(ast.fragment.nodes, preserveAll, (node, wrap, nodes, preserve) => {
		components.push({
			start: node.start,
			end: node.end,
			wrap,
			segments: nodes ? build(nodes, preserve) : []
		});
	});
	return {
		ast,
		components
	};
};
const collect = (nodes, preserve, found) => {
	for (const node of nodes) {
		if (node.type === "Component" && node.name === "T") {
			const children = node.fragment.nodes;
			const content = children.filter((child) => !isBlank(child));
			const only = content.length === 1 ? content[0] : void 0;
			const body = only?.type === "SnippetBlock" && only.expression.name === "children" ? only.body.nodes : children;
			const first = body[0];
			const last = body.at(-1);
			if (first && last) found(node, {
				open: {
					start: node.start,
					end: first.start
				},
				close: {
					start: last.end,
					end: node.end
				}
			}, body, preserve);
			else found(node, void 0, void 0, preserve);
			continue;
		}
		const inside = preserve || "name" in node && typeof node.name === "string" && PRESERVE.has(node.name);
		for (const key of [
			"fragment",
			"consequent",
			"alternate",
			"body",
			"fallback",
			"pending",
			"then",
			"catch"
		]) {
			const fragment = node[key];
			if (fragment?.type === "Fragment") collect(fragment.nodes, inside, found);
		}
	}
};
const normalize = (pieces) => {
	const merged = [];
	for (const piece of pieces) {
		const previous = merged.at(-1);
		if (piece.token.type === "text" && previous?.token.type === "text") {
			previous.token.value += piece.token.value;
			previous.end = piece.end;
		} else merged.push({
			...piece,
			token: { ...piece.token }
		});
	}
	const first = merged[0]?.token;
	const last = merged.at(-1)?.token;
	for (const { token } of merged) if (token.type === "text" && !token.preserve) token.value = token.value.replace(ASCII_SPACE, " ");
	if (first?.type === "text" && !first.preserve) first.value = first.value.replace(/^[ \t\n\r\f]+/, "");
	if (last?.type === "text" && !last.preserve) last.value = last.value.replace(/[ \t\n\r\f]+$/, "");
	return merged.filter((piece) => piece.token.type !== "text" || piece.token.value !== "");
};
const isRunToken = (token) => token.type === "text" || token.type === "expr";
const segment = (pieces, expressions) => {
	const tokens = pieces.map((piece) => piece.token);
	const runs = [];
	if (pieces.length === 0) return {
		source: "",
		tokens,
		expressions,
		runs
	};
	let current = [];
	let boundary = pieces[0].start;
	const flush = (next) => {
		const first = current[0];
		const last = current.at(-1);
		runs.push(first && last ? {
			start: first.start,
			end: last.end,
			tokens: current.map((piece) => piece.token)
		} : {
			start: boundary,
			end: boundary,
			tokens: []
		});
		current = [];
		boundary = next;
	};
	for (const piece of pieces) if (isRunToken(piece.token)) current.push(piece);
	else flush(piece.end);
	flush(boundary);
	return {
		source: serialize(tokens),
		tokens,
		expressions,
		runs
	};
};
const findTComponents = (code, file) => parseT(code, file).components;
const collectSources = (component) => component.segments.map((segment) => segment.source).filter((source) => source !== "");
const escapeText = (text) => text.replace(/[\\$<>]/g, (char) => `\\${char}`);
const serialize = (tokens) => tokens.map((token) => {
	switch (token.type) {
		case "text": return escapeText(token.value);
		case "expr": return `\${${token.index}}`;
		case "open": return `<${token.n}>`;
		case "close": return `</${token.n}>`;
		case "self": return `<${token.n}/>`;
	}
}).join("");
const tokenize = (text) => {
	const tokens = [];
	let buffer = "";
	let i = 0;
	const flush = () => {
		if (buffer !== "") {
			tokens.push({
				type: "text",
				value: buffer,
				preserve: false
			});
			buffer = "";
		}
	};
	while (i < text.length) {
		const char = text[i];
		if (char === "\\" && i + 1 < text.length) {
			buffer += text[i + 1];
			i += 2;
			continue;
		}
		const placeholder = char === "$" ? /^\$\{(\d+)\}/.exec(text.slice(i)) : null;
		if (placeholder) {
			flush();
			tokens.push({
				type: "expr",
				index: Number(placeholder[1])
			});
			i += placeholder[0].length;
			continue;
		}
		const tag = char === "<" ? /^<(\/?)(\d+)\s*(\/?)>/.exec(text.slice(i)) : null;
		if (tag && !(tag[1] && tag[3])) {
			flush();
			tokens.push({
				type: tag[1] ? "close" : tag[3] ? "self" : "open",
				n: Number(tag[2])
			});
			i += tag[0].length;
			continue;
		}
		buffer += char;
		i++;
	}
	flush();
	return tokens;
};
const splitRuns = (tokens) => {
	const runs = [[]];
	const tags = [];
	for (const token of tokens) if (isRunToken(token)) runs.at(-1).push(token);
	else {
		tags.push(`${token.type}${token.n}`);
		runs.push([]);
	}
	return {
		tags,
		runs
	};
};
const placeholdersOf = (tokens) => tokens.flatMap((token) => token.type === "expr" ? [token.index] : []).toSorted((a, b) => a - b).join(" ");
/** Returns what is wrong with the translation, or nothing when it keeps
* the tags of the source in order and every placeholder in its own run. */
const validateTranslation = (source, translation) => {
	const expected = splitRuns(tokenize(source));
	const actual = splitRuns(tokenize(translation));
	if (expected.tags.join(" ") !== actual.tags.join(" ")) return "the numbered tags differ from the source";
	for (const [index, run] of expected.runs.entries()) if (placeholdersOf(run) !== placeholdersOf(actual.runs[index])) return "a placeholder is missing, duplicated or moved across a tag";
};
const partsOf = (tokens, positions) => tokens.map((token) => {
	if (token.type === "text") return token.value;
	if (token.type !== "expr" || !positions.has(token.index)) throw new Error(`Translation references ${serialize([token])} which is not in this run of the source.`);
	return positions.get(token.index);
});
/** The edits turning a <T> into an `{#if true}` block with translated text
* runs, and whether any of them calls the runtime. An edit without text
* removes, one without length inserts. */
const transformT = (component, locales, lookup, warn) => {
	const edits = [];
	let translated = false;
	if (!component.wrap) return {
		edits: [{
			start: component.start,
			end: component.end,
			text: ""
		}],
		translated
	};
	edits.push({
		...component.wrap.open,
		text: "{#if true}"
	});
	edits.push({
		...component.wrap.close,
		text: "{/if}"
	});
	for (const segment of component.segments) {
		if (segment.source === "") continue;
		const translations = [];
		for (const locale of locales) {
			const translation = lookup(segment.source, locale);
			if (translation === void 0 || translation === segment.source) continue;
			const problem = validateTranslation(segment.source, translation);
			if (problem) {
				warn(`Skipped the "${locale}" translation of "${segment.source}": ${problem}.`);
				continue;
			}
			translations.push({
				locale,
				runs: splitRuns(tokenize(translation)).runs
			});
		}
		if (translations.length === 0) continue;
		for (const [index, run] of segment.runs.entries()) {
			const indices = run.tokens.flatMap((token) => token.type === "expr" ? [token.index] : []);
			const positions = new Map(indices.map((expression, position) => [expression, position]));
			const source = JSON.stringify(partsOf(run.tokens, positions));
			const changed = translations.flatMap((item) => {
				const parts = JSON.stringify(partsOf(item.runs[index], positions));
				return parts === source ? [] : [`"${item.locale}":${parts}`];
			});
			if (changed.length === 0) continue;
			const values = indices.length > 0 ? `, [${indices.map((i) => segment.expressions[i]).join(", ")}]` : "";
			edits.push({
				start: run.start,
				end: run.end,
				text: `{__i18n_lang.t.pick(${source}, {${changed.join(",")}}${values})}`
			});
			translated = true;
		}
	}
	return {
		edits,
		translated
	};
};
//#endregion
//#region src/find/svelte.ts
const findSvelteTranslatable = (code, file) => {
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
	if (hasT(code)) for (const component of findTComponents(code, file)) found.push(...collectSources(component));
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
const isIgnoredPath = (file) => /[\\/](node_modules|\.[^\\/]+)[\\/]/.test(file);
const findTranslatable = async (cwd) => {
	const files = await glob("**/*.{js,ts,svelte}", {
		cwd,
		ignore: ["**/node_modules/**", "**/.*/**"]
	});
	const found = [];
	for (const file of files) found.push(...await findTranslatableInCode(file, await readFile(join(cwd, file), "utf8")));
	return found;
};
const findTranslatableInCode = async (file, code) => {
	const svelte = file.endsWith(".svelte");
	if (!code.includes("lang.t`") && !(svelte && hasT(code))) return [];
	return svelte ? findSvelteTranslatable(code, file) : findTypescriptTranslatable(code);
};
//#endregion
//#region src/vite.ts
const SOURCE_FILE = /\.(svelte|ts|js)$/;
const LANG_IMPORT = "import { lang as __i18n_lang } from '@awsless/i18n/svelte'";
const isSvelteFile = (id = "") => extname(id.split("?")[0]) === ".svelte";
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
				const problem = validateTranslation(item.source, item.translation);
				if (problem) {
					log.warn(`Skipped the "${item.locale}" translation of "${item.source}": ${problem}.`);
					continue;
				}
				generatedCache.set(item.source, item.locale, item.translation);
			}
		}
		cache = mergeCaches(generatedCache, overrideCache);
		await saveCache(cwd, generatedCache);
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
			const sourceTexts = await findTranslatableInCode(file, await read());
			if (sourceTexts.length > 0) await translateMissing(process.cwd(), sourceTexts, this.environment.logger);
		},
		transform(code, id) {
			const withLangT = code.includes("lang.t`");
			const withT = isSvelteFile(id) && hasT(code);
			if (!withLangT && !withT) return;
			const sources = /* @__PURE__ */ new Set();
			for (const item of cache.entries()) sources.add(item.source);
			const langT = (source) => {
				return `lang.t.get(\`${source}\`, {${props.locales.map((locale) => {
					const translation = cache.get(source, locale);
					if (translation === void 0 || translation === source) return;
					return `"${locale}":\`${translation}\``;
				}).filter((v) => !!v).join(",")}})`;
			};
			const rewriteLangT = (text) => {
				for (const source of sources) text = text.split(`lang.t\`${source}\``).join(langT(source));
				return text;
			};
			const transformedCode = new MagicString(code);
			const replaced = [];
			if (withT) {
				const { ast, components } = parseT(code, id);
				const lookup = (source, locale) => cache.get(source, locale);
				let called = false;
				for (const component of components) {
					const result = transformT(component, props.locales, lookup, (message) => this.warn(message));
					called ||= result.translated;
					for (const edit of result.edits) if (edit.text === "") {
						if (edit.end > edit.start) transformedCode.remove(edit.start, edit.end);
					} else if (edit.start === edit.end) transformedCode.appendLeft(edit.start, rewriteLangT(edit.text));
					else {
						transformedCode.overwrite(edit.start, edit.end, rewriteLangT(edit.text));
						replaced.push(edit);
					}
				}
				if (called) {
					if (ast.instance) {
						const { start } = ast.instance.content;
						const first = ast.instance.content.body[0];
						const sameLine = !code.slice(start, first?.start ?? start).includes("\n");
						transformedCode.appendLeft(start, `${LANG_IMPORT}${sameLine ? ";\n" : ""}`);
					} else transformedCode.prepend(`<script>\n\t${LANG_IMPORT}\n<\/script>\n`);
				}
			}
			if (withLangT) for (const source of sources) {
				const pattern = `lang.t\`${source}\``;
				let index = code.indexOf(pattern);
				while (index !== -1) {
					if (!replaced.some((item) => index >= item.start && index < item.end)) transformedCode.overwrite(index, index + pattern.length, langT(source));
					index = code.indexOf(pattern, index + pattern.length);
				}
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
					"Keep every numbered <n>...</n> or <n/> tag in the same order and nesting as the source, and keep every ${n} placeholder inside the same tag it came from. Translate only the text around them.",
					"A backslash escapes a literal character: \\$ \\< \\> and \\\\ stand for $, <, > and a backslash. Keep those escapes as they are.",
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
