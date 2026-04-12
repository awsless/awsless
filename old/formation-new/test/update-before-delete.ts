import { App, Stack } from '../src'
import { createMockWorkSpace, Resource } from './_mock'

describe('update dependent resources before dependency is deleted', () => {
	const { workspace, resetTest } = createMockWorkSpace()

	it('step 1 - create 2 resources that have a dependency with each other', async () => {
		const app = new App('app')
		const stack = new Stack(app, 'stack')
		const r1 = new Resource(stack, 'r1', { id: '1' })

		new Resource(stack, 'r2', { id: '2', deps: [r1.id] })

		await workspace.deploy(app)
	})

	it('step 2 - delete the dependent resource', async () => {
		const app = new App('app')
		const stack = new Stack(app, 'stack')

		new Resource(stack, 'r2', { id: '2' })

		await workspace.deploy(app)
	})

	describe('cross stack', () => {
		resetTest()

		it('step 1 - create 2 resources that have a dependency with each other', async () => {
			const app = new App('app')
			const stack = new Stack(app, 'stack')
			const stack2 = new Stack(app, 'stack-2')

			const r1 = new Resource(stack, 'r1', { id: '1' })
			new Resource(stack2, 'r2', { id: '2', deps: [r1.id] })

			await workspace.deploy(app)
		})

		it('step 2 - delete the dependent resource', async () => {
			const app = new App('app')
			const stack2 = new Stack(app, 'stack-2')

			new Resource(stack2, 'r2', { id: '2' })

			await workspace.deploy(app)
		})
	})
})
