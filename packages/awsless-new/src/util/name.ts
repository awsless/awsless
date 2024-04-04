import { paramCase } from 'change-case'

export const formatGlobalResourceName = (appName: string, ns: string, id: string) => {
	return [
		//
		appName,
		ns,
		id,
	]
		.map(v => paramCase(v))
		.join('--')
}

export const formatLocalResourceName = (
	appName: string,
	stackName: string,
	ns: string,
	id: string,
	seperator = '--'
) => {
	return [
		//
		appName,
		stackName,
		ns,
		id,
	]
		.map(v => paramCase(v))
		.join(seperator)
}
