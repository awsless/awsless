import { Resource } from './resource'

export class ResourceError extends Error {
	constructor(readonly resource: Resource, message: string) {
		super(message)
	}
}
