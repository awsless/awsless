import { Bugsnag } from './bugsnag.js'
import { Logger, ExtraMetaData } from '@awsless/lambda'

interface BugsnagOptions {
	apiKey?: string
}

type ExtendedError = {
	metadata?: unknown
	metaData?: unknown
}

const isTestEnv = () => {
	return !!(process.env.TEST || process.env.JEST_WORKER_ID || process.env.VITEST_WORDER_ID)
}

/**
 * Logging errors into Bugsnag
 * @param apiKey - The bugsnag api key. Default is `process.env.BUGSNAG_API_KEY`
 */
export const bugsnag = ({ apiKey = process.env.BUGSNAG_API_KEY }: BugsnagOptions = {}): Logger => {
	const client = new Bugsnag(apiKey || '')

	return async (error: Error, metaData: ExtraMetaData = {}) => {
		if (isTestEnv()) {
			return
		}

		const err = error as ExtendedError

		await client.notify(error, {
			metaData: {
				errorData: err.metadata || err.metaData || undefined,
				...metaData,
			},
		})
	}
}
