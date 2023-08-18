
const APP = process.env.APP || 'app'
const STACK = process.env.STACK || 'stack'

export const getLocalResourceName = (id: string, stack: string = STACK) => {
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
