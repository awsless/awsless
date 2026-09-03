describe('env', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllEnvs()
	})

	it('reads the app env at call time', async () => {
		// Imported before the env exists, like the cli run command does.
		const util = await import('../src/lib/server/util')
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
		expect(onFailure.getOnFailureBucketName()).toBe('my-app--on-failure--failure--abc')
		expect(onFailure.getOnFailureQueueArn()).toBe('arn:aws:sqs:eu-west-1:123:my-app--on-failure--failure')
		expect(store.getStoreBucketName()).toBe('my-app--store--assets--abc')
		expect((store.Store as any).stack.files.name).toBe('my-app--store--assets--abc')
		expect(job.getJobClusterName()).toBe('my-app-job')
	})

	it('shares the test mode predicate with @awsless/lambda', async () => {
		vi.stubEnv('LAMBDA_ENV', 'production')

		const { IS_TEST } = await import('../src/lib/server/util')
		const { isTestEnv } = await import('@awsless/lambda')

		expect(IS_TEST).toBe(false)
		expect(isTestEnv()).toBe(false)

		vi.stubEnv('LAMBDA_ENV', 'test')
		expect(isTestEnv()).toBe(true)
	})
})
