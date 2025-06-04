import { AppError, ResourceError } from '@awsless/formation'
import { log } from '@clack/prompts'
import { Cancelled, ConfigError, ExpectedError, FileError } from '../../../error.js'
import { color, icon } from '../style.js'
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
		log.message(color.error('Cancelled.'), {
			symbol: color.error(icon.error),
		})
	} else if (error instanceof ExpectedError) {
		log.message(color.error(error.message), {
			symbol: color.error(icon.error),
		})
	} else if (error instanceof AppError) {
		logAppError(error)
	} else if (error instanceof ResourceError) {
		logResourceError(error)
	} else if (error instanceof FileError) {
		logFileError(error)
	} else if (error instanceof Error) {
		const message = `${error.name}: ${error.message}`
		const stack = error.stack ? color.dim(error.stack.replace(message, '')) : ''
		log.message(
			wrap([color.error(message), stack], {
				hard: true,
			}),
			{ symbol: color.error(icon.error) }
		)
	} else if (typeof error === 'string') {
		log.message(wrap(color.error(error)), {
			symbol: color.error(icon.error),
		})
	} else {
		log.message(wrap(color.error('Unknown error!')), {
			symbol: color.error(icon.error),
		})
	}
}
