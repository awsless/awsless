import { WorkSpace, local } from '../src'
// import { vi } from 'vitest'

export const createTestSpace = () => {
	const cloudProvider = {
		own: () => true,
		get: async () => ({}),
		update: vi.fn(async () => 'id'),
		create: vi.fn(async () => 'id'),
		delete: vi.fn(async () => {}),
	}

	const lockProvider = new local.memory.LockProvider()
	const stateProvider = new local.memory.StateProvider()
	const workspace = new WorkSpace({
		cloudProviders: [cloudProvider],
		stateProvider,
		lockProvider,
	})

	return { cloudProvider, stateProvider, lockProvider, workspace }
}
