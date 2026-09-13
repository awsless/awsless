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
const parseT = (code, file) => {
	const ast = parse(code, { modern: true });
	const components = [];
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
	const segment = (nodes, start, end) => {
		const parts = [];
		let source = "";
		const visit = (nodes) => {
			for (const node of nodes) switch (node.type) {
				case "Text": {
					const text = code.slice(node.start, node.end).replace(/\s+/g, " ");
					source += source.endsWith(" ") && text.startsWith(" ") ? text.slice(1) : text;
					break;
				}
				case "Comment": break;
				case "ExpressionTag":
					source += "${" + code.slice(range(node.expression).start, range(node.expression).end) + "}";
					break;
				case "HtmlTag":
				case "RenderTag":
				case "ConstTag":
				case "DebugTag":
				case "AttachTag":
				case "DeclarationTag":
					parts.push({
						kind: "verbatim",
						source: code.slice(node.start, node.end)
					});
					source += `<${parts.length}/>`;
					break;
				case "IfBlock":
				case "EachBlock":
				case "AwaitBlock":
				case "KeyBlock":
				case "SnippetBlock":
					parts.push({
						kind: "block",
						pieces: blockPieces(node)
					});
					source += `<${parts.length}/>`;
					break;
				default: {
					if (node.type === "Component" && node.name === "T") throw fail(node.start, "nested <T> is not supported inside <T>");
					const number = parts.length + 1;
					const openEnd = tagEnd(node);
					const last = node.fragment.nodes.at(-1);
					parts.push({
						kind: "element",
						node,
						openEnd,
						closeStart: last ? last.end : openEnd
					});
					if (last) {
						source += `<${number}>`;
						visit(node.fragment.nodes);
						source += `</${number}>`;
					} else source += `<${number}/>`;
				}
			}
		};
		visit(nodes);
		return {
			source: source.trim(),
			parts,
			start,
			end
		};
	};
	const blockPieces = (node) => {
		const branches = [];
		let closeStart = node.end;
		const afterBrace = (from) => code.indexOf("}", from) + 1;
		const separator = (keyword, body, next) => code.lastIndexOf(`{:${keyword}`, body.nodes[0]?.start ?? next);
		switch (node.type) {
			case "IfBlock": {
				closeStart = code.lastIndexOf("{/if", node.end);
				let current = node;
				while (true) {
					branches.push({
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
					branches.push({
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
				branches.push({
					bodyStart: afterBrace(anchor),
					nodes: node.body.nodes
				});
				if (node.fallback) {
					const sepStart = separator("else", node.fallback, closeStart);
					branches.push({
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
						branches.unshift({
							bodyStart: afterBrace(anchor),
							nodes: body.nodes
						});
					} else {
						const sepStart = separator(key, body, next);
						const anchor = pattern && range(pattern).start > sepStart ? range(pattern).end : sepStart;
						branches.unshift({
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
				branches.push({
					bodyStart: afterBrace(range(node.expression).end),
					nodes: node.fragment.nodes
				});
				break;
			case "SnippetBlock": {
				closeStart = code.lastIndexOf("{/snippet", node.end);
				const anchor = Math.max(range(node.expression).end, ...node.parameters.map((p) => range(p).end));
				branches.push({
					bodyStart: afterBrace(anchor),
					nodes: node.body.nodes
				});
				break;
			}
		}
		const pieces = [];
		let cursor = node.start;
		for (const [index, branch] of branches.entries()) {
			if (branch.sepStart !== void 0) cursor = branch.sepStart;
			const bodyEnd = branches[index + 1]?.sepStart ?? closeStart;
			pieces.push(code.slice(cursor, branch.bodyStart));
			pieces.push(segment(branch.nodes, branch.bodyStart, bodyEnd));
			cursor = bodyEnd;
		}
		pieces.push(code.slice(closeStart, node.end));
		return pieces;
	};
	const collect = (nodes) => {
		for (const node of nodes) {
			if (node.type === "Component" && node.name === "T") {
				const openEnd = tagEnd(node);
				const last = node.fragment.nodes.at(-1);
				const closeStart = last ? last.end : openEnd;
				components.push({
					start: node.start,
					end: node.end,
					segment: segment(node.fragment.nodes, openEnd, closeStart)
				});
				continue;
			}
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
				if (fragment?.type === "Fragment") collect(fragment.nodes);
			}
		}
	};
	collect(ast.fragment.nodes);
	return {
		ast,
		components
	};
};
const findTComponents = (code, file) => parseT(code, file).components;
const collectSources = (segment) => {
	const sources = segment.source ? [segment.source] : [];
	for (const part of segment.parts) if (part.kind === "block") {
		for (const piece of part.pieces) if (typeof piece !== "string") sources.push(...collectSources(piece));
	}
	return sources;
};
const tokenize = (text) => {
	const tokens = [];
	let i = 0;
	let textStart = 0;
	const flush = (end) => {
		if (end > textStart) tokens.push({
			type: "text",
			value: text.slice(textStart, end)
		});
	};
	while (i < text.length) {
		if (text.startsWith("${", i)) {
			let depth = 0;
			let j = i + 1;
			for (; j < text.length; j++) if (text[j] === "{") depth++;
			else if (text[j] === "}" && --depth === 0) break;
			if (j < text.length) {
				flush(i);
				tokens.push({
					type: "expr",
					value: text.slice(i + 2, j)
				});
				i = textStart = j + 1;
				continue;
			}
		}
		if (text[i] === "<") {
			const match = /^<(\/?)(\d+)\s*(\/?)>/.exec(text.slice(i));
			if (match && !(match[1] && match[3])) {
				flush(i);
				const n = Number(match[2]);
				tokens.push(match[1] ? {
					type: "close",
					n
				} : match[3] ? {
					type: "self",
					n
				} : {
					type: "open",
					n
				});
				i = textStart = i + match[0].length;
				continue;
			}
		}
		i++;
	}
	flush(text.length);
	return tokens;
};
const toTree = (tokens) => {
	const root = [];
	const stack = [];
	const top = () => stack.at(-1)?.children ?? root;
	for (const token of tokens) if (token.type === "text" || token.type === "expr") top().push(token);
	else if (token.type === "self") top().push({
		type: "tag",
		n: token.n,
		children: []
	});
	else if (token.type === "open") {
		const node = {
			type: "tag",
			n: token.n,
			children: []
		};
		top().push(node);
		stack.push(node);
	} else {
		const index = stack.findLastIndex((item) => item.n === token.n);
		if (index !== -1) stack.length = index;
	}
	return root;
};
const shape = (text) => {
	const tags = /* @__PURE__ */ new Map();
	const exprs = [];
	const stack = [];
	const invalid = (error) => ({
		error,
		exprs,
		tags
	});
	for (const token of tokenize(text)) {
		if (token.type === "text") continue;
		if (token.type === "expr") {
			exprs.push(token.value);
			continue;
		}
		if (token.type === "close") {
			if (stack.at(-1) !== token.n) return invalid(`tag <${token.n}> is closed out of order`);
			stack.pop();
			continue;
		}
		if (tags.has(token.n)) return invalid(`tag <${token.n}> appears twice`);
		tags.set(token.n, {
			self: token.type === "self",
			parent: stack.at(-1) ?? 0
		});
		if (token.type === "open") stack.push(token.n);
	}
	if (stack.length > 0) return invalid(`tag <${stack.at(-1)}> is never closed`);
	return {
		exprs: exprs.toSorted(),
		tags
	};
};
/** Returns what is wrong with the translation, or nothing when it keeps
* all placeholders and numbered tags of the source. */
const validateTranslation = (source, translation) => {
	const expected = shape(source);
	const actual = shape(translation);
	if (expected.error) return;
	if (actual.error) return actual.error;
	if (expected.exprs.join("\0") !== actual.exprs.join("\0")) return "placeholders differ from the source";
	if (expected.tags.size !== actual.tags.size) return "tags differ from the source";
	for (const [n, tag] of expected.tags) {
		const other = actual.tags.get(n);
		if (!other || other.self !== tag.self || other.parent !== tag.parent) return "tags differ from the source";
	}
};
const escapeText = (text) => text.replace(/[{}<]/g, (char) => char === "{" ? "&#123;" : char === "}" ? "&#125;" : "&lt;");
const hasTranslation = (segment, locale, lookup) => {
	if (segment.source) {
		const translation = lookup(segment.source, locale);
		if (translation !== void 0 && translation !== segment.source) return true;
	}
	return segment.parts.some((part) => part.kind === "block" && part.pieces.some((piece) => typeof piece !== "string" && hasTranslation(piece, locale, lookup)));
};
/** The `{#if lang.locale === ...}` markup replacing a `<T>`, or nothing
* when no locale has a translation for it. */
const renderT = (component, code, locales, lookup) => {
	const root = component.segment;
	const branches = locales.filter((locale) => hasTranslation(root, locale, lookup));
	if (branches.length === 0) return;
	const renderSegment = (segment, locale) => {
		if (!segment.source) return code.slice(segment.start, segment.end);
		const translation = lookup(segment.source, locale) ?? segment.source;
		return renderNodes(toTree(tokenize(translation)), segment, locale);
	};
	const renderNodes = (nodes, segment, locale) => {
		let output = "";
		for (const node of nodes) {
			if (node.type === "text") {
				output += escapeText(node.value);
				continue;
			}
			if (node.type === "expr") {
				output += `{${node.value}}`;
				continue;
			}
			const part = segment.parts[node.n - 1];
			if (!part) throw new Error(`Translation of "${segment.source}" references <${node.n}> which is not in the source.`);
			const inner = renderNodes(node.children, segment, locale);
			if (part.kind === "verbatim") output += part.source + inner;
			else if (part.kind === "block") output += part.pieces.map((piece) => typeof piece === "string" ? piece : renderSegment(piece, locale)).join("") + inner;
			else if (node.children.length === 0) output += code.slice(part.node.start, part.node.end);
			else output += code.slice(part.node.start, part.openEnd) + inner + code.slice(part.closeStart, part.node.end);
		}
		return output;
	};
	return branches.map((locale, index) => {
		return `{${index === 0 ? "#if" : ":else if"} lang.locale === '${locale}'}` + renderSegment(root, locale);
	}).join("") + `{:else}${code.slice(root.start, root.end)}{/if}`;
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
	if (hasT(code)) for (const component of findTComponents(code, file)) found.push(...collectSources(component.segment));
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
const isSvelteFile = (id) => typeof id === "string" && id.split("?")[0].endsWith(".svelte");
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
				for (const component of components) {
					const markup = renderT(component, code, props.locales, (source, locale) => cache.get(source, locale));
					if (markup !== void 0) {
						transformedCode.overwrite(component.start, component.end, rewriteLangT(markup));
						replaced.push(component);
					}
				}
				if (replaced.length > 0 && !importsLang(ast)) {
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
					"Keep every ${...} placeholder and every numbered <n>...</n> or <n/> tag exactly as written in the source, with the same nesting. Translate only the text around them.",
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
