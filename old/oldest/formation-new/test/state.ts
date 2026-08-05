import { App, Stack } from '../src'
import { createMockWorkSpace, Resource } from './_mock'

describe('state', () => {
	const { workspace, stateBackend } = createMockWorkSpace()

	it('create state', async () => {
		const app = new App('app')
		const stack = new Stack(app, 'stack')

		const r1 = new Resource(stack, 'r1', { id: '1' })
		const r2 = new Resource(stack, 'r2', { id: '2', deps: [r1.id] })
		const r3 = new Resource(stack, 'r3', { id: '3', deps: [r2.id] })

		await workspace.deploy(app)

		const appState = await stateBackend.get(app.urn)

		expect(appState).toStrictEqual({
			name: app.name,
			version: expect.any(Number),
			stacks: {
				[stack.urn]: {
					name: stack.name,
					nodes: {
						[r1.$.urn]: expect.objectContaining({ tag: 'resource' }),
						[r2.$.urn]: expect.objectContaining({ tag: 'resource' }),
						[r3.$.urn]: expect.objectContaining({ tag: 'resource' }),
					},
				},
			},
		})
	})

	it('update state', async () => {
		const app = new App('app')
		const stack = new Stack(app, 'stack')

		const r3 = new Resource(stack, 'r3', { id: '3' })
		const r1 = new Resource(stack, 'r1', { id: '1', deps: [r3.id] })

		await workspace.deploy(app)

		const appState = await stateBackend.get(app.urn)

		expect(appState).toStrictEqual({
			name: app.name,
			version: expect.any(Number),
			stacks: {
				[stack.urn]: {
					name: stack.name,
					nodes: {
						[r1.$.urn]: expect.objectContaining({ tag: 'resource' }),
						[r3.$.urn]: expect.objectContaining({ tag: 'resource' }),
					},
				},
			},
		})
	})

	it('delete state', async () => {
		const app = new App('app')

		await workspace.delete(app)

		const appState = await stateBackend.get(app.urn)

		expect(appState).toBeUndefined()
	})
})
