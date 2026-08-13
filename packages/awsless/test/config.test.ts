import { ssm } from '@awsless/ssm'

vi.mock('@awsless/ssm', () => ({
	ssm: vi.fn(async (paths: Record<string, string>) => {
		const values: Record<string, string> = {}
		for (const key of Object.keys(paths)) {
			values[key] = `value-of-${key}`
		}
		return values
	}),
}))

describe('config', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllEnvs()
		vi.mocked(ssm).mockClear()
	})

	it('fetches every config announced in the CONFIGS env var', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		vi.stubEnv('VITEST', '')
		vi.stubEnv('APP', 'app')
		vi.stubEnv('CONFIGS', 'SECRET,OTHER_VALUE')

		const { Config } = await import('../src/lib/server/config')

		expect(ssm).toHaveBeenCalledWith({
			secret: '/.awsless/app/SECRET',
			'other-value': '/.awsless/app/OTHER_VALUE',
		})

		expect((Config as any).SECRET).toBe('value-of-secret')
		expect((Config as any).OTHER_VALUE).toBe('value-of-other-value')
	})

	it('skips the fetch when no configs are announced', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		vi.stubEnv('VITEST', '')
		vi.stubEnv('APP', 'app')

		const { Config } = await import('../src/lib/server/config')

		expect(ssm).not.toHaveBeenCalled()
		expect(() => (Config as any).SECRET).toThrow(`The "SECRET" config value hasn't been set yet.`)
	})

	it('skips the fetch in test mode & allows mock values', async () => {
		vi.stubEnv('CONFIGS', 'SECRET')

		const { Config, setConfigValue } = await import('../src/lib/server/config')

		expect(ssm).not.toHaveBeenCalled()
		expect(() => (Config as any).SECRET).toThrow()

		// Mock values are set through the mock.config proxy, which
		// resolves to setConfigValue - Config itself stays read-only.
		setConfigValue('SECRET', 'mocked')

		expect((Config as any).SECRET).toBe('mocked')
	})
})
