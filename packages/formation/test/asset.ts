import { App, Asset, Stack, WorkSpace, aws, local } from '../src'

describe('Asset', () => {
	const cloudProvider = {
		own: () => true,
		get: async () => ({}),
		update: vi.fn(async () => 'id'),
		create: vi.fn(async () => 'id'),
		delete: vi.fn(async () => {}),
	}

	const stateProvider = new local.MemoryProvider()
	const workspace = new WorkSpace({
		cloudProviders: [cloudProvider],
		stateProvider,
	})

	it('should deploy with assets', async () => {
		const app = new App('app')
		const stack = new Stack('stack')
		app.add(stack)

		const bucket = new aws.s3.Bucket('bucket')
		stack.add(bucket)

		const object = new aws.s3.BucketObject('object', {
			bucket: bucket.name,
			key: 'name',
			body: Asset.fromString('BODY'),
		})
		stack.add(object)

		await workspace.deployStack(stack)

		const state = await stateProvider.get(app.urn)
		expect(state).toStrictEqual({
			name: 'app',
			stacks: {
				[stack.urn]: {
					name: 'stack',
					exports: {},
					resources: expect.objectContaining({
						[object.urn]: expect.objectContaining({
							assets: {
								body: expect.any(String),
							},
						}),
					}),
				},
			},
		})
	})
})
