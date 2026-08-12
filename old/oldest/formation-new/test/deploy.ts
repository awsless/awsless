import { App, Stack } from '../src'
import { createMockWorkSpace, Resource } from './_mock'

describe('deploy', () => {
	const { workspace, stateBackend, assertResourceExists, assertResourceNotExists } = createMockWorkSpace()

	it('create', async () => {
		const app = new App('app')
		const stack = new Stack(app, 'stack')

		new Resource(stack, 'r1', { id: '1' })
		new Resource(stack, 'r2', { id: '2' })
		new Resource(stack, 'r3', { id: '3' })

		await workspace.deploy(app)

		assertResourceExists('1')
		assertResourceExists('2')
		assertResourceExists('3')
	})

	it('delete', async () => {
		const app = new App('app')

		await workspace.deploy(app)

		assertResourceNotExists('1')
		assertResourceNotExists('2')
		assertResourceNotExists('3')

		const appState = await stateBackend.get(app.urn)

		expect(appState).toBeUndefined()
	})

	it('cross stack dep deploy', async () => {
		const app = new App('app')
		const stack1 = new Stack(app, 'stack-1')
		const stack2 = new Stack(app, 'stack-2')
		const stack3 = new Stack(app, 'stack-3')

		const r1 = new Resource(stack1, 'r1', { id: '1' })
		const r2 = new Resource(stack2, 'r2', { id: '2', deps: [r1.id] })
		new Resource(stack3, 'r3', { id: '3', deps: [r2.id] })

		await workspace.deploy(app)

		assertResourceExists('1')
		assertResourceExists('2')
		assertResourceExists('3')
	})
})
