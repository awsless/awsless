import { App, Asset, Stack, aws } from '../src'
import { createTestSpace } from './_util'

describe('Asset', () => {
	const space = createTestSpace()

	it('should deploy with assets', async () => {
		const app = new App('app')
		const stack = new Stack(app, 'stack')
		const bucket = new aws.s3.Bucket(stack, 'bucket')
		const object = new aws.s3.BucketObject(stack, 'object', {
			bucket: bucket.name,
			key: 'name',
			body: Asset.fromString('BODY'),
		})

		await space.workspace.deployApp(app)

		const state = await space.stateProvider.get(app.urn)
		expect(state).toStrictEqual({
			name: 'app',
			stacks: {
				[stack.urn]: expect.objectContaining({
					resources: expect.objectContaining({
						[object.urn]: expect.objectContaining({
							assets: {
								body: expect.any(String),
							},
						}),
					}),
				}),
			},
		})
	})
})
