import { AppConfig } from '../../config/app.js'

export const getDomainNameById = (config: AppConfig, id: string) => {
	const domains = config.defaults.domains ?? {}

	if (id in domains) {
		if (domains[id]) {
			return domains[id]!.domain
		}
	}

	throw new TypeError(`No domain registered with id: ${id}`)
}

export const formatFullDomainName = (config: AppConfig, id: string, subDomain?: string) => {
	const domain = getDomainNameById(config, id)

	if (subDomain) {
		return `${subDomain.replace(/\.$/, '')}.${domain}`
	}

	return domain
}
