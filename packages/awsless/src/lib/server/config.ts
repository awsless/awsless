import { ssm } from '@awsless/ssm'
import { kebabCase } from 'change-case'
import { getApp, isTest } from './util.js'

export const getConfigName = (name: string) => {
	return `/.awsless/${getApp()}/${name}`
}

let data: Record<string, string> = {}

const fetchConfigData = async (): Promise<Record<string, string>> => {
	if (isTest()) {
		return {}
	}

	// Only a lambda that declares config access announces keys, so a
	// config free lambda never touches ssm.
	const keys = process.env.CONFIGS?.split(',').filter(Boolean) ?? []

	if (keys.length === 0) {
		return {}
	}

	const paths: Record<string, string> = {}

	for (const key of keys) {
		paths[kebabCase(key)] = getConfigName(key)
	}

	return ssm(paths)
}

// Config.X reads synchronously, often at module scope, so the values must
// exist before this module resolves. A failed fetch fails the sandbox.
data = { ...(await fetchConfigData()), ...data }

export const getConfigValue = (name: string) => {
	const key = kebabCase(name)
	const value = data[key]

	if (typeof value === 'undefined') {
		// The failure plane runs without any config access on purpose.
		if (!isTest() && !process.env.CONFIGS) {
			throw new Error(
				`The "${name}" config value isn't available: this lambda loads no configs at all - the on-failure & on-error-log consumers run config free, so a broken config can never take down error reporting. Pass the value through a plain environment variable instead.`
			)
		}

		throw new Error(
			`The "${name}" config value hasn't been set yet. ${
				isTest()
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
		// Without a set trap an assignment silently lands on the empty
		// target while reads keep failing.
		set(_, name: string) {
			throw new Error(`Config values are read only. Use "mock.config.${name}" to fake a value inside tests.`)
		},
	}
)
