import {
	CloudProvider,
	CreateProps,
	DeleteProps,
	ResourceDocument,
	ResourceExtra,
	StateProvider,
	UpdateProps,
	WorkSpace,
} from '../src'

describe('TODO', () => {
	class MockProvider implements CloudProvider {
		own() {
			return true
		}

		async get() {
			return {}
		}

		async update(props: UpdateProps<ResourceDocument, ResourceExtra>) {
			return 'id'
		}

		async create(props: CreateProps<ResourceDocument, ResourceExtra>) {
			return 'id'
		}

		async delete(props: DeleteProps<ResourceDocument, ResourceExtra>) {}
	}

	class MockState implements StateProvider {}

	it('MAKE TESTS', () => {
		const workspace = new WorkSpace({
			cloudProviders: [new MockProvider()],
			stateProvider: new MockState(),
		})
	})
})
