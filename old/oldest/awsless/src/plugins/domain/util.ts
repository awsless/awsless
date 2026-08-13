import { Config } from '../../config/config.js'

export const getDomainNameById = (config: Config, id: string) => {
	const domains = config.app.defaults.domains ?? {}

	if (id in domains) {
		return domains[id]?.domain
	}

	throw new TypeError(`No domain registered with id: ${id}`)
}

export const formatFullDomainName = (config: Config, id: string, subDomain?: string) => {
	const domain = getDomainNameById(config, id)

	if (subDomain) {
		return `${subDomain}.${domain}`
	}

	return domain
}
