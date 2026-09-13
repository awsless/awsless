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
const collapse = (text) => text.replace(/[ \t\n\r\f]+/g, " ");
const PRESERVE = /* @__PURE__ */ new Set(["pre", "textarea"]);
const isBlank = (node) => node.type === "Comment" || node.type === "Text" && node.data.trim() === "";
const parseT = (code, file) => {
	const ast = parse(code, { modern: true });
	const components = [];
	const preserveAll = ast.options?.preserveWhitespace === true;
	const fail = (offset, message) => {
		const position = lineColumn(code).fromIndex(offset);
		return /* @__PURE__ */ new Error(`${file ?? "component"}:${position?.line ?? 0}: ${message}`);
	};
	const tagEnd = (node) => {
		const first = node.fragment.nodes[0];
		if (first) return first.start;
		const last = node.attributes.at(-1);
		return code.indexOf(">", last ? last.end : node.start + node.name.length + 1) + 1;
	};
	const blockBodies = (node) => {
		const bodies = [];
		let closeStart = node.end;
		const afterBrace = (from) => code.indexOf("}", from) + 1;
		const separator = (keyword, body, next) => code.lastIndexOf(`{:${keyword}`, body.nodes[0]?.start ?? next);
		switch (node.type) {
			case "IfBlock": {
				closeStart = code.lastIndexOf("{/if", node.end);
				let current = node;
				while (true) {
					bodies.push({
						sepStart: current.elseif ? current.start : void 0,
						bodyStart: afterBrace(range(current.test).end),
						nodes: current.consequent.nodes
					});
					const alternate = current.alternate;
					const first = alternate?.nodes[0];
					if (!alternate) break;
					if (first?.type === "IfBlock" && first.elseif) {
						current = first;
						continue;
					}
					const sepStart = separator("else", alternate, closeStart);
					bodies.push({
						sepStart,
						bodyStart: afterBrace(sepStart),
						nodes: alternate.nodes
					});
					break;
				}
				break;
			}
			case "EachBlock": {
				closeStart = code.lastIndexOf("{/each", node.end);
				const anchor = Math.max(range(node.expression).end, node.context ? range(node.context).end : 0, node.key ? range(node.key).end : 0);
				bodies.push({
					bodyStart: afterBrace(anchor),
					nodes: node.body.nodes
				});
				if (node.fallback) {
					const sepStart = separator("else", node.fallback, closeStart);
					bodies.push({
						sepStart,
						bodyStart: afterBrace(sepStart),
						nodes: node.fallback.nodes
					});
				}
				break;
			}
			case "AwaitBlock": {
				closeStart = code.lastIndexOf("{/await", node.end);
				const order = [
					"pending",
					"then",
					"catch"
				].filter((key) => node[key]);
				const patternOf = (key) => key === "then" ? node.value : key === "catch" ? node.error : null;
				let next = closeStart;
				for (let i = order.length - 1; i >= 0; i--) {
					const key = order[i];
					const body = node[key];
					const pattern = patternOf(key);
					if (i === 0) {
						const anchor = Math.max(range(node.expression).end, pattern ? range(pattern).end : 0);
						bodies.unshift({
							bodyStart: afterBrace(anchor),
							nodes: body.nodes
						});
					} else {
						const sepStart = separator(key, body, next);
						const anchor = pattern && range(pattern).start > sepStart ? range(pattern).end : sepStart;
						bodies.unshift({
							sepStart,
							bodyStart: afterBrace(anchor),
							nodes: body.nodes
						});
						next = sepStart;
					}
				}
				break;
			}
			case "KeyBlock":
				closeStart = code.lastIndexOf("{/key", node.end);
				bodies.push({
					bodyStart: afterBrace(range(node.expression).end),
					nodes: node.fragment.nodes
				});
				break;
			case "SnippetBlock": {
				closeStart = code.lastIndexOf("{/snippet", node.end);
				const anchor = Math.max(range(node.expression).end, ...node.parameters.map((p) => range(p).end));
				bodies.push({
					bodyStart: afterBrace(anchor),
					nodes: node.body.nodes
				});
				break;
			}
		}
		return bodies.map((body, index) => ({
			nodes: body.nodes,
			start: body.bodyStart,
			end: bodies[index + 1]?.sepStart ?? closeStart
		}));
	};
	const segments = (body, preserve) => {
		const items = [];
		const expressions = [];
		const nested = [];
		let tags = 0;
		let run = {
			start: body.start,
			text: "",
			preserve
		};
		const open = (position, preserve) => {
			run = {
				start: position,
				text: "",
				preserve
			};
		};
		const close = (position) => {
			items.push({ run: {
				...run,
				end: position,
				source: ""
			} });
		};
		const visit = (nodes, preserve) => {
			for (const node of nodes) switch (node.type) {
				case "Text":
					run.text += node.data;
					break;
				case "Comment": break;
				case "ExpressionTag":
					run.text += `\${${expressions.length}}`;
					expressions.push(code.slice(range(node.expression).start, range(node.expression).end));
					break;
				case "HtmlTag":
				case "RenderTag":
				case "ConstTag":
				case "DebugTag":
				case "AttachTag":
				case "DeclarationTag":
					close(node.start);
					items.push({ tag: `<${++tags}/>` });
					open(node.end, preserve);
					break;
				case "IfBlock":
				case "EachBlock":
				case "AwaitBlock":
				case "KeyBlock":
				case "SnippetBlock":
					close(node.start);
					items.push({ tag: `<${++tags}/>` });
					for (const branch of blockBodies(node)) nested.push(...segments(branch, preserve));
					open(node.end, preserve);
					break;
				default: {
					if (node.type === "Component" && node.name === "T") throw fail(node.start, "nested <T> is not supported inside <T>");
					const number = ++tags;
					const last = node.fragment.nodes.at(-1);
					close(node.start);
					if (last) {
						items.push({ tag: `<${number}>` });
						open(tagEnd(node), preserve || PRESERVE.has(node.name));
						visit(node.fragment.nodes, preserve || PRESERVE.has(node.name));
						close(last.end);
						items.push({ tag: `</${number}>` });
					} else items.push({ tag: `<${number}/>` });
					open(node.end, preserve);
				}
			}
		};
		visit(body.nodes, preserve);
		close(body.end);
		const runs = items.flatMap((item) => "run" in item ? [item.run] : []);
		const first = runs[0];
		const last = runs.at(-1);
		for (const run of runs) run.source = run.preserve ? run.text : collapse(run.text);
		if (!first.preserve) first.source = first.source.trimStart();
		if (!last.preserve) last.source = last.source.trimEnd();
		return [{
			source: items.map((item) => "tag" in item ? item.tag : item.run.source).join(""),
			expressions,
			runs: runs.map(({ start, end, source }) => ({
				start,
				end,
				source
			}))
		}, ...nested];
	};
	const collect = (nodes, preserve) => {
		for (const node of nodes) {
			if (node.type === "Component" && node.name === "T") {
				const children = node.fragment.nodes;
				const content = children.filter((child) => !isBlank(child));
				const only = content.length === 1 ? content[0] : void 0;
				if (children.length === 0) components.push({
					remove: [node],
					segments: []
				});
				else if (only?.type === "SnippetBlock" && only.expression.name === "children") {
					const body = blockBodies(only)[0];
					components.push({
						remove: [{
							start: node.start,
							end: body.start
						}, {
							start: body.end,
							end: node.end
						}],
						segments: segments(body, preserve)
					});
				} else {
					const body = {
						nodes: children,
						start: tagEnd(node),
						end: children.at(-1).end
					};
					components.push({
						remove: [{
							start: node.start,
							end: body.start
						}, {
							start: body.end,
							end: node.end
						}],
						segments: segments(body, preserve)
					});
				}
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
				if (fragment?.type === "Fragment") collect(fragment.nodes, inside);
			}
		}
	};
	collect(ast.fragment.nodes, preserveAll);
	return {
		ast,
		components
	};
};
const findTComponents = (code, file) => parseT(code, file).components;
const collectSources = (component) => component.segments.map((segment) => segment.source).filter((source) => source !== "");
const TOKEN = /\$\{([^{}]*)\}|<(\/?)(\d+)\s*(\/?)>/g;
const shape = (text) => {
	const tags = [];
	const gaps = [{
		text: "",
		placeholders: []
	}];
	let cursor = 0;
	for (const match of text.matchAll(TOKEN)) {
		const gap = gaps.at(-1);
		gap.text += text.slice(cursor, match.index);
		cursor = match.index + match[0].length;
		if (match[1] !== void 0) {
			gap.text += `\${${match[1]}}`;
			gap.placeholders.push(match[1]);
		} else if (match[2] && match[4]) gap.text += match[0];
		else {
			tags.push(match[2] ? `</${match[3]}>` : match[4] ? `<${match[3]}/>` : `<${match[3]}>`);
			gaps.push({
				text: "",
				placeholders: []
			});
		}
	}
	gaps.at(-1).text += text.slice(cursor);
	return {
		tags,
		gaps
	};
};
/** Returns what is wrong with the translation, or nothing when it keeps
* the tags of the source in order and every placeholder in its own run. */
const validateTranslation = (source, translation) => {
	const expected = shape(source);
	const actual = shape(translation);
	if (expected.tags.join("") !== actual.tags.join("")) return "the numbered tags differ from the source";
	for (const [index, gap] of expected.gaps.entries()) {
		const placeholders = actual.gaps[index].placeholders;
		if (gap.placeholders.toSorted().join("\0") !== placeholders.toSorted().join("\0")) return "a placeholder is missing, duplicated or moved across a tag";
	}
};
const escape = (text) => text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const literal = (text, expressions) => {
	return `\`${text.split(/(\$\{\d+\})/).map((part, index) => {
		if (index % 2 === 0) return escape(part);
		const expression = expressions[Number(part.slice(2, -1))];
		if (expression === void 0) throw new Error(`Placeholder ${part} does not exist in the source.`);
		return `\${${expression}}`;
	}).join("")}\``;
};
/** The edits turning a <T> into its children with translated text runs.
* An edit without text removes, one without length inserts. */
const transformT = (component, locales, lookup, warn) => {
	const edits = component.remove.map(({ start, end }) => ({
		start,
		end,
		text: ""
	}));
	for (const segment of component.segments) {
		if (segment.source === "") continue;
		if (shape(segment.source).gaps.length !== segment.runs.length) {
			warn(`Skipped "${segment.source}": its text looks like a placeholder or numbered tag.`);
			continue;
		}
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
				gaps: shape(translation).gaps
			});
		}
		for (const [index, run] of segment.runs.entries()) {
			const changed = translations.filter((item) => item.gaps[index].text !== run.source);
			if (changed.length === 0) continue;
			const values = changed.map((item) => `"${item.locale}":${literal(item.gaps[index].text, segment.expressions)}`);
			edits.push({
				start: run.start,
				end: run.end,
				text: `{lang.t.get(${literal(run.source, segment.expressions)}, {${values.join(",")}})}`
			});
		}
	}
	return edits;
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
const LANG_IMPORT = "import { lang } from '@awsless/i18n/svelte'";
const isSvelteFile = (id = "") => extname(id.split("?")[0]) === ".svelte";
const importsLang = (ast) => {
	for (const script of [ast.instance, ast.module]) for (const node of script?.content.body ?? []) if (node.type === "ImportDeclaration" && node.specifiers.some((item) => item.local.name === "lang")) return true;
	return false;
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
				for (const component of components) for (const edit of transformT(component, props.locales, lookup, (message) => this.warn(message))) if (edit.text === "") {
					if (edit.end > edit.start) transformedCode.remove(edit.start, edit.end);
				} else if (edit.start === edit.end) {
					transformedCode.appendLeft(edit.start, rewriteLangT(edit.text));
					called = true;
				} else {
					transformedCode.overwrite(edit.start, edit.end, rewriteLangT(edit.text));
					replaced.push(edit);
					called = true;
				}
				if (called && !importsLang(ast)) {
					if (ast.instance) {
						const { start } = ast.instance.content;
						transformedCode.appendLeft(start, `\n\t${LANG_IMPORT}`);
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
