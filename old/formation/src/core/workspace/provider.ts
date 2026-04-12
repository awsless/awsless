import { CloudProvider } from '../cloud'

export const getCloudProvider = (cloudProviders: CloudProvider[], providerId: string) => {
	for (const provider of cloudProviders) {
		if (provider.own(providerId)) {
			return provider
		}
	}

	throw new TypeError(`Can't find the "${providerId}" cloud provider.`)
}
