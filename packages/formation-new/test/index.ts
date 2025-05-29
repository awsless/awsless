import {
	App,
	createCustomProvider,
	createCustomResourceClass,
	enableDebug,
	Input,
	MemoryLockBackend,
	MemoryStateBackend,
	OptionalInput,
	Output,
	ResourceNotFound,
	Stack,
	WorkSpace,
} from '../src'

const createMockProvicer = () => {
	const parseState = (state: unknown) => {
		if (typeof state === 'object' && state !== null) {
			return {
				id: parseStateId(state),
				deps: parseStateDeps(state),
			}
		}

		throw new Error('Invalid resource state.')
	}

	const parseStateId = (state: object) => {
		if ('id' in state && typeof state.id === 'string') {
			return state.id
		}

		throw new Error('Resource ID is required.')
	}

	const parseStateDeps = (state: object) => {
		if ('deps' in state && Array.isArray(state.deps)) {
			return state.deps.map(dep => {
				if (typeof dep === 'string') {
					return dep
				}

				throw new Error('Resource dependency should be a string.')
			})
		}

		return []
	}

	const assertResourceExists = (id: string) => {
		if (store.has(id)) {
			throw new ResourceNotFound()
		}
	}

	const assertResourceNotExists = (id: string) => {
		if (store.has(id)) {
			throw new Error('Resource already exists.')
		}
	}

	const assertResourceDependenciesExists = (deps: string[]) => {
		for (const dep of deps) {
			if (!store.has(dep)) {
				throw new Error("Resource dependency doesn't exist.")
			}
		}
	}

	const assertNoneDependentResources = (id: string) => {
		for (const deps of store.values()) {
			if (deps.includes(id)) {
				throw new Error('Resource is still in use.')
			}
		}
	}

	const store = new Map<string, string[]>()

	return {
		store,
		provider: createCustomProvider('custom', {
			resource: {
				async getResource(props) {
					const item = parseState(props.state)
					assertResourceExists(item.id)

					const deps = store.get(item.id)

					return {
						id: item.id,
						deps,
					}
				},
				async createResource(props) {
					const item = parseState(props.state)
					assertResourceNotExists(item.id)
					assertResourceDependenciesExists(item.deps)

					store.set(item.id, item.deps)
					return item
				},
				async updateResource(props) {
					const item = parseState(props.proposedState)
					assertResourceDependenciesExists(item.deps)

					store.set(item.id, item.deps)
					return item
				},
				async deleteResource(props) {
					const item = parseState(props.state)
					assertNoneDependentResources(item.id)

					store.delete(item.id)
				},
			},
		}),
	}
}

const Resource = createCustomResourceClass<
	{
		id: Input<string>
		deps?: OptionalInput<Input<string>[]>
	},
	{
		id: Output<string>
		deps: Output<string[]>
	}
>('custom', 'resource')

describe('deploy & delete graph', () => {
	const stateBackend = new MemoryStateBackend()
	const lockBackend = new MemoryLockBackend()
	const { store, provider } = createMockProvicer()
	const workspace = new WorkSpace({
		concurrency: 1,
		providers: [provider],
		backend: {
			state: stateBackend,
			lock: lockBackend,
		},
	})

	const reset = () => {
		it('reset', () => {
			store.clear()
			stateBackend.clear()
			lockBackend.clear()
		})
	}

	describe('should update dependent resources before dependency is deleted', () => {
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
	})

	describe('should delete resources before creating new resources', () => {
		reset()

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
	})

	describe('should deploy & delete resources in order of the dependencies', () => {
		reset()

		it('step 1 - create resources with dependencies', async () => {
			const app = new App('app')
			const stack = new Stack(app, 'stack')

			const r1 = new Resource(stack, 'r1', { id: '1' })
			new Resource(stack, 'r2', { id: '2', deps: [r1.id] })

			await workspace.deploy(app)
		})

		it('step 2 - delete resources in order', async () => {
			const app = new App('app')

			await workspace.delete(app)
		})
	})
})
