import { describe, expect, it } from 'vitest'
import { createTestApp } from './_kit'

describe('eval', () => {
	it('should register a stack without evals as nothing', () => {
		const { evals } = createTestApp({ stacks: [{ name: 'chat' }] })

		expect(evals).toEqual([])
	})

	it('should register the shorthand path without configs', () => {
		const { evals } = createTestApp({ stacks: [{ name: 'chat', evals: { nocheck: './eval' } }] })

		expect(evals).toEqual([{ stackName: 'chat', name: 'chat', paths: ['./eval'], configs: [], threshold: 1 }])
	})

	it('should register the configs & threshold', () => {
		const { evals } = createTestApp({
			stacks: [
				{
					name: 'chat',
					evals: {
						path: [{ nocheck: './one' }, { nocheck: './two' }],
						configs: ['openrouter-api-key'],
						threshold: 0.9,
					},
				},
			],
		})

		expect(evals).toEqual([
			{
				stackName: 'chat',
				name: 'chat',
				paths: ['./one', './two'],
				configs: ['openrouter-api-key'],
				threshold: 0.9,
			},
		])
	})

	it('should reject a threshold above 1', () => {
		expect(() =>
			createTestApp({ stacks: [{ name: 'chat', evals: { path: { nocheck: './eval' }, threshold: 2 } }] })
		).toThrow()
	})
})
