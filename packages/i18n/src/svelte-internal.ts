import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { AST } from 'svelte/compiler'

export type Namespace = 'html' | 'svg' | 'mathml'

// The shape clean_nodes works on; our AST nodes are passed through as is.
export type SvelteNode = { type: string; name?: string; start?: number; end?: number }

type Cleaned = { hoisted: SvelteNode[]; trimmed: SvelteNode[] }

export type SvelteInternals = {
	version: string
	/** Trims and collapses the text of one body exactly as Svelte renders it, in place. */
	cleanNodes: (
		parent: SvelteNode,
		nodes: SvelteNode[],
		path: SvelteNode[],
		namespace: Namespace,
		preserveWhitespace: boolean,
		preserveComments: boolean
	) => Cleaned
	inferNamespace: (namespace: Namespace, parent: SvelteNode, nodes: SvelteNode[]) => Namespace
	childNamespace: (node: SvelteNode, namespace: Namespace) => Namespace
	isSvg: (name: string) => boolean
	isMathml: (name: string) => boolean
}

type Fn = (...args: unknown[]) => unknown

// clean_nodes reads two things from the compiler state: whether to sort
// const tags, which needs scopes and only moves hoisted nodes around, and
// the hmr flag behind an anchor optimisation.
const state = (preserveComments: boolean) => ({
	analysis: { runes: true },
	options: { hmr: false, preserveComments },
})

const isCleaned = (value: unknown): value is Cleaned =>
	typeof value === 'object' &&
	value !== null &&
	Array.isArray((value as Cleaned).hoisted) &&
	Array.isArray((value as Cleaned).trimmed)

let loaded: SvelteInternals | undefined

/** Svelte's whitespace cleaning is not public API, so it is taken from the
 * compiler sources shipped in the package and checked once up front, so a
 * Svelte release that moves it fails with a clear message instead of odd output. */
export const svelteInternals = (): SvelteInternals => {
	if (loaded) {
		return loaded
	}

	const require = createRequire(import.meta.url)
	const manifest = require.resolve('svelte/package.json')
	const { version } = require(manifest) as { version: string }
	const root = dirname(manifest)

	const fail = (reason: string) =>
		new Error(
			`@awsless/i18n mirrors svelte's whitespace handling through its compiler internals, but svelte ${version} ${reason}.`
		)

	let transform: Record<string, unknown>
	let utils: Record<string, unknown>

	try {
		transform = require(join(root, 'src/compiler/phases/3-transform/utils.js'))
		utils = require(join(root, 'src/utils.js'))
	} catch (error) {
		throw fail(`does not ship them where expected (${error instanceof Error ? error.message : String(error)})`)
	}

	const { clean_nodes, infer_namespace, determine_namespace_for_children } = transform
	const { is_svg, is_mathml } = utils

	if (
		[clean_nodes, infer_namespace, determine_namespace_for_children, is_svg, is_mathml].some(
			fn => typeof fn !== 'function'
		)
	) {
		throw fail('is missing clean_nodes, infer_namespace, determine_namespace_for_children, is_svg or is_mathml')
	}

	// A dry run proves the signature: an empty fragment cleans to empty lists.
	let probe: unknown

	try {
		probe = (clean_nodes as Fn)({ type: 'Fragment', nodes: [] }, [], [], 'html', state(false), false, false)
	} catch (error) {
		throw fail(
			`rejects clean_nodes(parent, nodes, path, namespace, state, preserveWhitespace, preserveComments) (${error instanceof Error ? error.message : String(error)})`
		)
	}

	if (!isCleaned(probe)) {
		throw fail('returns an unexpected shape from clean_nodes')
	}

	loaded = {
		version,
		cleanNodes: (parent, nodes, path, namespace, preserveWhitespace, preserveComments) => {
			const { hoisted, trimmed } = (clean_nodes as Fn)(
				parent,
				nodes,
				path,
				namespace,
				state(preserveComments),
				preserveWhitespace,
				preserveComments
			) as Cleaned

			return { hoisted, trimmed }
		},
		inferNamespace: infer_namespace as SvelteInternals['inferNamespace'],
		childNamespace: determine_namespace_for_children as SvelteInternals['childNamespace'],
		isSvg: is_svg as SvelteInternals['isSvg'],
		isMathml: is_mathml as SvelteInternals['isMathml'],
	}

	return loaded
}

