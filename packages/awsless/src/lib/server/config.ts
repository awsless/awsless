import { ssm } from '@awsless/ssm'
import { kebabCase } from 'change-case'
import { getApp, IS_TEST } from './util.js'

export const getConfigName = (name: string) => {
	return `/.awsless/${getApp()}/${name}`
}

let data: Record<string, string> = {}
let loading: Promise<void> | undefined

/*@__NO_SIDE_EFFECTS__*/
const fetchConfigData = async (): Promise<Record<string, string>> => {
	if (IS_TEST) {
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

// Memoized, but a failed fetch isn't: the next call retries instead
// of replaying the same rejection for the life of the container.
const loadConfig = () => {
	loading ??= fetchConfigData().then(
		values => {
			data = { ...values, ...data }
		},
		error => {
			loading = undefined
			throw error
		}
	)

	return loading
}

// Config values read synchronously & app code reads them at import
// time (`const secret = Config.SECRET` at module scope), so the entry
// can only resolve once the values exist. An init failure fails the
// sandbox, which lambda replaces on the next invocation.
await /*@__PURE__*/ loadConfig()

export const getConfigValue = (name: string) => {
	const key = kebabCase(name)
	const value = data[key]

	if (typeof value === 'undefined') {
		// The failure plane runs without any config access on purpose.
		if (!IS_TEST && !process.env.CONFIGS) {
			throw new Error(
				`The "${name}" config value isn't available: this lambda loads no configs at all - the on-failure & on-error-log consumers run config free, so a broken config can never take down error reporting. Pass the value through a plain environment variable instead.`
			)
		}

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
