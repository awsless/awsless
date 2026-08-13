import { App, Stack } from '../src'
import { createMockWorkSpace, Resource } from './_mock'

describe('delete', () => {
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

		await workspace.delete(app)

		assertResourceNotExists('1')
		assertResourceNotExists('2')
		assertResourceNotExists('3')

		const appState = await stateBackend.get(app.urn)

		expect(appState).toBeUndefined()
	})

	it('proper delete ordering', async () => {
		const app = new App('app')
		const stack = new Stack(app, 'stack')

		const r1 = new Resource(stack, 'r1', { id: '1' })
		const r2 = new Resource(stack, 'r2', { id: '2', deps: [r1.id] })
		new Resource(stack, 'r3', { id: '3', deps: [r2.id] })

		await workspace.deploy(app)

		assertResourceExists('1')
		assertResourceExists('2')
		assertResourceExists('3')

		await workspace.delete(app)

		assertResourceNotExists('1')
		assertResourceNotExists('2')
		assertResourceNotExists('3')
	})
})
