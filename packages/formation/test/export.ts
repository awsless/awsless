import { App, Output, Stack, WorkSpace, local } from '../src'

describe('Export', () => {
	const cloudProvider = {
		own: () => true,
		get: async () => ({}),
		update: vi.fn(async () => 'id'),
		create: vi.fn(async () => 'id'),
		delete: vi.fn(async () => {}),
	}

	const stateProvider = new local.MemoryProvider()
	const workspace = new WorkSpace({
		cloudProviders: [cloudProvider],
		stateProvider,
	})

	it('should deploy stack with an static exports', async () => {
		const app = new App('app')
		const stack = new Stack('stack')
		app.add(stack)

		stack.export('name', 'value')

		await workspace.deployStack(stack)

		const state = await stateProvider.get(app.urn)
		expect(state).toStrictEqual({
			name: 'app',
			stacks: {
				[stack.urn]: {
					name: 'stack',
					resources: {},
					exports: {
						name: 'value',
					},
				},
			},
		})
	})

	it('should deploy stack with an output exports', async () => {
		const app = new App('app')
		const stack = new Stack('stack')
		app.add(stack)

		stack.export('name', new Output([], resolve => resolve('value')))

		await workspace.deployStack(stack)

		const state = await stateProvider.get(app.urn)
		expect(state).toStrictEqual({
			name: 'app',
			stacks: {
				[stack.urn]: {
					name: 'stack',
					resources: {},
					exports: {
						name: 'value',
					},
				},
			},
		})
	})

	it('should deploy without exports', async () => {
		const app = new App('app')
		const stack = new Stack('stack')
		app.add(stack)

		await workspace.deployStack(stack)

		const state = await stateProvider.get(app.urn)
		expect(state).toStrictEqual({
			name: 'app',
			stacks: {
				[stack.urn]: {
					name: 'stack',
					resources: {},
					exports: {},
				},
			},
		})
	})

	it('should link export values between stacks', async () => {
		const app = new App('app')
		const stack = new Stack('stack')
		app.add(stack)

		stack.export('name', 'value')

		await workspace.deployStack(stack)

		const stack2 = new Stack('stack-2')
		app.add(stack2)

		stack2.export('imported', app.import('stack', 'name'))

		await workspace.deployStack(stack2)

		const state = await stateProvider.get(app.urn)
		expect(state).toStrictEqual({
			name: 'app',
			stacks: {
				[stack.urn]: {
					name: 'stack',
					resources: {},
					exports: {
						name: 'value',
					},
				},
				[stack2.urn]: {
					name: 'stack-2',
					resources: {},
					exports: {
						imported: 'value',
					},
				},
			},
		})
	})
})
