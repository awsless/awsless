
import { ssm } from "@awsless/ssm"
import { APP } from './resource.js'
import { paramCase } from "change-case"

export const getConfigName = (name: string) => {
	return `/.awsless/${APP}/${name}`
}

let data: Record<string, string> = {}

const TEST = process.env.NODE_ENV === 'test'
const CONFIGS = process.env.AWSLESS_CONFIG

if(!TEST && CONFIGS) {
	const keys = CONFIGS.split(',')

	if(keys.length > 0) {
		const paths:Record<string, string> = {}

		for(const key of keys) {
			paths[key] = getConfigName(key)
		}

		data = await ssm(paths)
	}
}

export interface ConfigResources {}

export const Config:ConfigResources = new Proxy({}, {
	get(_, name:string) {
		const key = paramCase(name)
		const value = data[key]

		if(typeof value === 'undefined') {
			throw new Error(
				`The "${name}" config value hasn't been set yet. ${
					TEST
					? `Use "Config.${name} = 'VAlUE'" to define your mock value.`
					: `Define access to the desired config value inside your awsless stack file.`
				}`
			)
		}

		return value
	},
	set(_, name:string, value:string) {
		const key = paramCase(name)
		data[key] = value

		return true
	}
})
