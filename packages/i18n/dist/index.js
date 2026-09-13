import { extname } from "node:path";
import MagicString from "magic-string";
import { readFile, stat, writeFile } from "fs/promises";
import { join } from "path";
import { glob } from "glob";
import lineColumn from "line-column";
import { parse } from "svelte/compiler";
import { walk } from "estree-walker";
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
const T_MODULE = "@awsless/i18n/T";
const hasT = (code) => code.includes(T_MODULE);
const PRESERVE = /* @__PURE__ */ new Set(["pre", "textarea"]);
const REMOVABLE = /* @__PURE__ */ new Set([
	"select",
	"tr",
	"table",
	"tbody",
	"thead",
	"tfoot",
	"colgroup",
	"datalist"
]);
const HOISTED = /* @__PURE__ */ new Set([
	"ConstTag",
	"DeclarationTag",
	"DebugTag",
	"SvelteBody",
	"SvelteWindow",
	"SvelteDocument",
	"SvelteHead",
	"TitleElement",
	"SnippetBlock"
]);
const STARTS_WITH_WHITESPACE = /^[ \t\r\n]+/;
const ENDS_WITH_WHITESPACE = /[ \t\r\n]+$/;
const isBlankText = (value) => !/[^ \t\r\n]/.test(value);
const isRuntimeOnly = (node) => node.attributes.some((attribute) => !(attribute.type === "LetDirective" || attribute.type === "Attribute" && attribute.name === "slot"));
const COMPONENTS = /* @__PURE__ */ new Set([
	"Component",
	"SvelteComponent",
	"SvelteSelf"
]);
const RAW = /* @__PURE__ */ new Set(["script", "style"]);
const patternNames = (pattern, names = []) => {
	if (!pattern) return names;
	switch (pattern.type) {
		case "Identifier":
			names.push(pattern.name);
			break;
		case "ObjectPattern":
		case "ObjectExpression":
			pattern.properties?.forEach((property) => patternNames(property.type === "RestElement" || property.type === "SpreadElement" ? property.argument : property.value, names));
			break;
		case "ArrayPattern":
		case "ArrayExpression":
			pattern.elements?.forEach((element) => patternNames(element, names));
			break;
		case "AssignmentPattern":
		case "AssignmentExpression":
			patternNames(pattern.left, names);
			break;
		case "RestElement":
		case "SpreadElement": patternNames(pattern.argument, names);
	}
	return names;
};
const letNames = (node) => node.attributes.flatMap((attribute) => attribute.type === "LetDirective" ? attribute.expression ? patternNames(attribute.expression) : [attribute.name] : []);
/** The <T> uses that are ours: any default import of this package, used
* where no each, snippet, let:, @const or await binding shadows that name. */
const resolveT = (ast) => {
	const ours = /* @__PURE__ */ new Set();
	const names = /* @__PURE__ */ new Set();
	for (const script of [ast.instance, ast.module]) for (const statement of script?.content.body ?? []) if (statement.type === "ImportDeclaration" && statement.source.value === "@awsless/i18n/T") {
		for (const specifier of statement.specifiers) if (specifier.type === "ImportDefaultSpecifier" || specifier.type === "ImportSpecifier" && specifier.imported.type === "Identifier" && specifier.imported.name === "default") names.add(specifier.local.name);
	}
	if (names.size === 0) return {
		names,
		ours
	};
	const hasSlot = (node) => "attributes" in node && node.attributes.some((attribute) => attribute.type === "Attribute" && attribute.name === "slot");
	const walk = (nodes, scope, lets = []) => {
		const inner = new Set(scope);
		for (const node of nodes) if (node.type === "ConstTag") node.declaration.declarations.forEach((declaration) => patternNames(declaration.id).forEach((n) => inner.add(n)));
		const withLets = /* @__PURE__ */ new Set([...inner, ...lets]);
		for (const node of nodes) {
			const current = hasSlot(node) ? inner : withLets;
			const extend = (names) => /* @__PURE__ */ new Set([...current, ...names]);
			switch (node.type) {
				case "EachBlock":
					walk(node.body.nodes, extend([...patternNames(node.context), ...node.index ? [node.index] : []]));
					if (node.fallback) walk(node.fallback.nodes, current);
					break;
				case "SnippetBlock":
					walk(node.body.nodes, extend(node.parameters.flatMap((parameter) => patternNames(parameter))));
					break;
				case "AwaitBlock":
					if (node.pending) walk(node.pending.nodes, current);
					if (node.then) walk(node.then.nodes, extend(patternNames(node.value)));
					if (node.catch) walk(node.catch.nodes, extend(patternNames(node.error)));
					break;
				case "IfBlock":
					walk(node.consequent.nodes, current);
					if (node.alternate) walk(node.alternate.nodes, current);
					break;
				case "KeyBlock":
					walk(node.fragment.nodes, current);
					break;
				default: if ("fragment" in node && node.fragment?.type === "Fragment") {
					if (node.type === "Component" && names.has(node.name) && !current.has(node.name)) ours.add(node);
					walk(node.fragment.nodes, current, letNames(node));
				}
			}
		}
	};
	walk(ast.fragment.nodes, /* @__PURE__ */ new Set());
	return {
		names,
		ours
	};
};
const isBlank = (node) => node.type === "Comment" || node.type === "Text" && isBlankText(node.data);
const rootContext = (preserve) => ({
	preserve,
	removable: false,
	pre: false,
	svg: false,
	svgText: false
});
const childContext = (node, parent) => {
	const regular = node.type === "RegularElement";
	const svg = parent.svg || regular && node.name === "svg";
	const svgText = parent.svgText || regular && node.name === "text";
	return {
		preserve: parent.preserve || regular && PRESERVE.has(node.name),
		removable: regular && REMOVABLE.has(node.name) || svg && !svgText,
		pre: regular && node.name === "pre",
		svg,
		svgText
	};
};
const parseT = (code, file) => {
	const ast = parse(code, { modern: true });
	const components = [];
	const preserveAll = ast.options?.preserveWhitespace === true;
	const { ours } = resolveT(ast);
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
	const build = (nodes, context) => {
		const pieces = [];
		const expressions = [];
		const nested = [];
		let tags = 0;
		const visit = (nodes, context) => {
			for (const node of nodes) switch (node.type) {
				case "Text":
					pieces.push({
						start: node.start,
						end: node.end,
						token: {
							type: "text",
							value: node.data
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
					expressions.push({
						start: range(node.expression).start,
						end: range(node.expression).end
					});
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
						},
						hoisted: HOISTED.has(node.type)
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
						},
						hoisted: HOISTED.has(node.type)
					});
					for (const body of blockBodies(node)) nested.push(...build(body, context));
					break;
				default: {
					if (node.type === "Component" && ours.has(node)) {
						if (!isRuntimeOnly(node)) throw fail(node.start, "nested <T> is not supported inside <T>");
						pieces.push({
							start: node.start,
							end: node.end,
							token: {
								type: "self",
								n: ++tags
							}
						});
						break;
					}
					const n = ++tags;
					const first = node.fragment.nodes[0];
					const last = node.fragment.nodes.at(-1);
					const hoisted = HOISTED.has(node.type);
					if (node.type === "RegularElement" && RAW.has(node.name)) {
						pieces.push({
							start: node.start,
							end: node.end,
							token: {
								type: "self",
								n
							}
						});
						break;
					}
					if (first && last) {
						const body = childContext(node, context);
						pieces.push({
							start: node.start,
							end: first.start,
							token: {
								type: "open",
								n
							},
							hoisted,
							body
						});
						visit(node.fragment.nodes, body);
						pieces.push({
							start: last.end,
							end: node.end,
							token: {
								type: "close",
								n
							},
							hoisted
						});
					} else pieces.push({
						start: node.start,
						end: node.end,
						token: {
							type: "self",
							n
						},
						hoisted
					});
				}
			}
		};
		visit(nodes, context);
		return [segment(merge(normalize(pieces, context)), expressions), ...nested];
	};
	collect(code, ours, ast.fragment.nodes, preserveAll, void 0, (node, head, foot, wrap, remove, nodes, preserve) => {
		components.push({
			start: node.start,
			end: node.end,
			head,
			foot,
			wrap,
			remove,
			segments: nodes ? build(nodes, rootContext(preserve)) : []
		});
	});
	return {
		ast,
		components
	};
};
const collect = (code, ours, nodes, preserve, parent, found) => {
	for (const node of nodes) {
		if (node.type === "Component" && ours.has(node)) {
			const slotted = node.fragment.nodes.some((child) => "attributes" in child && child.attributes.some((attribute) => attribute.type === "Attribute" && attribute.name === "slot"));
			if (isRuntimeOnly(node) || slotted) continue;
			const slot = node.attributes.find((attribute) => attribute.type === "Attribute" && attribute.name === "slot");
			if (slot && !(parent && COMPONENTS.has(parent.type))) continue;
			const carried = node.attributes.filter((attribute) => attribute === slot || attribute.type === "LetDirective");
			const head = slot ? `<svelte:fragment ${carried.map((item) => code.slice(item.start, item.end)).join(" ")}>` : "";
			const foot = slot ? "</svelte:fragment>" : "";
			const remove = [];
			const children = node.fragment.nodes.flatMap((child) => {
				if (child.type !== "SvelteFragment") return [child];
				const first = child.fragment.nodes[0];
				const last = child.fragment.nodes.at(-1);
				if (first && last) {
					remove.push({
						start: child.start,
						end: first.start
					}, {
						start: last.end,
						end: child.end
					});
					return child.fragment.nodes;
				}
				remove.push({
					start: child.start,
					end: child.end
				});
				return [];
			});
			const snippet = children.filter((child) => !isBlank(child)).find((child) => child.type === "SnippetBlock" && child.expression.name === "children");
			const first = node.fragment.nodes[0];
			const last = node.fragment.nodes.at(-1);
			if (children.length > 0 && first && last) found(node, head, foot, {
				open: {
					start: node.start,
					end: first.start
				},
				close: {
					start: last.end,
					end: node.end
				},
				tail: snippet ? "{@render children()}" : ""
			}, remove, children, preserve);
			else found(node, head, foot, void 0, [], void 0, preserve);
			continue;
		}
		const inside = preserve || node.type === "RegularElement" && PRESERVE.has(node.name);
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
			if (fragment?.type === "Fragment") collect(code, ours, fragment.nodes, inside, node, found);
		}
	}
};
const normalize = (pieces, context) => {
	const items = [];
	for (let i = 0; i < pieces.length; i++) {
		const piece = pieces[i];
		if (piece.token.type === "open") {
			const n = piece.token.n;
			let j = i + 1;
			while (!(pieces[j].token.type === "close" && pieces[j].token.n === n)) j++;
			items.push({
				piece,
				inner: pieces.slice(i + 1, j),
				close: pieces[j]
			});
			i = j;
		} else items.push({ piece });
	}
	const dropped = /* @__PURE__ */ new Set();
	const text = (item) => item?.piece.token.type === "text" ? item.piece.token : void 0;
	let regular = items.filter((item) => !item.piece.hoisted);
	if (!context.preserve) {
		while (regular.length > 0 && text(regular[0]) && isBlankText(text(regular[0]).value)) dropped.add(regular.shift());
		while (regular.length > 0 && text(regular.at(-1)) && isBlankText(text(regular.at(-1)).value)) dropped.add(regular.pop());
		const first = text(regular[0]);
		const last = text(regular.at(-1));
		if (first) first.value = first.value.replace(STARTS_WITH_WHITESPACE, "");
		if (last) last.value = last.value.replace(ENDS_WITH_WHITESPACE, "");
		for (const [index, item] of regular.entries()) {
			const token = text(item);
			if (!token) continue;
			const previous = regular[index - 1]?.piece.token;
			const next = regular[index + 1]?.piece.token;
			if (previous?.type !== "expr") {
				const afterSpace = previous?.type === "text" && ENDS_WITH_WHITESPACE.test(previous.value);
				token.value = token.value.replace(STARTS_WITH_WHITESPACE, afterSpace ? "" : " ");
			}
			if (next?.type !== "expr") token.value = token.value.replace(ENDS_WITH_WHITESPACE, " ");
			if (token.value === "" || token.value === " " && context.removable) dropped.add(item);
		}
		regular = regular.filter((item) => !dropped.has(item));
	}
	const first = text(regular[0]);
	if (context.pre && first && (first.value === "\n" || first.value === "\r\n")) dropped.add(regular[0]);
	return items.flatMap((item) => {
		if (dropped.has(item)) return [];
		if (item.inner && item.close) return [
			item.piece,
			...normalize(item.inner, item.piece.body),
			item.close
		];
		return [item.piece];
	});
};
const merge = (pieces) => {
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
	return merged;
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
				value: buffer
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
const placeholders = (text) => Array.from(text.matchAll(/\$\{([^{}]*)\}/g), (match) => match[1]).toSorted().join("\0");
/** Returns what is wrong with a lang.t translation, or nothing when it
* keeps every `${...}` placeholder. Angle brackets are plain text there. */
const validatePlaceholders = (source, translation) => {
	if (placeholders(source) !== placeholders(translation)) return "a placeholder is missing, duplicated or changed";
};
/** Returns what is wrong with a <T> translation, or nothing when it keeps
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
const spliced = (code, target, rewrites) => {
	let result = "";
	let cursor = target.start;
	for (const rewrite of rewrites) if (rewrite.start >= target.start && rewrite.end <= target.end) {
		result += code.slice(cursor, rewrite.start) + rewrite.text;
		cursor = rewrite.end;
	}
	return result + code.slice(cursor, target.end);
};
/** The edits turning a <T> into an `{#if true}` block with translated text
* runs, and whether any of them calls the runtime. An edit without text
* removes, one without length inserts. */
const transformT = (component, code, locales, lookup, warn, rewrites = []) => {
	const edits = [];
	let translated = false;
	if (!component.wrap) {
		const text = `${component.head}{#if true}{/if}${component.foot}`;
		return {
			edits: [{
				start: component.start,
				end: component.end,
				text
			}],
			translated
		};
	}
	edits.push(...component.remove.map((range) => ({
		...range,
		text: ""
	})));
	edits.push({
		...component.wrap.open,
		text: `${component.head}{#if true}`
	});
	edits.push({
		...component.wrap.close,
		text: `${component.wrap.tail}{/if}${component.foot}`
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
			const values = indices.length > 0 ? `, [${indices.map((i) => `(${spliced(code, segment.expressions[i], rewrites)})`).join(", ")}]` : "";
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
const isLangT = (tag) => {
	const node = tag;
	return node.type === "MemberExpression" && node.computed === false && node.object?.type === "Identifier" && node.object.name === "lang" && node.property?.type === "Identifier" && node.property.name === "t";
};
const findTaggedTemplates = (ast, code) => {
	const found = [];
	const seen = /* @__PURE__ */ new Set();
	const walk = (value) => {
		if (!value || typeof value !== "object" || seen.has(value)) return;
		seen.add(value);
		if (Array.isArray(value)) {
			value.forEach(walk);
			return;
		}
		const node = value;
		if (node.type === "TaggedTemplateExpression" && isLangT(node.tag)) {
			const { start, end } = node;
			const quasi = node.quasi;
			found.push({
				start,
				end,
				source: code.slice(quasi.start + 1, quasi.end - 1)
			});
		}
		Object.values(node).forEach(walk);
	};
	walk(ast);
	return found.toSorted((a, b) => a.start - b.start);
};
const findSvelteTranslatable = (code, file) => {
	const { ast, components } = parseT(code, file);
	return [...findTaggedTemplates(ast, code).map((item) => ({
		source: item.source,
		kind: "t"
	})), ...components.flatMap((component) => collectSources(component).map((source) => ({
		source,
		kind: "markup"
	})))];
};
//#endregion
//#region src/find/typescript.ts
const findTypescriptTagged = (code) => {
	const found = [];
	const ast = parseSync("module.ts", code);
	walk(ast.program, { enter(node) {
		if (node.type === "TaggedTemplateExpression" && node.tag.type === "MemberExpression" && node.tag.computed === false && node.tag.object.type === "Identifier" && node.tag.object.name === "lang" && node.tag.property.type === "Identifier" && node.tag.property.name === "t") {
			const { start, end } = node;
			const quasi = node.quasi;
			found.push({
				start,
				end,
				source: code.slice(quasi.start + 1, quasi.end - 1)
			});
		}
	} });
	return found;
};
const findTypescriptTranslatable = (code) => findTypescriptTagged(code).map((item) => ({
	source: item.source,
	kind: "t"
}));
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
const outermost = (tagged) => tagged.filter((item) => !tagged.some((other) => other !== item && other.start <= item.start && item.end <= other.end));
const isSvelteFile = (id = "") => extname(id.split("?")[0]) === ".svelte";
const i18n = (props) => {
	let cache;
	let generatedCache;
	let overrideCache;
	let queue = Promise.resolve();
	const translateMissing = (cwd, sources, log) => {
		queue = queue.catch(() => {}).then(() => translateNow(cwd, sources, log));
		return queue;
	};
	const translateNow = async (cwd, sources, log) => {
		const newSourceTexts = findNewTranslations(cache, sources.map((item) => item.source), props.locales);
		const markup = new Set(sources.filter((item) => item.kind === "markup").map((item) => item.source));
		if (newSourceTexts.length > 0) {
			log.info(`Translating ${newSourceTexts.length} new texts.`);
			const translations = await props.translate(props.default ?? "en", newSourceTexts);
			log.info(`Translated ${translations.length} texts.`);
			for (const item of translations) {
				const problem = (markup.has(item.source) ? validateTranslation : validatePlaceholders)(item.source, item.translation);
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
			const sources = await findTranslatable(cwd);
			generatedCache = await loadGeneratedCache(cwd);
			overrideCache = await loadOverrideCache(cwd);
			removeUnusedTranslations(generatedCache, sources.map((item) => item.source), props.locales);
			cache = mergeCaches(generatedCache, overrideCache);
			await translateMissing(cwd, sources, {
				info: (message) => this.info(message),
				warn: (message) => this.warn(message)
			});
			this.info(`Translating done.`);
		},
		async hotUpdate({ file, read }) {
			if (!cache || !SOURCE_FILE.test(file) || isIgnoredPath(file)) return;
			const sources = await findTranslatableInCode(file, await read());
			if (sources.length > 0) await translateMissing(process.cwd(), sources, this.environment.logger);
		},
		transform(code, id) {
			const svelte = isSvelteFile(id);
			if (!code.includes("lang.t`") && !(svelte && hasT(code))) return;
			const sources = /* @__PURE__ */ new Set();
			for (const item of cache.entries()) sources.add(item.source);
			const compose = (text) => {
				const inner = outermost(findTypescriptTagged(`\`${text}\``).filter((item) => sources.has(item.source)));
				let result = text;
				for (const item of inner.toSorted((a, b) => b.start - a.start)) result = result.slice(0, item.start - 1) + render(item.source) + result.slice(item.end - 1);
				return result;
			};
			const render = (source) => {
				const translations = props.locales.map((locale) => {
					const translation = cache.get(source, locale);
					if (translation === void 0 || translation === source) return;
					return `"${locale}":\`${compose(translation)}\``;
				}).filter((v) => !!v);
				return `lang.t.get(\`${compose(source)}\`, {${translations.join(",")}})`;
			};
			const rewrites = (tagged) => outermost(tagged.filter((item) => sources.has(item.source))).map((item) => ({
				...item,
				text: render(item.source)
			}));
			const transformedCode = new MagicString(code);
			if (svelte) {
				const { ast, components } = parseT(code, id);
				const templates = rewrites(findTaggedTemplates(ast, code));
				const lookup = (source, locale) => cache.get(source, locale);
				const edits = [];
				let called = false;
				for (const component of components) {
					const result = transformT(component, code, props.locales, lookup, (message) => this.warn(message), templates);
					edits.push(...result.edits);
					called ||= result.translated;
				}
				for (const edit of edits) if (edit.text === "") {
					if (edit.end > edit.start) transformedCode.remove(edit.start, edit.end);
				} else if (edit.start === edit.end) transformedCode.appendLeft(edit.start, edit.text);
				else transformedCode.overwrite(edit.start, edit.end, edit.text);
				for (const template of templates) if (!edits.some((edit) => edit.start < edit.end && edit.start <= template.start && template.end <= edit.end)) transformedCode.overwrite(template.start, template.end, template.text);
				if (called) {
					if (ast.instance) {
						const { start } = ast.instance.content;
						const first = ast.instance.content.body[0];
						const sameLine = !code.slice(start, first?.start ?? start).includes("\n");
						transformedCode.appendLeft(start, `${LANG_IMPORT}${sameLine ? ";\n" : ""}`);
					} else transformedCode.prepend(`<script>\n\t${LANG_IMPORT}\n<\/script>\n`);
				}
			} else for (const template of rewrites(findTypescriptTagged(code))) transformedCode.overwrite(template.start, template.end, template.text);
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
