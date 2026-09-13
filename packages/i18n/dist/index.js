import { createRequire } from "node:module";
import { dirname, extname, join } from "node:path";
import MagicString from "magic-string";
import { readFile, stat, writeFile } from "fs/promises";
import { join as join$1 } from "path";
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
	const file = join$1(cwd, fileName);
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
	const file = join$1(cwd, GENERATED_CACHE_FILE);
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
//#region src/svelte-internal.ts
const state = (preserveComments) => ({
	analysis: { runes: true },
	options: {
		hmr: false,
		preserveComments
	}
});
const isCleaned = (value) => typeof value === "object" && value !== null && Array.isArray(value.hoisted) && Array.isArray(value.trimmed);
let loaded;
/** Svelte's whitespace cleaning is not public API, so it is taken from the
* compiler sources shipped in the package and checked once up front, so a
* Svelte release that moves it fails with a clear message instead of odd output. */
const svelteInternals = () => {
	if (loaded) return loaded;
	const require = createRequire(import.meta.url);
	const manifest = require.resolve("svelte/package.json");
	const { version } = require(manifest);
	const root = dirname(manifest);
	const fail = (reason) => /* @__PURE__ */ new Error(`@awsless/i18n mirrors svelte's whitespace handling through its compiler internals, but svelte ${version} ${reason}.`);
	let transform;
	let utils;
	try {
		transform = require(join(root, "src/compiler/phases/3-transform/utils.js"));
		utils = require(join(root, "src/utils.js"));
	} catch (error) {
		throw fail(`does not ship them where expected (${error instanceof Error ? error.message : String(error)})`);
	}
	const { clean_nodes, infer_namespace, determine_namespace_for_children } = transform;
	const { is_svg, is_mathml } = utils;
	if ([
		clean_nodes,
		infer_namespace,
		determine_namespace_for_children,
		is_svg,
		is_mathml
	].some((fn) => typeof fn !== "function")) throw fail("is missing clean_nodes, infer_namespace, determine_namespace_for_children, is_svg or is_mathml");
	let probe;
	try {
		probe = clean_nodes({
			type: "Fragment",
			nodes: []
		}, [], [], "html", state(false), false, false);
	} catch (error) {
		throw fail(`rejects clean_nodes(parent, nodes, path, namespace, state, preserveWhitespace, preserveComments) (${error instanceof Error ? error.message : String(error)})`);
	}
	if (!isCleaned(probe)) throw fail("returns an unexpected shape from clean_nodes");
	loaded = {
		version,
		cleanNodes: (parent, nodes, path, namespace, preserveWhitespace, preserveComments) => {
			const { hoisted, trimmed } = clean_nodes(parent, nodes, path, namespace, state(preserveComments), preserveWhitespace, preserveComments);
			return {
				hoisted,
				trimmed
			};
		},
		inferNamespace: infer_namespace,
		childNamespace: determine_namespace_for_children,
		isSvg: is_svg,
		isMathml: is_mathml
	};
	return loaded;
};
const NAMESPACE_SVG = "http://www.w3.org/2000/svg";
const NAMESPACE_MATHML = "http://www.w3.org/1998/Math/MathML";
const SLOT_RESET = /* @__PURE__ */ new Set([
	"Component",
	"SvelteComponent",
	"SvelteFragment",
	"SnippetBlock"
]);
const meta = (node) => node;
/** The namespace a <svelte:element> without xmlns gets from its ancestors, the
* way svelte/src/compiler/phases/2-analyze/visitors/SvelteElement.js looks it
* up: the nearest element's own, or the component's at a slot, a snippet or
* the root. `path` starts at the root. */
const lookupNamespace = (path, componentNamespace) => {
	for (let i = path.length - 1; i >= 0; i--) {
		const ancestor = path[i];
		if (i === 0 || SLOT_RESET.has(ancestor.type)) return componentNamespace;
		if (ancestor.type === "RegularElement" || ancestor.type === "SvelteElement") {
			if (ancestor.type === "RegularElement" && ancestor.name === "foreignObject") return "html";
			const metadata = meta(ancestor).metadata;
			return metadata?.svg ? "svg" : metadata?.mathml ? "mathml" : "html";
		}
	}
	return componentNamespace;
};
/** parse() hands out the AST without the metadata the analysis phase adds,
* and the cleaning reads two bits of it: the element namespace, computed here
* the way svelte/src/compiler/phases/2-analyze/visitors/RegularElement.js and
* SvelteElement.js do, and `dynamic` on components and render tags, which
* only steers an anchor optimisation and stays false. */
const annotate = (root, namespace, internals) => {
	const walk = (nodes, path) => {
		for (const node of nodes) {
			if (node.type === "RegularElement") {
				const nearest = path.findLast((ancestor) => ancestor.type === "RegularElement");
				const inherited = nearest ? meta(nearest).metadata?.svg === true : false;
				meta(node).metadata = {
					svg: internals.isSvg(node.name) || (node.name === "a" || node.name === "title") && inherited,
					mathml: internals.isMathml(node.name)
				};
				walk(node.fragment.nodes, [...path, node]);
				if (node.name === "a" && !nearest) {
					const svgChild = node.fragment.nodes.some((child) => child.type === "RegularElement" && child.name !== "svg" && meta(child).metadata?.svg);
					meta(node).metadata.svg ||= svgChild;
				}
				continue;
			}
			if (node.type === "SvelteElement") {
				const xmlns = node.attributes.find((attribute) => attribute.type === "Attribute" && attribute.name === "xmlns" && Array.isArray(attribute.value) && attribute.value.length === 1 && attribute.value[0]?.type === "Text");
				if (xmlns && xmlns.type === "Attribute" && Array.isArray(xmlns.value) && xmlns.value[0]?.type === "Text") {
					const value = xmlns.value[0].data;
					meta(node).metadata = {
						svg: value === NAMESPACE_SVG,
						mathml: value === NAMESPACE_MATHML
					};
				} else {
					const found = lookupNamespace(path, namespace);
					meta(node).metadata = {
						svg: found === "svg",
						mathml: found === "mathml"
					};
				}
				walk(node.fragment.nodes, [...path, node]);
				continue;
			}
			if (node.type === "Component" || node.type === "SvelteComponent" || node.type === "SvelteSelf" || node.type === "RenderTag") meta(node).metadata = { dynamic: false };
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
				if (fragment?.type === "Fragment") walk(fragment.nodes, [...path, node]);
			}
		}
	};
	walk(root.fragment.nodes, [root]);
};
//#endregion
//#region src/t.ts
const range = (node) => node;
const T_MODULE = "@awsless/i18n/T";
const hasT = (code) => code.includes(T_MODULE);
const RESTRICTED = /* @__PURE__ */ new Set([
	"select",
	"tr",
	"table",
	"tbody",
	"thead",
	"tfoot",
	"colgroup",
	"datalist",
	"optgroup"
]);
const SVG_TEXT = /* @__PURE__ */ new Set([
	"text",
	"tspan",
	"textPath",
	"title",
	"desc"
]);
const hasSlotAttribute = (node) => "attributes" in node && node.attributes.some((attribute) => attribute.type === "Attribute" && attribute.name === "slot");
const staticTag = (node) => {
	const tag = node.tag;
	return tag.type === "Literal" && typeof tag.value === "string" ? tag.value : void 0;
};
const isSvgTextElement = (node) => node.type === "RegularElement" && SVG_TEXT.has(node.name) || node.type === "SvelteElement" && SVG_TEXT.has(staticTag(node) ?? "");
const hasStaticXmlns = (node) => node.attributes.some((attribute) => attribute.type === "Attribute" && attribute.name === "xmlns" && Array.isArray(attribute.value) && attribute.value.length === 1 && attribute.value[0]?.type === "Text");
const hasExposedDynamicElement = (nodes) => nodes.some((node) => {
	switch (node.type) {
		case "SvelteElement": return !hasStaticXmlns(node);
		case "SvelteFragment":
		case "SvelteBoundary":
		case "KeyBlock": return hasExposedDynamicElement(node.fragment.nodes);
		case "IfBlock": return hasExposedDynamicElement(node.consequent.nodes) || node.alternate !== null && hasExposedDynamicElement(node.alternate.nodes);
		case "EachBlock": return hasExposedDynamicElement(node.body.nodes) || node.fallback !== void 0 && hasExposedDynamicElement(node.fallback.nodes);
		case "AwaitBlock": return [
			node.pending,
			node.then,
			node.catch
		].some((body) => body !== null && hasExposedDynamicElement(body.nodes));
		default: return false;
	}
});
const isRuntimeOnly = (node, path, componentNamespace) => node.attributes.some((attribute) => !(attribute.type === "LetDirective" || attribute.type === "Attribute" && attribute.name === "slot")) || node.fragment.nodes.some(hasSlotAttribute) || hasExposedDynamicElement(node.fragment.nodes) && lookupNamespace(path, componentNamespace) !== componentNamespace;
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
const isTImport = (statement) => statement.type === "ImportDeclaration" && statement.source.value === "@awsless/i18n/T";
const statementBindings = (statement, top = true) => {
	const nested = (value) => value ? statementBindings(value, false) : [];
	const list = (value) => Array.isArray(value) ? value.flatMap(nested) : [];
	switch (statement.type) {
		case "VariableDeclaration": return top || statement.kind === "var" ? statement.declarations.flatMap((declaration) => patternNames(declaration.id)) : [];
		case "FunctionDeclaration":
		case "ClassDeclaration": return top && statement.id ? [statement.id.name] : [];
		case "ImportDeclaration": return top ? statement.specifiers.map((specifier) => specifier.local.name) : [];
		case "ExportNamedDeclaration": return top && statement.declaration ? statementBindings(statement.declaration) : [];
		case "BlockStatement": return list(statement.body);
		case "IfStatement": return [...nested(statement.consequent), ...nested(statement.alternate)];
		case "ForStatement": return [...nested(statement.init), ...nested(statement.body)];
		case "ForInStatement":
		case "ForOfStatement": return [...nested(statement.left), ...nested(statement.body)];
		case "WhileStatement":
		case "DoWhileStatement":
		case "LabeledStatement": return nested(statement.body);
		case "SwitchStatement": return statement.cases.flatMap((item) => list(item.consequent));
		case "TryStatement": return [
			...nested(statement.block),
			...nested(statement.handler?.body),
			...nested(statement.finalizer)
		];
		default: return [];
	}
};
/** The <T> uses that are ours: any default import of this package, used
* where no each, snippet, let:, @const or await binding shadows that name. */
const resolveT = (ast) => {
	const ours = /* @__PURE__ */ new Set();
	const names = /* @__PURE__ */ new Set();
	for (const script of [ast.instance, ast.module]) for (const statement of script?.content.body ?? []) if (statement.type === "ImportDeclaration" && statement.source.value === "@awsless/i18n/T") {
		for (const specifier of statement.specifiers) if (specifier.type === "ImportDefaultSpecifier" || specifier.type === "ImportSpecifier" && specifier.imported.type === "Identifier" && specifier.imported.name === "default") names.add(specifier.local.name);
	}
	for (const statement of ast.instance?.content.body ?? []) if (!isTImport(statement)) statementBindings(statement).forEach((name) => names.delete(name));
	if (names.size === 0) return {
		names,
		ours
	};
	const walk = (nodes, scope, lets = [], component = false) => {
		const inner = new Set(scope);
		const declared = [];
		for (const node of nodes) {
			if (node.type === "ConstTag" || node.type === "DeclarationTag") node.declaration.declarations.forEach((declaration) => declared.push(...patternNames(declaration.id)));
			if (node.type === "SnippetBlock") inner.add(node.expression.name);
		}
		const full = /* @__PURE__ */ new Set([
			...inner,
			...declared,
			...lets
		]);
		for (const node of nodes) {
			const current = component && hasSlotAttribute(node) ? inner : full;
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
					walk(node.fragment.nodes, current, letNames(node), COMPONENTS.has(node.type));
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
const isBlank = (node) => node.type === "Comment" || node.type === "Text" && node.data.trim() === "";
const slotName = (node) => {
	if (!("attributes" in node)) return "default";
	const slot = node.attributes.find((attribute) => attribute.type === "Attribute" && attribute.name === "slot");
	const value = slot?.type === "Attribute" && Array.isArray(slot.value) ? slot.value[0] : void 0;
	return value?.type === "Text" ? value.data : "default";
};
const parseT = (code, file, options = {}) => {
	const internals = svelteInternals();
	const ast = parse(code, { modern: true });
	const components = [];
	const preserveAll = ast.options?.preserveWhitespace ?? options.preserveWhitespace ?? false;
	const preserveComments = options.preserveComments ?? false;
	const namespace = ast.options?.namespace ?? options.namespace ?? "html";
	const { ours } = resolveT(ast);
	annotate(ast, namespace, internals);
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
	const clean = (owner, nodes, context) => {
		const namespace = internals.inferNamespace(context.namespace, owner, nodes);
		const { trimmed } = internals.cleanNodes(owner, nodes, [...context.path, owner], namespace, context.preserve, preserveComments);
		return {
			kept: new Set(trimmed),
			namespace
		};
	};
	const bodies = (owner, nodes, context) => {
		const kept = /* @__PURE__ */ new Set();
		const namespaces = /* @__PURE__ */ new Map();
		const groups = /* @__PURE__ */ new Map();
		if (COMPONENTS.has(owner.type)) {
			for (const node of nodes) if (node.type !== "SnippetBlock") groups.set(slotName(node), [...groups.get(slotName(node)) ?? [], node]);
		} else groups.set("default", nodes);
		for (const group of groups.values()) {
			const cleaned = clean(owner, group, context);
			for (const node of cleaned.kept) {
				kept.add(node);
				namespaces.set(node, cleaned.namespace);
			}
		}
		return {
			kept,
			namespaces
		};
	};
	const build = (owner, nodes, context, extra, direct = false) => {
		const pieces = [];
		const expressions = [];
		const nested = [];
		let tags = 0;
		let content = false;
		const visit = (owner, nodes, context, direct) => {
			const { kept, namespaces } = bodies(owner, nodes, context);
			const inner = [...context.path, owner];
			if (direct && kept.size > 0) content = true;
			const first = nodes[0];
			let lead = 0;
			if (owner.type === "RegularElement" && owner.name === "textarea" && first?.type === "Text" && kept.has(first)) {
				lead = /^(\r?\n)+/.exec(code.slice(first.start, first.end))?.[0].length ?? 0;
				first.data = first.data.replace(/^(\r?\n)+/, "");
			}
			const below = (node, overrides) => ({
				...context,
				path: inner,
				namespace: namespaces.get(node) ?? context.namespace,
				...overrides
			});
			for (const node of nodes) switch (node.type) {
				case "Text": {
					const start = node === first ? node.start + lead : node.start;
					if (kept.has(node) && node.data !== "") pieces.push({
						start,
						end: node.end,
						token: {
							type: "text",
							value: node.data
						}
					});
					else pieces.push({
						start,
						end: node.end,
						token: {
							type: "text",
							value: ""
						},
						dropped: true
					});
					break;
				}
				case "Comment":
					if (kept.has(node)) pieces.push({
						start: node.start,
						end: node.end,
						token: {
							type: "self",
							n: ++tags
						}
					});
					break;
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
						},
						snippet: node.type === "SnippetBlock"
					});
					for (const body of blockBodies(node)) nested.push(...build(node, body, below(node, {}), extra).segments);
					break;
				default: {
					if (node.type === "Component" && ours.has(node)) {
						if (!isRuntimeOnly(node, inner, namespace)) throw fail(node.start, "nested <T> is not supported inside <T>");
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
					if (node.type === "SvelteFragment" && direct) {
						const head = node.fragment.nodes[0];
						const last = node.fragment.nodes.at(-1);
						pieces.push({
							start: node.start,
							end: node.end,
							token: {
								type: "self",
								n: ++tags
							}
						});
						if (head && last) {
							extra.push({
								start: node.start,
								end: head.start,
								text: "{#if true}"
							});
							extra.push({
								start: last.end,
								end: node.end,
								text: "{/if}"
							});
							nested.push(...build(node, node.fragment.nodes, below(node, {}), extra).segments);
						} else extra.push({
							start: node.start,
							end: node.end,
							text: "{#if true}{/if}"
						});
						break;
					}
					const n = ++tags;
					const head = node.fragment.nodes[0];
					const last = node.fragment.nodes.at(-1);
					const slotted = hasSlotAttribute(node);
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
					if (!head || !last) {
						pieces.push({
							start: node.start,
							end: node.end,
							token: {
								type: "self",
								n
							},
							slotted
						});
						break;
					}
					const regular = node.type === "RegularElement";
					const current = namespaces.get(node) ?? context.namespace;
					const childNamespace = regular || node.type === "SvelteElement" ? internals.childNamespace(node, current) : current;
					const svgText = childNamespace === "svg" && (context.svgText || isSvgTextElement(node));
					const body = {
						restricted: regular && RESTRICTED.has(node.name) || childNamespace === "svg" && !svgText,
						component: COMPONENTS.has(node.type)
					};
					pieces.push({
						start: node.start,
						end: head.start,
						token: {
							type: "open",
							n
						},
						slotted,
						body
					});
					visit(node, node.fragment.nodes, below(node, {
						namespace: childNamespace,
						preserve: context.preserve || regular && (node.name === "pre" || node.name === "textarea"),
						restricted: body.restricted,
						svgText
					}), false);
					pieces.push({
						start: last.end,
						end: node.end,
						token: {
							type: "close",
							n
						},
						slotted
					});
				}
			}
		};
		visit(owner, nodes, context, direct);
		return {
			segments: [segment(merge(pieces), expressions, context.restricted), ...nested],
			content
		};
	};
	const root = {
		path: [ast],
		namespace,
		preserve: preserveAll,
		restricted: false,
		svgText: false
	};
	collect(code, ours, internals, namespace, ast.fragment.nodes, root, void 0, (node, head, foot, wrap, nodes, context) => {
		const extra = [];
		const built = nodes ? build(node, nodes, context, extra, true) : {
			segments: [],
			content: false
		};
		components.push({
			start: node.start,
			end: node.end,
			head,
			foot,
			wrap: wrap && {
				...wrap,
				tail: wrap.snippet && !built.content ? "{@render children()}" : ""
			},
			extra,
			segments: built.segments
		});
	});
	return {
		ast,
		components
	};
};
const collect = (code, ours, internals, componentNamespace, nodes, context, parent, found) => {
	for (const node of nodes) {
		if (node.type === "Component" && ours.has(node)) {
			if (isRuntimeOnly(node, context.path, componentNamespace)) continue;
			const slot = node.attributes.find((attribute) => attribute.type === "Attribute" && attribute.name === "slot");
			if (slot && !(parent && COMPONENTS.has(parent.type))) continue;
			const carried = node.attributes.filter((attribute) => attribute === slot || attribute.type === "LetDirective");
			const head = slot ? `<svelte:fragment ${carried.map((item) => code.slice(item.start, item.end)).join(" ")}>` : "";
			const foot = slot ? "</svelte:fragment>" : "";
			const children = node.fragment.nodes;
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
				snippet: snippet !== void 0
			}, children, context);
			else found(node, head, foot, void 0, void 0, context);
			continue;
		}
		const regular = node.type === "RegularElement";
		const namespace = regular || node.type === "SvelteElement" ? internals.childNamespace(node, context.namespace) : context.namespace;
		const svgText = namespace === "svg" && (context.svgText || "attributes" in node && isSvgTextElement(node));
		const inside = {
			path: [...context.path, node],
			namespace,
			preserve: context.preserve || regular && (node.name === "pre" || node.name === "textarea"),
			restricted: regular && RESTRICTED.has(node.name) || namespace === "svg" && !svgText,
			svgText
		};
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
			if (fragment?.type === "Fragment") {
				const inferred = internals.inferNamespace(inside.namespace, node, fragment.nodes);
				collect(code, ours, internals, componentNamespace, fragment.nodes, {
					...inside,
					namespace: inferred
				}, node, found);
			}
		}
	}
};
const merge = (pieces) => {
	const merged = [];
	for (const piece of pieces) {
		const previous = merged.at(-1);
		if (piece.dropped) merged.push({ ...piece });
		else if (piece.token.type === "text" && previous?.token.type === "text" && !previous.dropped) {
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
const segment = (pieces, expressions, restricted) => {
	const tokens = pieces.filter((piece) => !piece.dropped).map((piece) => piece.token);
	const runs = [];
	const sealed = [];
	if (pieces.length === 0) return {
		source: "",
		tokens,
		expressions,
		runs,
		sealed
	};
	const stack = [{
		n: 0,
		sealed: restricted
	}];
	const direct = (index) => {
		const open = pieces[index];
		let depth = 0;
		for (const piece of pieces.slice(index + 1)) if (piece.token.type === "open") {
			if (depth === 0 && !piece.slotted) return false;
			depth++;
		} else if (piece.token.type === "close") {
			if (depth === 0) return true;
			depth--;
		} else if (depth === 0 && !piece.dropped && !(piece.token.type === "self" && (piece.snippet || piece.slotted))) return false;
		return open.body?.component === true;
	};
	let current = [];
	let boundary = pieces[0].start;
	const flush = (next) => {
		const first = current[0];
		const last = current.at(-1);
		const kept = current.filter((piece) => !piece.dropped);
		const dropped = current.filter((piece) => piece.dropped).map(({ start, end }) => ({
			start,
			end
		}));
		if (stack.at(-1)?.sealed) sealed.push(runs.length);
		runs.push(first && last ? {
			start: first.start,
			end: last.end,
			tokens: kept.map((piece) => piece.token),
			dropped
		} : {
			start: boundary,
			end: boundary,
			tokens: [],
			dropped
		});
		current = [];
		boundary = next;
	};
	for (const [index, piece] of pieces.entries()) if (isRunToken(piece.token)) current.push(piece);
	else {
		flush(piece.end);
		if (piece.token.type === "open") {
			const body = piece.body;
			stack.push({
				n: piece.token.n,
				sealed: body?.restricted === true || body?.component === true && direct(index)
			});
		} else if (piece.token.type === "close") stack.pop();
	}
	flush(boundary);
	return {
		source: serialize(tokens),
		tokens,
		expressions,
		runs,
		sealed
	};
};
const collectSources = (component) => component.segments.filter((segment) => segment.source !== "").map((segment) => ({
	source: segment.source,
	sealed: segment.sealed
}));
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
* the tags of the source in order, every placeholder in its own run, and
* the sealed runs empty. */
const validateTranslation = (source, translation, sealed = []) => {
	const expected = splitRuns(tokenize(source));
	const actual = splitRuns(tokenize(translation));
	if (expected.tags.join(" ") !== actual.tags.join(" ")) return "the numbered tags differ from the source";
	if (sealed.some((index) => serialize(actual.runs[index] ?? []) !== serialize(expected.runs[index]))) return "text was changed where the surrounding element or component allows none";
	for (const [index, run] of expected.runs.entries()) if (placeholdersOf(run) !== placeholdersOf(actual.runs[index])) return "a placeholder is missing, duplicated or moved across a tag";
};
/** A name for the imported `lang` that nothing in the file uses: every
* identifier in the scripts and the template counts, bound or not. */
const aliasFor = (ast, base = "__i18n_lang") => {
	const taken = /* @__PURE__ */ new Set();
	const seen = /* @__PURE__ */ new Set();
	const walk = (value) => {
		if (!value || typeof value !== "object" || seen.has(value)) return;
		seen.add(value);
		if (Array.isArray(value)) {
			value.forEach(walk);
			return;
		}
		const node = value;
		if (node.type === "Identifier" && typeof node.name === "string") taken.add(node.name);
		if ((node.type === "LetDirective" || node.type === "EachBlock") && typeof node.index === "string") taken.add(node.index);
		if (node.type === "LetDirective" && typeof node.name === "string") taken.add(node.name);
		Object.values(node).forEach(walk);
	};
	walk(ast);
	let alias = base;
	for (let suffix = 1; taken.has(alias); suffix++) alias = `${base}${suffix}`;
	return alias;
};
const partsOf = (tokens, positions) => tokens.map((token) => {
	if (token.type === "text") return token.value;
	if (token.type !== "expr" || !positions.has(token.index)) throw new Error(`Translation references ${serialize([token])} which is not in this run of the source.`);
	return positions.get(token.index);
});
const escapeMarkup = (text) => text.replace(/[&<{}]/g, (char) => ({
	"&": "&amp;",
	"<": "&lt;",
	"{": "&#123;",
	"}": "&#125;"
})[char]);
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
const transformT = (component, code, locales, lookup, warn, rewrites = [], alias = "__i18n_lang") => {
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
	edits.push(...component.extra);
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
			const problem = validateTranslation(segment.source, translation, segment.sealed);
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
		const calls = segment.runs.map((run, index) => {
			const indices = run.tokens.flatMap((token) => token.type === "expr" ? [token.index] : []);
			const positions = new Map(indices.map((expression, position) => [expression, position]));
			const source = JSON.stringify(partsOf(run.tokens, positions));
			const changed = translations.flatMap((item) => {
				const parts = JSON.stringify(partsOf(item.runs[index], positions));
				return parts === source ? [] : [`"${item.locale}":${parts}`];
			});
			const values = indices.length > 0 ? `, [${indices.map((i) => `${alias}.t.str((${spliced(code, segment.expressions[i], rewrites)}))`).join(", ")}]` : "";
			const literal = run.tokens.map((token) => token.type === "text" ? escapeMarkup(token.value) : `{${spliced(code, segment.expressions[token.index], rewrites)}}`).join("");
			return {
				run,
				changed,
				text: changed.length > 0 ? `{${alias}.t.pick(${source}, {${changed.join(",")}}${values})}` : literal
			};
		});
		if (!calls.some((call) => call.changed.length > 0)) continue;
		for (const { run, changed, text } of calls) {
			if (run.tokens.length === 0 && changed.length === 0) {
				edits.push(...run.dropped.map((range) => ({
					...range,
					text: ""
				})));
				continue;
			}
			edits.push({
				start: run.start,
				end: run.end,
				text
			});
			translated ||= changed.length > 0;
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
const findSvelteTranslatable = (code, file, options = {}) => {
	const { ast, components } = parseT(code, file, options);
	return [...findTaggedTemplates(ast, code).map((item) => ({
		source: item.source,
		kind: "t"
	})), ...components.flatMap((component) => collectSources(component).map((item) => ({
		...item,
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
const findTranslatable = async (cwd, options = {}) => {
	const files = await glob("**/*.{js,ts,svelte}", {
		cwd,
		ignore: ["**/node_modules/**", "**/.*/**"]
	});
	const found = [];
	for (const file of files) found.push(...await findTranslatableInCode(file, await readFile(join$1(cwd, file), "utf8"), options));
	return found;
};
const findTranslatableInCode = async (file, code, options = {}) => {
	const svelte = file.endsWith(".svelte");
	if (!code.includes("lang.t`") && !(svelte && hasT(code))) return [];
	return svelte ? findSvelteTranslatable(code, file, options) : findTypescriptTranslatable(code);
};
//#endregion
//#region src/vite.ts
const SOURCE_FILE = /\.(svelte|ts|js)$/;
const langImport = (alias) => `import { lang as ${alias} } from '@awsless/i18n/svelte'`;
const outermost = (tagged) => tagged.filter((item) => !tagged.some((other) => other !== item && other.start <= item.start && item.end <= other.end));
const isSvelteFile = (id = "") => extname(id.split("?")[0]) === ".svelte";
const svelteCompilerOptions = (plugins) => {
	for (const plugin of plugins) {
		const api = plugin.api;
		if (plugin.name.startsWith("vite-plugin-svelte") && api?.options?.compilerOptions) return api.options.compilerOptions;
	}
	return {};
};
const i18n = (props) => {
	let cache;
	let options = {
		preserveWhitespace: props.preserveWhitespace,
		preserveComments: props.preserveComments,
		namespace: props.namespace
	};
	let generatedCache;
	let overrideCache;
	let queue = Promise.resolve();
	const translateMissing = (cwd, sources, log) => {
		queue = queue.catch(() => {}).then(() => translateNow(cwd, sources, log));
		return queue;
	};
	const translateNow = async (cwd, sources, log) => {
		const newSourceTexts = findNewTranslations(cache, sources.map((item) => item.source), props.locales);
		const markup = /* @__PURE__ */ new Map();
		for (const item of sources) if (item.kind === "markup") markup.set(item.source, [.../* @__PURE__ */ new Set([...markup.get(item.source) ?? [], ...item.sealed ?? []])]);
		if (newSourceTexts.length > 0) {
			log.info(`Translating ${newSourceTexts.length} new texts.`);
			const translations = await props.translate(props.default ?? "en", newSourceTexts);
			log.info(`Translated ${translations.length} texts.`);
			for (const item of translations) {
				const sealed = markup.get(item.source);
				const problem = sealed ? validateTranslation(item.source, item.translation, sealed) : validatePlaceholders(item.source, item.translation);
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
		configResolved(config) {
			svelteInternals();
			const compiler = svelteCompilerOptions(config.plugins);
			options = {
				preserveWhitespace: props.preserveWhitespace ?? compiler.preserveWhitespace,
				preserveComments: props.preserveComments ?? compiler.preserveComments,
				namespace: props.namespace ?? compiler.namespace
			};
		},
		async buildStart() {
			const cwd = process.cwd();
			this.info("Finding all translatable text...");
			const sources = await findTranslatable(cwd, options);
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
			const sources = await findTranslatableInCode(file, await read(), options);
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
				const { ast, components } = parseT(code, id, options);
				const alias = aliasFor(ast);
				const templates = rewrites(findTaggedTemplates(ast, code));
				const lookup = (source, locale) => cache.get(source, locale);
				const edits = [];
				let called = false;
				for (const component of components) {
					const result = transformT(component, code, props.locales, lookup, (message) => this.warn(message), templates, alias);
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
						transformedCode.appendLeft(start, `${langImport(alias)}${sameLine ? ";\n" : ""}`);
					} else transformedCode.prepend(`<script>\n\t${langImport(alias)}\n<\/script>\n`);
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
