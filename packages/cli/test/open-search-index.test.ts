import { describe, expect, it, vi } from 'vitest'
import { applySearchIndex, createOpenSearchProvider } from '../src/formation/open-search'
import { credentials } from './_kit'

const fakeClient = (exists: boolean) => {
	const indices = {
		exists: vi.fn(async () => ({ body: exists })),
		create: vi.fn(async () => ({})),
		putMapping: vi.fn(async () => ({})),
	}

	return { client: { indices } as never, indices }
}

describe('search index resource', () => {
	it('should create a missing index with its settings & mappings', async () => {
		const { client, indices } = fakeClient(false)

		await applySearchIndex(client, {
			index: 'products',
			mappings: { properties: { name: { type: 'text' } } },
			settings: { number_of_shards: 1 },
		})

		expect(indices.create).toHaveBeenCalledWith({
			index: 'products',
			body: {
				settings: { number_of_shards: 1 },
				mappings: { properties: { name: { type: 'text' } } },
			},
		})
		expect(indices.putMapping).not.toHaveBeenCalled()
	})

	it('should create a bare index when nothing is configured', async () => {
		const { client, indices } = fakeClient(false)

		await applySearchIndex(client, { index: 'products' })

		expect(indices.create).toHaveBeenCalledWith({ index: 'products', body: {} })
	})

	it('should only put the mappings on an existing index', async () => {
		const { client, indices } = fakeClient(true)

		await applySearchIndex(client, {
			index: 'products',
			mappings: { properties: { name: { type: 'text' } } },
			settings: { number_of_shards: 2 },
		})

		expect(indices.create).not.toHaveBeenCalled()
		expect(indices.putMapping).toHaveBeenCalledWith({
			index: 'products',
			body: { properties: { name: { type: 'text' } } },
		})
	})

	it('should leave an existing index alone without mappings', async () => {
		const { client, indices } = fakeClient(true)

		await applySearchIndex(client, { index: 'products' })

		expect(indices.create).not.toHaveBeenCalled()
		expect(indices.putMapping).not.toHaveBeenCalled()
	})

	describe('planning', () => {
		const provider = createOpenSearchProvider({ credentials, region: 'us-east-1' })
		const state = {
			endpoint: 'search.example.com',
			index: 'products',
			mappings: '{}',
			settings: '{}',
		}

		const plan = (priorState: unknown, proposedState: unknown) => {
			return provider.planResourceChange!({ type: 'index', priorState, proposedState } as never)
		}

		it('should replace the index when it moves to another domain or name', async () => {
			await expect(plan(state, { ...state, endpoint: 'other.example.com' })).resolves.toMatchObject({
				requiresReplacement: true,
			})
			await expect(plan(state, { ...state, index: 'items' })).resolves.toMatchObject({
				requiresReplacement: true,
			})
		})

		it('should update the index in place for mapping & settings changes', async () => {
			await expect(plan(state, { ...state, mappings: '{"properties":{}}' })).resolves.toMatchObject({
				requiresReplacement: false,
				state: { ...state, mappings: '{"properties":{}}' },
			})
		})

		it('should never replace a resource that is being created', async () => {
			await expect(plan(null, state)).resolves.toMatchObject({ requiresReplacement: false })
		})
	})
})
