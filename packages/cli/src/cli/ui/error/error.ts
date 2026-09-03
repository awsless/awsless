import { relative } from 'path'
import { Cancelled as CancelledError, log } from '@awsless/clui'
import { AppError, ResourceError } from '@terraforge/core'
import { Cancelled, ConfigError, ExpectedError, FileError } from '../../../error.js'
import { debugError, debugLogFile } from '../../debug.js'
import { color } from '../style.js'
import { wrap } from '../util.js'
import { logAppError } from './app-error.js'
import { logConfigError } from './config-error.js'
import { logFileError } from './file-error.js'
import { logResourceError } from './stack-error.js'

export const logError = (error: unknown) => {
	// The full picture is often in the debug log, so every printed
	// error points at it.
	debugError(error)

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
		)
	} else if (typeof error === 'string') {
		log.error(color.error(error))
	} else if (Array.isArray(error)) {
		error.map(logError)
	} else {
		try {
			const strError = JSON.stringify(error)
			log.error(color.error(strError))
		} catch {
			log.error(color.error('Unknown error!'))
		}
	}

	// Cancels are user intent, not failures worth investigating. The
	// log only exists once a project was found.
	const file = debugLogFile()

	if (file && !(error instanceof Cancelled) && !(error instanceof CancelledError) && !Array.isArray(error)) {
		log.message(color.dim(`Debug log: ${relative(process.cwd(), file)}`))
	}
}
