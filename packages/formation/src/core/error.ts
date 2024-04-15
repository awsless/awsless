import { URN } from './resource'
import { ResourceOperation } from './workspace/workspace'

export class ResourceError extends Error {
	static wrap(urn: URN, type: string, operation: ResourceOperation, error: unknown) {
		if (error instanceof Error) {
			return new ResourceError(urn, type, operation, error.message)
		}

		return new ResourceError(urn, type, operation, 'Unknown Error')
	}

	constructor(
		//
		readonly urn: URN,
		readonly type: string,
		readonly operation: ResourceOperation,
		message: string
	) {
		super(message)
	}
}

export class StackError extends Error {
	constructor(readonly issues: (ResourceError | Error)[], message: string) {
		super(message)
	}
}

export class ResourceNotFound extends Error {}
export class ResourceAlreadyExists extends Error {}

export class ImportValueNotFound extends Error {
	constructor(stack: string, key: string) {
		super(`Import value "${key}" doesn't exist for the "${stack}" stack`)
	}
}
