// Vitest hoists vi.mock calls above the imports of a test file. This
// plugin gives top level `mock.config.<name>(value)` statements the
// same treatment, so config values apply before any import resolves &
// import time Config reads see them - no manual vi.hoisted dance.
//
//   mock.config.greeting('special')   // hoisted above the imports
//   import handler from '../src/handler'
//
// The vite ssr transform hoists import statements above all module
// code, so a plain prelude would still run too late. Instead the
// hoisted statements move into a virtual module imported FIRST - esm
// evaluation order guarantees it runs before every other import.

const HOIST_PATTERN = /^mock\.config\.[A-Za-z_$][\w$]*\(.*\)\s*;?\s*$/
const VIRTUAL_PREFIX = 'awsless:hoisted-config:'

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

		const kept = lines.map(line => {
			// Only single line statements at the very top level (column
			// zero) hoist - anything nested runs in place, like vi.mock.
			if (HOIST_PATTERN.test(line)) {
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
