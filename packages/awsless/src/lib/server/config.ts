import { ssm } from '@awsless/ssm'
import { kebabCase } from 'change-case'
import { APP, IS_TEST } from './util.js'

export const getConfigName = (name: string) => {
	return `/.awsless/${APP}/${name}`
}

/*@__NO_SIDE_EFFECTS__*/
const loadConfigData = async () => {
	if (!IS_TEST) {
		const keys = process.env.CONFIGS?.split(',').filter(Boolean) ?? []

		if (keys.length > 0) {
			const paths: Record<string, string> = {}

			for (const key of keys) {
				paths[kebabCase(key)] = getConfigName(key)
			}

			return ssm(paths)
		}
	}

	return {}
}

const data: Record<string, string> = await /*@__PURE__*/ loadConfigData()

export const getConfigValue = (name: string) => {
	const key = kebabCase(name)
	const value = data[key]

	if (typeof value === 'undefined') {
		throw new Error(
			`The "${name}" config value hasn't been set yet. ${
				IS_TEST
					? `Use "mock.config.${name} = 'VALUE'" to define your mock value.`
					: `Define access to the desired config value inside your awsless stack file.`
			}`
		)
	}

	return value
}

export const setConfigValue = (name: string, value: string) => {
	const key = kebabCase(name)
	data[key] = value
}

export interface ConfigResources {}

export const Config: ConfigResources = /*@__PURE__*/ new Proxy(
	{},
	{
		get(_, name: string) {
			return getConfigValue(name)
		},
		// Without a set trap an assignment would silently land on the
		// empty proxy target while reads keep failing - fail loud &
		// point at the test api instead.
		set(_, name: string) {
			throw new Error(`Config values are read only. Use "mock.config.${name}" to fake a value inside tests.`)
		},
	}
)
