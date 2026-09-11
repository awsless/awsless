import { unsupported, illegalArgument } from '../errors'

export type Analyzer = (text: string) => string[]
export type Normalizer = (text: string) => string

type Tokenizer = (text: string) => string[]
type TokenFilter = (tokens: string[]) => string[]

// Lucene's default English stop set.
const ENGLISH_STOP_WORDS = new Set([
	'a',
	'an',
	'and',
	'are',
	'as',
	'at',
	'be',
	'but',
	'by',
	'for',
	'if',
	'in',
	'into',
	'is',
	'it',
	'no',
	'not',
	'of',
	'on',
	'or',
	'such',
	'that',
	'the',
	'their',
	'then',
	'there',
	'these',
	'they',
	'this',
	'to',
	'was',
	'will',
	'with',
])

// A compact Porter stemmer: close enough to Lucene's for local matching.
const porterStem = (word: string): string => {
	if (word.length < 3) return word

	const c = '[^aeiou]'
	const v = '[aeiouy]'
	const C = `${c}[^aeiouy]*`
	const V = `${v}[aeiou]*`
	const mgr0 = new RegExp(`^(${C})?${V}${C}`)
	const meq1 = new RegExp(`^(${C})?${V}${C}(${V})?$`)
	const mgr1 = new RegExp(`^(${C})?${V}${C}${V}${C}`)
	const hasVowel = new RegExp(`^(${C})?${v}`)

	let w = word
	const first = w[0]
	if (first === 'y') w = `Y${w.slice(1)}`

	// Step 1a
	if (/(ss|i)es$/.test(w)) w = w.replace(/(ss|i)es$/, '$1')
	else if (/([^s])s$/.test(w)) w = w.replace(/([^s])s$/, '$1')

	// Step 1b
	if (w.endsWith('eed')) {
		const stem = w.replace(/eed$/, '')
		if (mgr0.test(stem)) w = `${stem}ee`
	} else {
		const match = /^(.+?)(ed|ing)$/.exec(w)
		if (match && hasVowel.test(match[1]!)) {
			w = match[1]!
			if (/(at|bl|iz)$/.test(w)) w = `${w}e`
			else if (/([^aeiouylsz])\1$/.test(w)) w = w.slice(0, -1)
			else if (new RegExp(`^${C}${v}[^aeiouwxy]$`).test(w)) w = `${w}e`
		}
	}

	// Step 1c
	{
		const match = /^(.+?)y$/.exec(w)
		if (match && hasVowel.test(match[1]!)) w = `${match[1]}i`
	}

	// Step 2
	const step2: Record<string, string> = {
		ational: 'ate',
		tional: 'tion',
		enci: 'ence',
		anci: 'ance',
		izer: 'ize',
		bli: 'ble',
		alli: 'al',
		entli: 'ent',
		eli: 'e',
		ousli: 'ous',
		ization: 'ize',
		ation: 'ate',
		ator: 'ate',
		alism: 'al',
		iveness: 'ive',
		fulness: 'ful',
		ousness: 'ous',
		aliti: 'al',
		iviti: 'ive',
		biliti: 'ble',
		logi: 'log',
	}
	{
		const match =
			/^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/.exec(
				w
			)
		if (match && mgr0.test(match[1]!)) w = match[1]! + step2[match[2]!]!
	}

	// Step 3
	const step3: Record<string, string> = {
		icate: 'ic',
		ative: '',
		alize: 'al',
		iciti: 'ic',
		ical: 'ic',
		ful: '',
		ness: '',
	}
	{
		const match = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/.exec(w)
		if (match && mgr0.test(match[1]!)) w = match[1]! + step3[match[2]!]!
	}

	// Step 4
	{
		const match = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/.exec(w)
		if (match && mgr1.test(match[1]!)) {
			w = match[1]!
		} else {
			const ion = /^(.+?)(s|t)(ion)$/.exec(w)
			if (ion && mgr1.test(ion[1]! + ion[2]!)) w = ion[1]! + ion[2]!
		}
	}

	// Step 5
	{
		const match = /^(.+?)e$/.exec(w)
		if (match) {
			const stem = match[1]!
			if (mgr1.test(stem) || (meq1.test(stem) && !new RegExp(`^${C}${v}[^aeiouwxy]$`).test(stem))) w = stem
		}
	}
	if (w.endsWith('ll') && mgr1.test(w)) w = w.slice(0, -1)

	if (first === 'y') w = `y${w.slice(1)}`
	return w
}

