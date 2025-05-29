import { State } from '../formation/meta'
import { CreateProps, DeleteProps, GetDataProps, GetProps, Provider, UpdateProps } from '../formation/provider'

export type CustomResourceProvider = Partial<{
	getResource?(props: Omit<GetProps, 'type'>): Promise<State>
	updateResource?(props: Omit<UpdateProps, 'type'>): Promise<State>
	createResource?(props: Omit<CreateProps, 'type'>): Promise<State>
	deleteResource?(props: Omit<DeleteProps, 'type'>): Promise<void>
	getData?(props: Omit<GetDataProps, 'type'>): Promise<State>
}>

export const createCustomProvider = (
	providerId: string,
	resourceProviders: Record<string, CustomResourceProvider>
): Provider => {
	const version = 1

	const getProvider = (type: string) => {
		const provider = resourceProviders[type]
		if (!provider) {
			throw new Error(`The "${providerId}" provider doesn't support the "${type}" resource type.`)
		}

		return provider
	}

	return {
		ownResource(id) {
			return id === `custom:${providerId}`
		},
		async getResource({ type, ...props }) {
			const provider = getProvider(type)

			if (!provider.getResource) {
				return {
					version,
					state: props.state,
				}
			}

			return {
				version,
				state: await provider.getResource(props),
			}
		},
		async createResource({ type, ...props }) {
			const provider = getProvider(type)

			if (!provider.createResource) {
				return {
					version,
					state: props.state,
				}
			}

			return {
				version,
				state: await provider.createResource(props),
			}
		},
		async updateResource({ type, ...props }) {
			const provider = getProvider(type)

			if (!provider.updateResource) {
				return {
					version,
					state: props.proposedState,
				}
			}

			return {
				version,
				state: await provider.updateResource(props),
			}
		},
		async deleteResource({ type, ...props }) {
			await getProvider(type).deleteResource?.(props)
		},
		async getData({ type, ...props }) {
			return {
				version,
				state: (await getProvider(type).getData?.(props)) ?? {},
			}
		},
	}
}
