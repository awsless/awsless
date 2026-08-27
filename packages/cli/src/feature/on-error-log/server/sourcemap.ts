import { originalPositionFor, sourceContentFor, TraceMap } from '@jridgewell/trace-mapping'

// Maps the minified stack trace of a runtime error back to the
// original source, using the sourcemaps the deploy uploaded next to
// the code. Every step is best-effort: any failure leaves the frame
// (or the whole trace) exactly as it came in, so mapping can never
// break error delivery.

export type SourcemapLoaders = {
	// The sourcemap prefix baked into the erroring function version's
	// env, resolved through GetFunctionConfiguration.
	loadPrefix: (functionName: string, version: string) => Promise<string | undefined>
	// The raw sourcemap json for a bucket key.
	loadMap: (key: string) => Promise<string | undefined>
}

// Stack frames the lambda runtime emits, covering both the cjs & esm
// path shapes: "at fn (/var/task/chunk.mjs:1:2)", "at /var/task/...",
// & "at fn (file:///var/task/chunk.mjs:1:2)".
const FRAME = /^(\s*at\s+)(?:(.*?)\s+\()?(?:file:\/\/)?\/var\/task\/([^\s:)]+):(\d+):(\d+)(\)?)\s*$/

// The error message templates where the engine names a minified
// identifier - the only message shapes worth rewriting. Everything
// else (thrown messages, property reads) is already original text.
const MESSAGE_TEMPLATES = /^([A-Za-z_$][\w$]{0,2}) (is not a (?:function|constructor)|is not defined|is not iterable)/

type ResolvedFrame = {
	at: string
	caller?: string
	location: string
	// The original identifier at the frame's call site. It names the
	// function the frame below runs - and for the top frame, the token
	// the engine put into a "x is not a function" message.
	callee?: string
}

export const createSymbolicator = (loaders: SourcemapLoaders) => {
	// Version prefixes & parsed maps cache in warm memory. Bounded: an
	// error burst across many versions must never grow them forever.
	const prefixes = new Map<string, Promise<string | undefined>>()
	const maps = new Map<string, Promise<TraceMap | undefined>>()

	const bound = <K, V>(cache: Map<K, V>, limit: number) => {
		while (cache.size > limit) {
			cache.delete(cache.keys().next().value!)
		}
	}

	// Only found prefixes cache. A missing index can be transient (the
	// deploy writes it moments after a version goes live) & a rejection
	// (a throttle, a network blip) always is - both evict themselves, so
	// the next error simply retries instead of permanently disabling
	// mapping for a version in a warm container.
	const prefixFor = (functionName: string, version: string) => {
		const key = `${functionName}:${version}`

		if (!prefixes.has(key)) {
			const promise = loaders.loadPrefix(functionName, version)

			promise.then(
				prefix => prefix === undefined && prefixes.delete(key),
				() => prefixes.delete(key)
			)
			prefixes.set(key, promise)
			bound(prefixes, 100)
		}

		return prefixes.get(key)!
	}

	const mapFor = (key: string) => {
		if (!maps.has(key)) {
			const promise = loaders.loadMap(key).then(json => (json ? new TraceMap(JSON.parse(json)) : undefined))

			promise.catch(() => maps.delete(key))
			maps.set(key, promise)
			bound(maps, 6)
		}

		return maps.get(key)!
	}

	// The original identifier at a mapped position. Minified maps often
	// ship an empty names table, so the fallback reads the token straight
	// out of the embedded original source. An imprecise mapping can land
	// on a keyword instead of an identifier - never worth reporting.
	const KEYWORDS = new Set([
		'new',
		'return',
		'throw',
		'await',
		'async',
		'typeof',
		'void',
		'delete',
		'const',
		'let',
		'var',
		'function',
		'class',
		'this',
		'super',
		'yield',
		'if',
		'else',
		'for',
		'while',
		'do',
		'switch',
		'case',
		'try',
		'catch',
		'in',
		'of',
	])

	const identifierAt = (
		map: TraceMap,
		position: { source: string; line: number; column: number; name: string | null }
	) => {
		if (position.name) {
			return position.name
		}

		const content = sourceContentFor(map, position.source)
		const line = content?.split('\n')[position.line - 1]
		const token = line?.slice(position.column).match(/^[A-Za-z_$][\w$]*/)?.[0]

		return token && !KEYWORDS.has(token) ? token : undefined
	}

	// The map's sources sit relative to the build output, so the parent
	// hops carry no meaning - and dependency sources read best from
	// their package root. Route module queries never belong in a path.
	const cleanSource = (source: string) => {
		const path = source.split('?')[0]!
		const nested = path.lastIndexOf('node_modules/')

		if (nested >= 0) {
			return path.slice(nested + 'node_modules/'.length)
		}

		return path.replace(/^(\.\.\/)+/, '')
	}

	return async (error: {
		functionName: string
		version: string
		message: string
		stackTrace?: string[]
	}): Promise<{ message: string; stackTrace?: string[] }> => {
		const passthrough = { message: error.message, stackTrace: error.stackTrace }

		try {
			if (!error.stackTrace?.length) {
				return passthrough
			}

			const prefix = await prefixFor(error.functionName, error.version)

			if (!prefix) {
				return passthrough
			}

			const resolved = await Promise.all(
				error.stackTrace.map(async (line): Promise<ResolvedFrame | undefined> => {
					const match = FRAME.exec(line)

					if (!match) {
						return undefined
					}

					const [, at, caller, file, lineNo, columnNo] = match
					const map = await mapFor(`${prefix}${file}.map`)

					if (!map) {
						return undefined
					}

					const position = originalPositionFor(map, {
						line: Number(lineNo),
						// V8 columns are 1-based, sourcemap columns 0-based.
						column: Number(columnNo) - 1,
					})

					if (position.source === null || position.line === null) {
						return undefined
					}

					const source = cleanSource(position.source)

					return {
						at: at!,
						caller,
						location: `${source}:${position.line}:${(position.column ?? 0) + 1}`,
						callee: identifierAt(map, position as never),
					}
				})
			)

			const stackTrace = error.stackTrace.map((line, index) => {
				const frame = resolved[index]

				if (!frame) {
					return line
				}

				// A stack frame names the function ENCLOSING its position,
				// & the call-site token of the frame below is that very
				// function - so the name shifts up one frame. The last
				// mapped frame keeps its minified name.
				const name = resolved[index + 1]?.callee ?? frame.caller

				return name ? `${frame.at}${name} (${frame.location})` : `${frame.at}${frame.location}`
			})

			// "x is not a function" style messages name the token at the
			// top frame's call site - when it mapped, the message follows
			// it & stays consistent with the rewritten stack.
			let message = error.message
			const template = MESSAGE_TEMPLATES.exec(message)

			// Only the very first stack frame is the throw site - a frame
			// further down names some caller, never the token the engine
			// put into the message.
			const firstFrame = error.stackTrace.findIndex(line => FRAME.test(line))
			const top = firstFrame >= 0 ? resolved[firstFrame] : undefined

			if (template && top?.callee) {
				message = `${top.callee} ${template[2]}${message.slice(template[0].length)}`

				// The stack's leading "TypeError: ..." line carries the same
				// minified message & follows the rewrite.
				if (stackTrace[0] && !resolved[0] && stackTrace[0].endsWith(error.message)) {
					stackTrace[0] = stackTrace[0].slice(0, -error.message.length) + message
				}
			}

			return { message, stackTrace }
		} catch {
			return passthrough
		}
	}
}
