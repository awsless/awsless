import { describe, expect, it } from 'vitest'
import { AppSchema } from '../src/config/app'
import { StackSchema } from '../src/config/stack'
import { configFeature } from '../src/feature/config'
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

	it('should type the eval only config values', async () => {
		const files = new Map<string, string>()

		await configFeature.onTypeGen!({
			appConfig: AppSchema.parse({ name: 'app', region: 'us-east-1', profile: 'test', configs: ['max-bet'] }),
			stackConfigs: [
				{
					...StackSchema.parse({
						name: 'chat',
						evals: { path: { nocheck: './eval' }, configs: ['model-api-key'] },
					}),
					file: 'chat/stack.jsonc',
				},
			],
			async write(file, data) {
				files.set(file, String(data))
			},
		})

		const types = files.get('config.d.ts')!
		const [resources, mock] = types.split('interface TestMock')

		expect(resources).toContain('MAX_BET: string')
		expect(resources).toContain('MODEL_API_KEY: string')
		expect(mock).toContain('MODEL_API_KEY: string')
	})
})
