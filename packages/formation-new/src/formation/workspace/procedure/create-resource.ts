import { UUID } from 'node:crypto'
import { createDebugger } from '../../debug.ts'
import { State } from '../../meta.ts'
import { findProvider } from '../../provider.ts'
import { Resource } from '../../resource.ts'
import { ResourceError } from '../error.ts'
import { NodeState } from '../state.ts'
import { createIdempotantToken } from '../token.ts'
import { WorkSpaceOptions } from '../workspace.ts'

const debug = createDebugger('Create')

export const createResource = async (
	resource: Resource,
	appToken: UUID,
	input: State,
	opt: WorkSpaceOptions
): Promise<Omit<NodeState, 'dependencies' | 'lifecycle'>> => {
	const provider = findProvider(opt.providers, resource.$.provider)
	const idempotantToken = createIdempotantToken(appToken, resource.$.urn, 'create')

	debug(resource.$.type)
	debug(input)

	let result

	try {
		result = await provider.createResource({
			type: resource.$.type,
			state: input,
			idempotantToken,
		})
	} catch (error) {
		// We always need to check if the resource already exists.
		// And restore the state.

		// result = await provider.getResource({
		// 	type: resource.$.type,
		// 	state: input,
		// })

		// if (!result) {
		// }

		throw ResourceError.wrap(resource.$.urn, resource.$.type, 'create', error)
	}

	return {
		tag: 'resource',
		version: result.version,
		type: resource.$.type,
		provider: resource.$.provider,
		input: resource.$.input,
		output: result.state,
	}
}
