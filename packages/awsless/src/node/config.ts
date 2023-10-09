
import { ssm } from "@awsless/ssm"
import { APP } from './resource.js'
import { paramCase } from "change-case"

export const getConfigName = (name: string) => {
	return `/.awsless/${APP}/${name}`
}

const TEST = process.env.NODE_ENV === 'test'
const CONFIGS = process.env.AWSLESS_CONFIG

/*@__NO_SIDE_EFFECTS__*/
const loadConfigData = async () => {

	if(!TEST && CONFIGS) {
		const keys = CONFIGS.split(',')

		if(keys.length > 0) {
			const paths:Record<string, string> = {}

			for(const key of keys) {
				paths[key] = getConfigName(key)
			}

			return await ssm(paths)
		}
	}

	return {}
}

/*@__PURE__*/ const data: Record<string, string> = await loadConfigData()

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
