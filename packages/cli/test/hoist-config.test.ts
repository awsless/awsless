import { describe, expect, it } from 'vitest'
import { hoistConfigPlugin } from '../src/test/hoist-config'

const transform = (code: string) => {
	const plugin = hoistConfigPlugin()

	return plugin.transform(code, '/project/test/handler.test.ts') as { code: string } | undefined
}

describe('mock.config hoisting', () => {
	it('should move top level assignments into a virtual module imported first', () => {
		const result = transform(`mock.config.greeting = 'special'\nimport handler from '../src/handler'\n`)

		expect(result?.code).toMatch(/^import "awsless:hoisted-config:[A-Za-z0-9_-]+"; \nimport handler/)

		const id = result!.code.match(/"(awsless:hoisted-config:[^"]+)"/)![1]!
		const plugin = hoistConfigPlugin()

		expect(plugin.load(plugin.resolveId(id)!)).toBe(
			`import { mock } from 'awsless'\nmock.config.greeting = 'special'\n`
		)
	})

	it('should leave files without assignments & nested assignments alone', () => {
		expect(transform(`import x from 'y'\n`)).toBeUndefined()
		expect(transform(`it('x', () => {\n\tmock.config.greeting = 'inside'\n})\n`)).toBeUndefined()
	})

	it('should refuse an assignment that does not fit on its line', () => {
		expect(() => transform(`mock.config.settings = {\n\ta: 1,\n}\n`)).toThrow(/handler\.test\.ts:1: .*one line/)
		expect(() => transform(`mock.config.name = 'unterminated\n`)).toThrow(/one line/)
	})
})
