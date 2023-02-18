
export type StackFrame = {
	file: string
	lineNumber?: number
	columnNumber?: number
	method: string
}

export type StackTrace = {
	stacktrace?: string
}

const CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+:\d+|\(native\))/m

export const getStackString = (error: Error): string | undefined => {
	const stack = error.stack || (error as StackTrace).stacktrace
	return typeof stack === 'string' &&
		stack.length &&
		stack !== `${error.name}: ${error.message}`
		? stack
		: undefined
}

export const parseStack = (stackString: string): Array<StackFrame> => {
	const partialResult = parseV8OrIE(stackString)

	return partialResult.reduce<StackFrame[]>((result, stack) => {
		// Drop empty stack frames
		if (JSON.stringify(stack) === '{}') {
			return result
		}

		// If we have no file or method but we _do_ have a line number, it must be
		// global code.
		let file = !stack.file && !stack.method && typeof stack.lineNumber === 'number'
			? 'global code'
			: stack.file || '(unknown file)'

		// Strip the query string / fragment from filenames
		file = file.replace(/\?.*$/, '').replace(/#.*$/, '')

		// Case normalize "global code" function names
		let method = stack.method || '(unknown function)'
		method = /^global code$/i.test(method) ? 'global code' : method

		return result.concat([
			{
				file,
				lineNumber: stack.lineNumber,
				columnNumber: stack.columnNumber,
				method,
			},
		])
	}, [])
}

function parseV8OrIE(stackString: string): Array<Partial<StackFrame>> {
	const filtered = stackString
		.split('\n')
		.filter((line) => !!line.match(CHROME_IE_STACK_REGEXP))

	return filtered.map((line) => {
		// Bugsnag stack frames don't have a way of representing eval origins
		// so we just throw that information away for now.
		//
		// stacktrace.js can represent this but it still throws this information
		// away.
		if (line.indexOf('(eval ') > -1) {
			line = line
				.replace(/eval code/g, 'eval')
				.replace(/(\(eval at [^()]*)|(\),.*$)/g, '')
		}

		let sanitizedLine = line.replace(/^\s+/, '').replace(/\(eval code/g, '(')

		// Capture and preserve the parenthesized location "(/foo/my bar.js:12:87)"
		// in case it has spaces in it, as the string is split on \s+ later on.
		const location = sanitizedLine.match(/ (\((.+):(\d+):(\d+)\)$)/)

		// Remove the parenthesized location from the line, if it was matched.
		sanitizedLine = location
			? sanitizedLine.replace(location[0], '')
			: sanitizedLine

		const tokens = sanitizedLine.split(/\s+/).slice(1)

		// If a location was matched, pass it to extractLocation(), otherwise pop
		// the last token.
		const locationParts = extractLocation(location ? location[1] : tokens.pop() || '(no location)')

		const method = tokens.join(' ') || undefined
		const file = ['eval', '<anonymous>'].indexOf(locationParts[0]) > -1
			? undefined
			: locationParts[0]

		return {
			file,
			lineNumber: locationParts[1],
			columnNumber: locationParts[2],
			method,
		}
	})
}

// Separate line and column numbers from a string of the form: (URI:Line:Column)
function extractLocation(urlLike: string): [uri: string, line?: number | undefined, col?: number | undefined] {
	// Fail-fast but return locations like "(native)"
	if (urlLike.indexOf(':') === -1) {
		return [urlLike]
	}

	const regExp = /(.+?)(?::(\d+))?(?::(\d+))?$/
	const parts = regExp.exec(urlLike.replace(/[()]/g, ''))
	if (!parts) {
		return [urlLike]
	}

	const line = parts[2] ? parseInt(parts[2], 10) : undefined
	const col = parts[3] ? parseInt(parts[3], 10) : undefined

	return [parts[1], line, col]
}
