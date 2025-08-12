import { UUID } from 'node:crypto'
import { createDebugger } from '../../debug.ts'
import { State } from '../../meta.ts'
import { findProvider } from '../../provider.ts'
import { Resource } from '../../resource.ts'
import { ResourceError, ResourceNotFound } from '../error.ts'
import { createIdempotantToken } from '../token.ts'
import { WorkSpaceOptions } from '../workspace.ts'

const debug = createDebugger('Replace')

export const replaceResource = async (
	resource: Resource,
	appToken: UUID,
	priorState: State,
	proposedState: State,
	opt: WorkSpaceOptions
): Promise<{
	output: State
	version?: number
}> => {
	const urn = resource.$.urn
	const type = resource.$.type
	const provider = findProvider(opt.providers, resource.$.provider)
	const idempotantToken = createIdempotantToken(appToken, resource.$.urn, 'replace')

	debug(resource.$.type)
	debug(proposedState)

	if (resource.$.config?.retainOnDelete) {
		debug('retain', type)
	} else {
		try {
			await provider.deleteResource({
				type,
				state: priorState,
				idempotantToken,
			})
		} catch (error) {
			if (error instanceof ResourceNotFound) {
				// --------------------------------------
				// The resource has already been deleted.
				// Let's skip this issue.
				// --------------------------------------
				debug(type, 'already deleted')
			} else {
				throw ResourceError.wrap(urn, type, 'replace', error)
			}
		}
	}

	let result

	try {
		result = await provider.createResource({
			type,
			state: proposedState,
			idempotantToken,
		})
	} catch (error) {
		throw ResourceError.wrap(urn, type, 'replace', error)
	}

	return {
		version: result.version,
		output: result.state,
	}
}
