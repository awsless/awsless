import { ssm } from '@awsless/ssm'
import { paramCase } from 'change-case'
import { APP } from './util.js'

export const getConfigName = (name: string) => {
	return `/.awsless/${APP}/${name}`
}

const IS_TEST = process.env.NODE_ENV === 'test'
const CONFIGS = process.env.CONFIG

/*@__NO_SIDE_EFFECTS__*/
const loadConfigData = async () => {
	if (!IS_TEST && CONFIGS) {
		const keys: string[] = []
		for (const key of Object.keys(process.env)) {
			if (key.startsWith('CONFIG_')) {
				keys.push(process.env[key]!)
			}
		}

		// const keys = CONFIGS.split(',')

		if (keys.length > 0) {
			const paths: Record<string, string> = {}

			for (const key of keys) {
				paths[key] = getConfigName(key)
			}

			return ssm(paths)
		}
	}

	return {}
}

const data: Record<string, string> = await /*@__PURE__*/ loadConfigData()

export const getConfigValue = (name: string) => {
	const key = paramCase(name)
	const value = data[key]

	if (typeof value === 'undefined') {
		throw new Error(
			`The "${name}" config value hasn't been set yet. ${
				IS_TEST
					? `Use "Config.${name} = 'VAlUE'" to define your mock value.`
					: `Define access to the desired config value inside your awsless stack file.`
			}`
		)
	}

	return value
}

export const setConfigValue = (name: string, value: string) => {
	const key = paramCase(name)
	data[key] = value
}

export interface ConfigResources {}

export const Config: ConfigResources = /*@__PURE__*/ new Proxy(
	{},
	{
		get(_, name: string) {
			return getConfigValue(name)
		},
		set(_, name: string, value: string) {
			setConfigValue(name, value)

			return true
		},
	}
)
