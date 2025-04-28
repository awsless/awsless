import { State } from './meta.ts'

export type CreateProps<T = State> = {
	type: string
	state: T

	idempotantToken?: string
}

export type UpdateProps<T = State> = {
	// id?: string;
	type: string
	priorState: T
	proposedState: T

	idempotantToken?: string
}

export type DeleteProps<T = State> = {
	// id?: string;
	type: string
	state: T

	idempotantToken?: string
}

export type GetProps<T = State> = {
	// id?: string;
	type: string
	state: T
}

export type GetDataProps<T = State> = {
	type: string
	state: T
}

export interface Provider {
	ownResource(id: string): boolean

	getResource(props: GetProps): Promise<{
		version: number
		state: State
	}>

	createResource(props: CreateProps): Promise<{
		version: number
		state: State
	}>

	updateResource(props: UpdateProps): Promise<{
		version: number
		state: State
	}>

	deleteResource(props: DeleteProps): Promise<void>

	getData?(props: GetDataProps): Promise<{
		state: State
	}>

	destroy?(): Promise<void>
}

export const findProvider = (providers: Provider[], id: string) => {
	for (const provider of providers) {
		if (provider.ownResource(id)) {
			return provider
		}
	}

	throw new TypeError(`Can't find the "${id}" provider.`)
}
