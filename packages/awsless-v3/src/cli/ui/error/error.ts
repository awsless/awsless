import { Cancelled as CancelledError, log } from '@awsless/clui'
import { AppError, ResourceError } from '@terraforge/core'
import { Cancelled, ConfigError, ExpectedError, FileError } from '../../../error.js'
import { color } from '../style.js'
import { wrap } from '../util.js'
import { logAppError } from './app-error.js'
import { logConfigError } from './config-error.js'
import { logFileError } from './file-error.js'
import { logResourceError } from './stack-error.js'

export const logError = (error: unknown) => {
	// console.log(error)

	if (error instanceof ConfigError) {
		logConfigError(error)
	} else if (error instanceof Cancelled) {
		log.error(color.error('Cancelled.'))
	} else if (error instanceof CancelledError) {
		log.error(color.error('Cancelled.'))
	} else if (error instanceof ExpectedError) {
		log.error(color.error(error.message))
	} else if (error instanceof AppError) {
		logAppError(error)
	} else if (error instanceof ResourceError) {
		logResourceError(error)
	} else if (error instanceof FileError) {
		logFileError(error)
	} else if (error instanceof Error) {
		const message = `${error.name}: ${error.message}`
		const stack = error.stack ? color.dim(error.stack.replace(message, '')) : ''
		log.error(
			wrap([color.error(message), stack], {
				hard: true,
			})
			// { symbol: color.error(icon.error) }
		)
	} else if (typeof error === 'string') {
		log.error(color.error(error))
	} else {
		log.error(color.error('Unknown error!'))
	}
}
