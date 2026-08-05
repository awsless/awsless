import { App, Stack } from '../src'
import { createMockWorkSpace, Resource } from './_mock'

describe('retain', () => {
	const { workspace, assertResourceExists } = createMockWorkSpace()

	it('create', async () => {
		const app = new App('app')
		const stack = new Stack(app, 'stack')

		new Resource(
			stack,
			'r1',
			{ id: '1' },
			{
				retainOnDelete: true,
			}
		)

		await workspace.deploy(app)

		assertResourceExists('1')
	})

	it('delete', async () => {
		const app = new App('app')

		await workspace.delete(app)

		assertResourceExists('1')
	})
})
