import { describe, expect, it } from 'vitest'
import { createTestApp } from './_kit'

describe('command', () => {
	it('registers the stack commands', () => {
		const { commands } = createTestApp({
			stacks: [
				{
					name: 'stack-1',
					commands: {
						seed: { file: { nocheck: './seed.ts' }, description: 'Seed the tables' },
						report: { nocheck: './report.ts' },
					},
				},
			],
		})

		expect(commands).toEqual([
			{ name: 'seed', file: expect.stringContaining('seed.ts'), handler: 'default', description: 'Seed the tables' },
			{ name: 'report', file: expect.stringContaining('report.ts'), handler: 'default', description: undefined },
		])
	})
})
