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

	const stateProvider = new local.MemoryProvider()
	const workspace = new WorkSpace({
		cloudProviders: [cloudProvider],
		stateProvider,
	})

	return { cloudProvider, stateProvider, workspace }
}
