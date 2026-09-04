import { describe, expect, it, vi } from 'vitest'
import { createWorkSpace } from '../src/util/workspace'

const mocks = vi.hoisted(() => ({
	aws: vi.fn((_config: unknown) => ({})),
}))

vi.mock('@terraforge/aws', () => ({
	aws: Object.assign(mocks.aws, { install: async () => {} }),
}))

vi.mock('@terraforge/core', async importOriginal => {
	const mod = await importOriginal<typeof import('@terraforge/core')>()

	return { ...mod, WorkSpace: class {}, enableDebug: () => {} }
})

describe('workspace', () => {
	it('should hand the session token of temporary credentials to the aws providers', async () => {
		await createWorkSpace({
			credentials: async () => ({ accessKeyId: 'key', secretAccessKey: 'secret', sessionToken: 'token' }),
			accountId: '123456789012',
			region: 'eu-west-1',
		})

		const configs = mocks.aws.mock.calls.map(([config]) => config)

		expect(configs).toHaveLength(2)
		expect(configs.map((config: any) => config.region)).toEqual(['eu-west-1', 'us-east-1'])

		for (const config of configs as any[]) {
			expect(config).toMatchObject({ accessKey: 'key', secretKey: 'secret', token: 'token' })
		}
	})
})
