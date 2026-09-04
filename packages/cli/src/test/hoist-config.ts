// Top level `mock.config.<name> = value` lines hoist above the imports
// like vi.mock, so import time Config reads already see them.

const HOIST_PATTERN = /^mock\.config\.[A-Za-z_$][\w$]*\s*=\s*[^=].*?;?\s*$/
const VIRTUAL_PREFIX = 'awsless:hoisted-config:'

// A hoisted line runs alone in the virtual module, so an unclosed
// bracket or quote there would only surface as a cryptic syntax error.
const isBalanced = (line: string) => {
	const stack: string[] = []
	let quote: string | undefined

	for (let i = 0; i < line.length; i++) {
		const char = line[i]!

		if (quote) {
			if (char === '\\') {
				i++
			} else if (char === quote) {
				quote = undefined
			}

			continue
		}

		if (char === '"' || char === "'" || char === '`') {
			quote = char
		} else if (char === '(' || char === '[' || char === '{') {
			stack.push(char)
		} else if (char === ')' || char === ']' || char === '}') {
			const open = stack.pop()

			if ((char === ')' && open !== '(') || (char === ']' && open !== '[') || (char === '}' && open !== '{')) {
				return false
			}
		}
	}

	return stack.length === 0 && quote === undefined
}

export const hoistConfigPlugin = () => ({
	name: 'awsless:hoist-mock-config',
	resolveId(id: string) {
		if (id.startsWith(VIRTUAL_PREFIX)) {
			return '\0' + id
		}

		return
	},
	load(id: string) {
		if (id.startsWith('\0' + VIRTUAL_PREFIX)) {
			const statements = JSON.parse(Buffer.from(id.slice(VIRTUAL_PREFIX.length + 1), 'base64url').toString())

			return `import { mock } from 'awsless'\n${(statements as string[]).join('\n')}\n`
		}

		return
	},
	transform(code: string, id: string) {
		// The virtual module itself contains the hoisted statements &
		// must never be re-transformed into another virtual import.
		if (id.includes(VIRTUAL_PREFIX) || !code.includes('mock.config.')) {
			return
		}

		const lines = code.split('\n')
		const hoisted: string[] = []

		const kept = lines.map((line, index) => {
			// Only single line statements at column zero hoist - anything
			// nested runs in place, like vi.mock.
			if (HOIST_PATTERN.test(line)) {
				if (!isBalanced(line)) {
					throw new Error(
						`${id}:${index + 1}: a hoisted mock.config assignment must fit on one line - move the value into a variable or close it on the same line.`
					)
				}

				hoisted.push(line.trim().replace(/;\s*$/, ''))
				return ''
			}

			return line
		})

		if (hoisted.length === 0) {
			return
		}

		// The injected import shares the first line, so the line numbers
		// in test stack traces stay correct without sourcemap juggling.
		const encoded = Buffer.from(JSON.stringify(hoisted)).toString('base64url')

		kept[0] = `import ${JSON.stringify(VIRTUAL_PREFIX + encoded)}; ` + kept[0]

		return { code: kept.join('\n'), map: null }
	},
})
