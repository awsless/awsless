
const APP = process.env.APP || 'app'
const STACK = process.env.STACK || 'stack'

export const getLocalResourceName = (id: string, stack = STACK) => {
	return `${APP}-${stack}-${id}`
}

export const getGlobalResourceName = (id: string) => {
	return `${APP}-${id}`
}

export const getFunctionName = getLocalResourceName
export const getSearchName = getLocalResourceName
export const getTableName = getLocalResourceName
export const getStoreName = getLocalResourceName
export const getQueueName = getLocalResourceName
export const getTopicName = getGlobalResourceName

export const getSecretName = (name: string) => {
	return `/.awsless/${APP}/${name}`
}

export const getCacheProps = (name: string, stack = STACK) => {
	const prefix = `CACHE_${stack}_${name}`

	return {
		username:  process.env[`${prefix}_USERNAME`]!,
		password: process.env[`${prefix}_PASSWORD`]!,
		host: process.env[`${prefix}_HOST`]!,
		port: parseInt(process.env[`${prefix}_PORT`]!, 10),
		tls: {},
		cluster: true,
	} as const
}
