import { Cache } from './cache'
import { ComponentMatch } from './find/svelte'
import { buildTree, parseSource, tokenizeTranslation, Tree } from './tree'

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: ' ' }

// Static text is kept as written in the source, but the tree renders it
// through an expression, so entities have to be decoded here.
export const decodeEntities = (text: string) => {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
		if (entity[0] === '#') {
			const hex = entity[1] === 'x' || entity[1] === 'X'
			return String.fromCodePoint(parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10))
		}

		return ENTITIES[entity.toLowerCase()] ?? match
	})
}

/** Rewrite a <T> into the T component with a render tree per locale and a
 * snippet per node of the original markup. */
export const rewriteComponent = (
	match: ComponentMatch & { error?: undefined },
	locales: string[],
	cache: Cache,
	inline: (markup: string) => string,
	warn: (message: string) => void
) => {
	const { tokens, nodes } = parseSource(match.source)
	const trees: Record<string, Tree> = { src: buildTree(tokens, nodes, decodeEntities).tree! }

	for (const locale of locales) {
		const translation = cache.get(match, locale)

		if (typeof translation !== 'string' || translation === match.source) {
			continue
		}

		const result = buildTree(tokenizeTranslation(translation, nodes), nodes, decodeEntities)

		if (result.error !== undefined) {
			warn(`Skipped the "${locale}" translation of "${match.source}": ${result.error}`)
			continue
		}

		trees[locale] = result.tree
	}

	const snippets = match.snippets.map((markup, id) => {
		return `{#snippet n${id}(${nodes[id]!.leaf ? '' : 'c'})}${inline(markup)}{/snippet}`
	})

	return `<T tree={${JSON.stringify(trees)}}>${snippets.join('')}</T>`
}
