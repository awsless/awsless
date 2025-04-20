import type { UUID } from 'node:crypto'
import { createDebugger } from '../../debug.ts'
import { findProvider } from '../../provider.ts'
import { URN } from '../../resource.ts'
import { ResourceError, ResourceNotFound } from '../error.ts'
import { ResourceState } from '../state.ts'
import { createIdempotantToken } from '../token.ts'
import { WorkSpaceOptions } from '../workspace.ts'

const debug = createDebugger('Delete')

export const deleteResource = async (appToken: UUID, urn: URN, state: ResourceState, opt: WorkSpaceOptions) => {
	debug(state.type)
	debug(state)

	if (state.lifecycle?.retainOnDelete) {
		debug('retain', state.type)
		return
	}

	const idempotantToken = createIdempotantToken(appToken, urn, 'delete')
	const provider = findProvider(opt.providers, state.provider)
	try {
		await provider.deleteResource({
			type: state.type,
			state: state.output!,
			idempotantToken,
		})
	} catch (error) {
		if (error instanceof ResourceNotFound) {
			// --------------------------------------
			// The resource has already been deleted.
			// Let's skip this issue.
			// --------------------------------------
			debug(state.type, 'already deleted')
		} else {
			throw ResourceError.wrap(urn, state.type, 'delete', error)
		}
	}
}
