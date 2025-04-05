import { UUID } from 'node:crypto'
import { createDebugger } from '../../debug.ts'
import { findProvider } from '../../provider.ts'
import { Resource, State } from '../../resource.ts'
import { ResourceError } from '../error.ts'
import { createIdempotantToken } from '../token.ts'
import { WorkSpaceOptions } from '../workspace.ts'

const debug = createDebugger('Update')

export const updateResource = async (
	resource: Resource,
	appToken: UUID,
	priorState: State,
	proposedState: State,
	opt: WorkSpaceOptions
): Promise<{
	output: State
	version?: number
}> => {
	const provider = findProvider(opt.providers, resource.$.provider)
	const idempotantToken = createIdempotantToken(appToken, resource.$.urn, 'update')

	let result

	debug(resource.$.type)

	try {
		result = await provider.updateResource({
			type: resource.$.type,
			priorState,
			proposedState,
			idempotantToken,
		})
	} catch (error) {
		throw ResourceError.wrap(resource.urn, resource.type, 'update', error)

		// If the resource wasn't found for some reason we try to create it.
		// if (error instanceof ResourceNotFound) {
		//   try {
		//     id = await provider.create({
		//       urn: resource.urn,
		//       type: resource.type,
		//       document: resolveDocumentAssets(cloneObject(document), assets),
		//       assets,
		//       extra,
		//       token,
		//     });
		//   } catch (error) {
		//     throw ResourceError.wrap(
		//       resource.urn,
		//       resource.type,
		//       resourceState.id,
		//       "update",
		//       error
		//     );
		//   }
		// } else {
		//   throw ResourceError.wrap(
		//     resource.urn,
		//     resource.type,
		//     resourceState.id,
		//     "update",
		//     error
		//   );
		// }
	}

	return {
		version: result.version,
		output: result.state,
	}
}
