import { App, Stack } from '../src'
import { createMockWorkSpace, Resource } from './_mock'

describe('replace the same external resource', () => {
	const { workspace, resetTest } = createMockWorkSpace()

	it('step 1 - create resource 1', async () => {
		const app = new App('app')
		const stack = new Stack(app, 'stack')

		new Resource(stack, 'r1', { id: '1' })

		await workspace.deploy(app)
	})

	it('step 2 - delete resource 1 but create resource 2 with the same id', async () => {
		const app = new App('app')
		const stack = new Stack(app, 'stack')

		new Resource(stack, 'r2', { id: '1' })

		await workspace.deploy(app)
	})

	describe('cross stack', () => {
		resetTest()

		it('step 1 - create resource 1', async () => {
			const app = new App('app')
			const stack = new Stack(app, 'stack')

			new Resource(stack, 'r1', { id: '1' })

			await workspace.deploy(app)
		})

		it('step 2 - delete resource 1 but create resource 2 with the same id', async () => {
			const app = new App('app')
			const stack2 = new Stack(app, 'stack-2')

			new Resource(stack2, 'r2', { id: '1' })

			await workspace.deploy(app)
		})
	})
})
