describe('env', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllEnvs()
	})

	it('reads the app env at call time', async () => {
		// Imported before the env exists, like the cli run command does.
		const util = await import('../src/lib/server/util')
		const bundle = await import('../src/lib/server/bundle')
		const onFailure = await import('../src/lib/server/on-failure')
		const store = await import('../src/lib/server/store')
		const job = await import('../src/lib/server/job')

		vi.stubEnv('APP', 'MyApp')
		vi.stubEnv('APP_ID', 'abc')
		vi.stubEnv('AWS_REGION', 'eu-west-1')
		vi.stubEnv('AWS_ACCOUNT_ID', '123')

		expect(util.getApp()).toBe('MyApp')
		expect(util.formatResourceName({ stackName: 'stack', resourceType: 'table', resourceName: 'items' })).toBe(
			'my-app--stack--table--items'
		)
		expect(bundle.getBundleName()).toBe('my-app--function--bundle')
		expect(onFailure.getOnFailureBucketName()).toBe('my-app--on-failure--failure--abc')
		expect(onFailure.getOnFailureQueueArn()).toBe('arn:aws:sqs:eu-west-1:123:my-app--on-failure--failure')
		expect(store.getStoreBucketName()).toBe('my-app--store--assets--abc')
		expect((store.Store as any).stack.files.name).toBe('my-app--store--assets--abc')
		expect(job.getJobClusterName()).toBe('my-app-job')
	})

	it('keeps a name part that kebab-case reduces to nothing, like the cli', async () => {
		const util = await import('../src/lib/server/util')

		vi.stubEnv('APP', 'app')

		expect(util.formatResourceName({ resourceType: 'table', resourceName: '$' })).toBe('app--table--$')
	})

	it('tracks the test mode of @awsless/lambda per call', async () => {
		const { isTest } = await import('../src/lib/server/util')
		const { isTestEnv } = await import('@awsless/lambda')

		vi.stubEnv('LAMBDA_ENV', 'production')
		expect(isTest()).toBe(false)
		expect(isTestEnv()).toBe(false)

		vi.stubEnv('LAMBDA_ENV', 'test')
		expect(isTest()).toBe(true)
		expect(isTestEnv()).toBe(true)
	})
})
