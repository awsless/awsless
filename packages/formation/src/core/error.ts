// import { Resource } from './resource'

// export class ResourceError extends Error {
// 	constructor(readonly resource: Resource, message: string) {
// 		super(message)
// 	}
// }

export class ResourceNotFound extends Error {}

export class ImportValueNotFound extends Error {
	constructor(stack: string, key: string) {
		super(`Import value "${key}" doesn't exist for the "${stack}" stack`)
	}
}
