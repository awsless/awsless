import { createDebugger } from '../../debug.ts'
import { findProvider } from '../../provider.ts'
import { Resource, State } from '../../resource.ts'
import { ResourceError } from '../error.ts'
import { ResourceState } from '../state.ts'
import { WorkSpaceOptions } from '../workspace.ts'

const debug = createDebugger('Import')

export const importResource = async (
	resource: Resource,
	input: State,
	opt: WorkSpaceOptions
): Promise<Omit<ResourceState, 'dependencies' | 'lifecycle'>> => {
	const provider = findProvider(opt.providers, resource.$.provider)

	debug(resource.$.type)

	let result

	try {
		result = await provider.getResource({
			type: resource.$.type,
			state: {
				...input,
				id: resource.$.config?.import,
			},
		})
	} catch (error) {
		throw ResourceError.wrap(resource.$.urn, resource.$.type, 'import', error)
	}

	return {
		version: result.version,
		type: resource.$.type,
		provider: resource.$.provider,
		input: resource.$.input,
		output: result.state,
	}
}
