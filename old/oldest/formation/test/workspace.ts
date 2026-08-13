import { App, Asset, Stack, aws } from '../src'
import { createTestSpace } from './_util'

describe('Workspace', () => {
	describe('app', () => {
		const space = createTestSpace()

		it('deploy with cross-stack resource-output linking', async () => {
			const app = new App('app')
			const parent = new Stack(app, 'parent')
			const bucket = new aws.s3.Bucket(parent, 'bucket')
			const object = new aws.s3.BucketObject(parent, 'object', {
				bucket: bucket.name,
				key: 'key',
				body: Asset.fromString('Hello'),
			})

			const child = new Stack(app, 'child')
			const object2 = new aws.s3.BucketObject(child, 'object', {
				bucket: bucket.name,
				key: 'key',
				body: Asset.fromString('Hello'),
			})

			await space.workspace.deployApp(app)

			expect(space.cloudProvider.create).toBeCalled()

			const state = await space.stateProvider.get(app.urn)
			expect(state).toStrictEqual({
				name: 'app',
				stacks: {
					[parent.urn]: {
						name: 'parent',
						dependencies: [],
						resources: {
							[bucket.urn]: expect.objectContaining({
								type: 'AWS::S3::Bucket',
								dependencies: [],
							}),
							[object.urn]: expect.objectContaining({
								type: 'AWS::S3::Bucket::Object',
								dependencies: [bucket.urn],
							}),
						},
					},
					[child.urn]: {
						name: 'child',
						dependencies: [parent.urn],
						resources: {
							[object2.urn]: expect.objectContaining({
								type: 'AWS::S3::Bucket::Object',
								dependencies: [],
							}),
						},
					},
				},
			})
		})
	})

	// describe('stack', () => {
	// 	const stateProvider = new local.MemoryProvider()
	// 	const workspace = new WorkSpace({
	// 		cloudProviders: [cloudProvider],
	// 		stateProvider,
	// 	})

	// 	it('deploy with resources', async () => {
	// 		const app = new App('app')
	// 		const stack = new Stack('stack')
	// 		app.add(stack)

	// 		const table = new aws.dynamodb.Table('table', {
	// 			name: 'test-table',
	// 			hash: 'id',
	// 		})

	// 		stack.add(table)
	// 		await workspace.deployStack(stack)

	// 		expect(cloudProvider.create).toBeCalled()

	// 		const state = await stateProvider.get(app.urn)
	// 		expect(state).toStrictEqual({
	// 			name: 'app',
	// 			stacks: {
	// 				[stack.urn]: {
	// 					name: 'stack',
	// 					exports: {},
	// 					resources: {
	// 						[table.urn]: {
	// 							id: expect.any(String),
	// 							type: 'AWS::DynamoDB::Table',
	// 							provider: 'aws-cloud-control-api',
	// 							assets: expect.any(Object),
	// 							dependencies: expect.any(Array),
	// 							extra: expect.any(Object),
	// 							remote: expect.any(Object),
	// 							local: expect.any(Object),
	// 							policies: {
	// 								deletion: expect.any(String),
	// 							},
	// 						},
	// 					},
	// 				},
	// 			},
	// 		})
	// 	})

	// 	it('deploy with updated resources', async () => {
	// 		const app = new App('app')
	// 		const stack = new Stack('stack')
	// 		app.add(stack)

	// 		const table = new aws.dynamodb.Table('table', {
	// 			name: 'test-table',
	// 			hash: 'id-2',
	// 		})

	// 		stack.add(table)
	// 		await workspace.deployStack(stack)

	// 		expect(cloudProvider.update).toBeCalled()

	// 		const state = await stateProvider.get(app.urn)
	// 		expect(state).toStrictEqual({
	// 			name: 'app',
	// 			stacks: {
	// 				[stack.urn]: {
	// 					name: 'stack',
	// 					exports: {},
	// 					resources: {
	// 						[table.urn]: {
	// 							id: expect.any(String),
	// 							type: 'AWS::DynamoDB::Table',
	// 							provider: 'aws-cloud-control-api',
	// 							assets: expect.any(Object),
	// 							dependencies: expect.any(Array),
	// 							extra: expect.any(Object),
	// 							remote: expect.any(Object),
	// 							local: expect.any(Object),
	// 							policies: {
	// 								deletion: expect.any(String),
	// 							},
	// 						},
	// 					},
	// 				},
	// 			},
	// 		})
	// 	})

	// 	it('deploy stack without resources', async () => {
	// 		const app = new App('app')
	// 		const stack = new Stack('stack')
	// 		app.add(stack)

	// 		await workspace.deployStack(stack)

	// 		expect(cloudProvider.delete).toBeCalled()

	// 		const state = await stateProvider.get(app.urn)
	// 		expect(state).toStrictEqual({
	// 			name: 'app',
	// 			stacks: {
	// 				[stack.urn]: {
	// 					name: 'stack',
	// 					exports: {},
	// 					resources: {},
	// 				},
	// 			},
	// 		})
	// 	})

	// 	it('delete stack', async () => {
	// 		const app = new App('app')
	// 		const stack = new Stack('stack')
	// 		app.add(stack)

	// 		await workspace.deleteStack(stack)

	// 		const state = await stateProvider.get(app.urn)
	// 		expect(state).toStrictEqual({
	// 			name: 'app',
	// 			stacks: {},
	// 		})
	// 	})
	// })
})
