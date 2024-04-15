import { App, Stack, WorkSpace, aws, local } from '../src'

describe('TODO', () => {
	const cloudProvider = {
		own: () => true,
		get: async () => ({}),
		update: vi.fn(async () => 'id'),
		create: vi.fn(async () => 'id'),
		delete: vi.fn(async () => {}),
	}

	describe('deploy & destroy', () => {
		const stateProvider = new local.MemoryProvider()
		const workspace = new WorkSpace({
			cloudProviders: [cloudProvider],
			stateProvider,
		})

		it('deploy with resources', async () => {
			const app = new App('app')
			const stack = new Stack('stack')
			app.add(stack)

			const table = new aws.dynamodb.Table('table', {
				name: 'test-table',
				hash: 'id',
			})

			stack.add(table)
			await workspace.deployStack(stack)

			expect(cloudProvider.create).toBeCalled()

			const state = await stateProvider.get(app.urn)
			expect(state).toStrictEqual({
				name: 'app',
				stacks: {
					[stack.urn]: {
						name: 'stack',
						exports: {},
						resources: {
							[table.urn]: {
								id: expect.any(String),
								type: 'AWS::DynamoDB::Table',
								provider: 'aws-cloud-control-api',
								assets: expect.any(Object),
								dependencies: expect.any(Array),
								extra: expect.any(Object),
								remote: expect.any(Object),
								local: expect.any(Object),
								policies: {
									deletion: expect.any(String),
								},
							},
						},
					},
				},
			})
		})

		it('deploy with updated resources', async () => {
			const app = new App('app')
			const stack = new Stack('stack')
			app.add(stack)

			const table = new aws.dynamodb.Table('table', {
				name: 'test-table',
				hash: 'id-2',
			})

			stack.add(table)
			await workspace.deployStack(stack)

			expect(cloudProvider.update).toBeCalled()

			const state = await stateProvider.get(app.urn)
			expect(state).toStrictEqual({
				name: 'app',
				stacks: {
					[stack.urn]: {
						name: 'stack',
						exports: {},
						resources: {
							[table.urn]: {
								id: expect.any(String),
								type: 'AWS::DynamoDB::Table',
								provider: 'aws-cloud-control-api',
								assets: expect.any(Object),
								dependencies: expect.any(Array),
								extra: expect.any(Object),
								remote: expect.any(Object),
								local: expect.any(Object),
								policies: {
									deletion: expect.any(String),
								},
							},
						},
					},
				},
			})
		})

		it('deploy stack without resources', async () => {
			const app = new App('app')
			const stack = new Stack('stack')
			app.add(stack)

			await workspace.deployStack(stack)

			expect(cloudProvider.delete).toBeCalled()

			const state = await stateProvider.get(app.urn)
			expect(state).toStrictEqual({
				name: 'app',
				stacks: {
					[stack.urn]: {
						name: 'stack',
						exports: {},
						resources: {},
					},
				},
			})
		})

		it('delete stack', async () => {
			const app = new App('app')
			const stack = new Stack('stack')
			app.add(stack)

			await workspace.deleteStack(stack)

			const state = await stateProvider.get(app.urn)
			expect(state).toStrictEqual({
				name: 'app',
				stacks: {},
			})
		})
	})
})
