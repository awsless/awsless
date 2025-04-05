import { UUID } from 'node:crypto'
import { createDebugger } from '../../debug.ts'
import { findProvider } from '../../provider.ts'
import { Resource, State } from '../../resource.ts'
import { ResourceError } from '../error.ts'
import { ResourceState } from '../state.ts'
import { createIdempotantToken } from '../token.ts'
import { WorkSpaceOptions } from '../workspace.ts'

const debug = createDebugger('Create')

export const createResource = async (
	resource: Resource,
	appToken: UUID,
	input: State,
	opt: WorkSpaceOptions
): Promise<Omit<ResourceState, 'dependencies' | 'lifecycle'>> => {
	const provider = findProvider(opt.providers, resource.$.provider)
	const idempotantToken = createIdempotantToken(appToken, resource.$.urn, 'create')

	debug(resource.$.type)

	let result

	try {
		result = await provider.createResource({
			type: resource.$.type,
			state: input,
			idempotantToken,
		})
	} catch (error) {
		throw ResourceError.wrap(resource.$.urn, resource.$.type, 'create', error)
	}

	return {
		version: result.version,
		type: resource.$.type,
		provider: resource.$.provider,
		input: resource.$.input,
		output: result.state,
	}
}