type Annotated = { metadata?: { svg?: boolean; mathml?: boolean; dynamic?: boolean } }
type Nodes = AST.Fragment['nodes']

const NAMESPACE_SVG = 'http://www.w3.org/2000/svg'
const NAMESPACE_MATHML = 'http://www.w3.org/1998/Math/MathML'

const SLOT_RESET = new Set(['Component', 'SvelteComponent', 'SvelteFragment', 'SnippetBlock'])

const meta = (node: unknown) => node as Annotated

/** The namespace a <svelte:element> without xmlns gets from its ancestors, the
 * way svelte/src/compiler/phases/2-analyze/visitors/SvelteElement.js looks it
 * up: the nearest element's own, or the component's at a slot, a snippet or
 * the root. `path` starts at the root. */
export const lookupNamespace = (path: SvelteNode[], componentNamespace: Namespace): Namespace => {
	for (let i = path.length - 1; i >= 0; i--) {
		const ancestor = path[i]!

		if (i === 0 || SLOT_RESET.has(ancestor.type)) {
			return componentNamespace
		}

		if (ancestor.type === 'RegularElement' || ancestor.type === 'SvelteElement') {
			if (ancestor.type === 'RegularElement' && ancestor.name === 'foreignObject') {
				return 'html'
			}

			const metadata = meta(ancestor).metadata

			return metadata?.svg ? 'svg' : metadata?.mathml ? 'mathml' : 'html'
		}
	}

	return componentNamespace
}

/** parse() hands out the AST without the metadata the analysis phase adds,
 * and the cleaning reads two bits of it: the element namespace, computed here
 * the way svelte/src/compiler/phases/2-analyze/visitors/RegularElement.js and
 * SvelteElement.js do, and `dynamic` on components and render tags, which
 * only steers an anchor optimisation and stays false. */
export const annotate = (root: AST.Root, namespace: Namespace, internals: SvelteInternals) => {
	const walk = (nodes: Nodes, path: SvelteNode[]) => {
		for (const node of nodes) {
			if (node.type === 'RegularElement') {
				const nearest = path.findLast(ancestor => ancestor.type === 'RegularElement')
				const inherited = nearest ? meta(nearest).metadata?.svg === true : false

				meta(node).metadata = {
					svg: internals.isSvg(node.name) || ((node.name === 'a' || node.name === 'title') && inherited),
					mathml: internals.isMathml(node.name),
				}

				walk(node.fragment.nodes, [...path, node as SvelteNode])

				// A top level <a> takes the namespace of the svg elements inside it.
				if (node.name === 'a' && !nearest) {
					const svgChild = node.fragment.nodes.some(
						child => child.type === 'RegularElement' && child.name !== 'svg' && meta(child).metadata?.svg
					)
					meta(node).metadata!.svg ||= svgChild
				}
				continue
			}

			if (node.type === 'SvelteElement') {
				const xmlns = node.attributes.find(
					attribute =>
						attribute.type === 'Attribute' &&
						attribute.name === 'xmlns' &&
						Array.isArray(attribute.value) &&
						attribute.value.length === 1 &&
						attribute.value[0]?.type === 'Text'
				)

				if (
					xmlns &&
					xmlns.type === 'Attribute' &&
					Array.isArray(xmlns.value) &&
					xmlns.value[0]?.type === 'Text'
				) {
					const value = xmlns.value[0].data
					meta(node).metadata = { svg: value === NAMESPACE_SVG, mathml: value === NAMESPACE_MATHML }
				} else {
					const found = lookupNamespace(path, namespace)
					meta(node).metadata = { svg: found === 'svg', mathml: found === 'mathml' }
				}

				walk(node.fragment.nodes, [...path, node as SvelteNode])
				continue
			}

			if (
				node.type === 'Component' ||
				node.type === 'SvelteComponent' ||
				node.type === 'SvelteSelf' ||
				node.type === 'RenderTag'
			) {
				meta(node).metadata = { dynamic: false }
			}

			for (const key of ['fragment', 'consequent', 'alternate', 'body', 'fallback', 'pending', 'then', 'catch']) {
				const fragment = (node as unknown as Record<string, AST.Fragment | null | undefined>)[key]

				if (fragment?.type === 'Fragment') {
					walk(fragment.nodes, [...path, node as SvelteNode])
				}
			}
		}
	}

	walk(root.fragment.nodes, [root as unknown as SvelteNode])
}