// Approximates Lucene's UAX#29 tokenizer: letters, digits and underscores
// form words, and a single apostrophe, dot or colon can join two words.
const standardTokenizer: Tokenizer = text => {
	return text.match(/[\p{L}\p{N}_]+(?:['’.:][\p{L}\p{N}_]+)*/gu) ?? []
}

const letterTokenizer: Tokenizer = text => text.match(/\p{L}+/gu) ?? []
const whitespaceTokenizer: Tokenizer = text => text.split(/\s+/).filter(Boolean)
const keywordTokenizer: Tokenizer = text => [text]

const lowercase: TokenFilter = tokens => tokens.map(t => t.toLowerCase())
const uppercase: TokenFilter = tokens => tokens.map(t => t.toUpperCase())
const trim: TokenFilter = tokens => tokens.map(t => t.trim())
const asciifolding: TokenFilter = tokens => tokens.map(foldAscii)
const englishPossessive: TokenFilter = tokens => tokens.map(t => t.replace(/['’]s$/i, ''))
const porter: TokenFilter = tokens => tokens.map(porterStem)

export const foldAscii = (text: string) => text.normalize('NFD').replace(/\p{M}+/gu, '')

const stopFilter = (words: Set<string>): TokenFilter => {
	return tokens => tokens.filter(t => !words.has(t))
}

const ngramFilter = (min: number, max: number, edge: boolean): TokenFilter => {
	return tokens => {
		const out: string[] = []
		for (const token of tokens) {
			for (let start = 0; start < (edge ? 1 : token.length); start++) {
				for (let size = min; size <= max && start + size <= token.length; size++) {
					out.push(token.slice(start, start + size))
				}
			}
		}
		return out
	}
}

const compose = (tokenizer: Tokenizer, filters: TokenFilter[]): Analyzer => {
	return text => filters.reduce((tokens, filter) => filter(tokens), tokenizer(text)).filter(t => t.length > 0)
}

const BUILTIN_ANALYZERS: Record<string, Analyzer> = {
	standard: compose(standardTokenizer, [lowercase]),
	simple: compose(letterTokenizer, [lowercase]),
	whitespace: compose(whitespaceTokenizer, []),
	keyword: compose(keywordTokenizer, []),
	english: compose(standardTokenizer, [englishPossessive, lowercase, stopFilter(ENGLISH_STOP_WORDS), porter]),
}

const BUILTIN_TOKENIZERS: Record<string, Tokenizer> = {
	standard: standardTokenizer,
	letter: letterTokenizer,
	lowercase: text => lowercase(letterTokenizer(text)),
	whitespace: whitespaceTokenizer,
	keyword: keywordTokenizer,
}

const BUILTIN_FILTERS: Record<string, TokenFilter> = {
	lowercase,
	uppercase,
	trim,
	asciifolding,
	stop: stopFilter(ENGLISH_STOP_WORDS),
	porter_stem: porter,
	stemmer: porter,
	kstem: porter,
}

const BUILTIN_NORMALIZER_FILTERS: Record<string, TokenFilter> = { lowercase, uppercase, trim, asciifolding }

type Settings = Record<string, unknown>

const asObject = (value: unknown): Record<string, unknown> | undefined => {
	return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Settings) : undefined
}

const asStringList = (value: unknown): string[] => {
	if (typeof value === 'string') return [value]
	if (Array.isArray(value) && value.every(v => typeof v === 'string')) return value
	return []
}

const stopWordsFrom = (value: unknown): Set<string> => {
	if (value === undefined || value === '_english_') return ENGLISH_STOP_WORDS
	if (value === '_none_') return new Set()
	if (Array.isArray(value)) return new Set(asStringList(value))
	throw unsupported(`the stopwords setting "${String(value)}"`)
}

export type AnalysisRegistry = {
	analyzer: (name: string) => Analyzer
	normalizer: (name: string) => Normalizer
	hasAnalyzer: (name: string) => boolean
	hasNormalizer: (name: string) => boolean
}

// Validates settings.analysis up front so an unsupported analyzer fails at
// index creation instead of silently tokenizing differently later.
export const buildAnalysis = (analysis: unknown): AnalysisRegistry => {
	const settings = asObject(analysis) ?? {}
	const filters: Record<string, TokenFilter> = { ...BUILTIN_FILTERS }
	const analyzers: Record<string, Analyzer> = { ...BUILTIN_ANALYZERS }
	const normalizers: Record<string, Normalizer> = {}

	for (const key of Object.keys(settings)) {
		if (!['analyzer', 'filter', 'normalizer', 'tokenizer', 'char_filter'].includes(key)) {
			throw unsupported(`the analysis setting "${key}"`)
		}
	}

	if (settings.char_filter && Object.keys(asObject(settings.char_filter) ?? {}).length > 0) {
		throw unsupported('custom char_filter definitions')
	}

	const tokenizers: Record<string, Tokenizer> = { ...BUILTIN_TOKENIZERS }
	for (const [name, def] of Object.entries(asObject(settings.tokenizer) ?? {})) {
		const config = asObject(def) ?? {}
		const type = String(config.type)
		if (type === 'edge_ngram' || type === 'ngram') {
			const min = Number(config.min_gram ?? 1)
			const max = Number(config.max_gram ?? 2)
			const gram = ngramFilter(min, max, type === 'edge_ngram')
			tokenizers[name] = text => gram([text])
		} else if (BUILTIN_TOKENIZERS[type]) {
			tokenizers[name] = BUILTIN_TOKENIZERS[type]
		} else {
			throw unsupported(`the "${type}" tokenizer`)
		}
	}

	for (const [name, def] of Object.entries(asObject(settings.filter) ?? {})) {
		const config = asObject(def) ?? {}
		const type = String(config.type)
		if (type === 'edge_ngram' || type === 'ngram') {
			filters[name] = ngramFilter(
				Number(config.min_gram ?? 1),
				Number(config.max_gram ?? 2),
				type === 'edge_ngram'
			)
		} else if (type === 'stop') {
			filters[name] = stopFilter(stopWordsFrom(config.stopwords))
		} else if (type === 'stemmer') {
			const language = config.language ?? config.name ?? 'english'
			if (language !== 'english' && language !== 'porter' && language !== 'light_english') {
				throw unsupported(`the "${String(language)}" stemmer`)
			}
			filters[name] = porter
		} else if (BUILTIN_FILTERS[type]) {
			filters[name] = BUILTIN_FILTERS[type]
		} else {
			throw unsupported(`the "${type}" token filter`)
		}
	}

	for (const [name, def] of Object.entries(asObject(settings.analyzer) ?? {})) {
		const config = asObject(def) ?? {}
		const type = String(config.type ?? 'custom')
		if (type === 'custom') {
			if (asStringList(config.char_filter).length > 0) {
				throw unsupported('char_filter in custom analyzers')
			}
			const tokenizerName = String(config.tokenizer ?? 'standard')
			const tokenizer = tokenizers[tokenizerName]
			if (!tokenizer) throw unsupported(`the "${tokenizerName}" tokenizer`)
			const chain = asStringList(config.filter).map(filterName => {
				const filter = filters[filterName]
				if (!filter) throw unsupported(`the "${filterName}" token filter`)
				return filter
			})
			analyzers[name] = compose(tokenizer, chain)
		} else if (type === 'standard') {
			analyzers[name] = compose(standardTokenizer, [
				lowercase,
				stopFilter(stopWordsFrom(config.stopwords ?? '_none_')),
			])
		} else if (type === 'stop') {
			analyzers[name] = compose(letterTokenizer, [lowercase, stopFilter(stopWordsFrom(config.stopwords))])
		} else if (BUILTIN_ANALYZERS[type]) {
			analyzers[name] = BUILTIN_ANALYZERS[type]
		} else {
			throw unsupported(`the "${type}" analyzer`)
		}
	}

	for (const [name, def] of Object.entries(asObject(settings.normalizer) ?? {})) {
		const config = asObject(def) ?? {}
		if (asStringList(config.char_filter).length > 0) {
			throw unsupported('char_filter in normalizers')
		}
		const chain = asStringList(config.filter).map(filterName => {
			const filter = BUILTIN_NORMALIZER_FILTERS[filterName]
			if (!filter) throw unsupported(`the "${filterName}" normalizer filter`)
			return filter
		})
		normalizers[name] = text => chain.reduce((tokens, filter) => filter(tokens), [text])[0] ?? ''
	}

	return {
		hasAnalyzer: name => name in analyzers,
		hasNormalizer: name => name in normalizers,
		analyzer: name => {
			const analyzer = analyzers[name]
			if (!analyzer) throw illegalArgument(`analyzer [${name}] has not been configured in mappings`)
			return analyzer
		},
		normalizer: name => {
			const normalizer = normalizers[name]
			if (!normalizer) throw illegalArgument(`normalizer [${name}] has not been configured in mappings`)
			return normalizer
		},
	}
}
