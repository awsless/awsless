import { App, Stack, aws } from '../src'
import { createTestSpace } from './_util'

describe('Concurrency', () => {
	const space = createTestSpace()

	describe('deploy & delete multiple stacks', async () => {
		const app = new App('app')
		const parent = new Stack(app, 'parent')

		for (let i = 0; i < 10; i++) {
			const stack = new Stack(app, `stack-${i}`)
			stack.dependsOn(parent)

			new aws.dynamodb.Table(stack, 'table', {
				name: `test-table-${i}`,
				hash: 'id',
			})
		}

		it('deploy', async () => {
			await space.workspace.deployApp(app)

			const state = await space.stateProvider.get(app.urn)
			expect(state).toStrictEqual({
				name: 'app',
				stacks: expect.objectContaining({
					[parent.urn]: {
						name: 'parent',
						dependencies: [],
						resources: {},
					},
					'urn:App:{app}:Stack:{stack-0}': {
						name: 'stack-0',
						dependencies: [parent.urn],
						resources: {
							'urn:App:{app}:Stack:{stack-0}:AWS::DynamoDB::Table:{table}': expect.objectContaining({
								type: 'AWS::DynamoDB::Table',
							}),
						},
					},
				}),
			})
		})

		it('delete', async () => {
			await space.workspace.deleteApp(app)

			const state = await space.stateProvider.get(app.urn)
			expect(state).toBeUndefined()
		})
	})
})
