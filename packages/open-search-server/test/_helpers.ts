import { search } from '../src/engine/search'
import { Source } from '../src/engine/source'
import { Store } from '../src/engine/store'

export const makeStore = (name: string, mappings?: unknown, docs: Array<[string, Source]> = [], settings?: unknown) => {
	const store = new Store()
	const index = store.create(name, settings, mappings)
	for (const [id, source] of docs) index.put(id, source)
	return { store, index }
}

export const run = (store: Store, body: Source, indices = 'test', params: Record<string, string> = {}) => {
	return search(store, { indices, body, params: new URLSearchParams(params) })
}

export const ids = (response: Source): string[] => {
	const hits = (response.hits as { hits: Array<{ _id: string }> }).hits
	return hits.map(hit => hit._id)
}
