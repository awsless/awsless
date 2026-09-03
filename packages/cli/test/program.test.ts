import { afterEach, describe, expect, it } from 'vitest'
import { program } from '../src/cli/program'

describe('program options', () => {
	afterEach(() => {
		delete process.env.SKIP_PROMPT
		delete process.env.NO_CACHE
	})

	it('should announce --skip-prompt through the environment', () => {
		program.parseOptions(['--skip-prompt'])

		expect(process.env.SKIP_PROMPT).toBe('1')
	})

	it('should announce --no-cache through the environment', () => {
		expect(process.env.NO_CACHE).toBeUndefined()

		program.parseOptions(['-c'])

		expect(process.env.NO_CACHE).toBe('1')
	})
})
