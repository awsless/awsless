import { log } from '@clack/prompts'
import { logConfigError } from './config-error.js'
import { Cancelled, ConfigError } from '../../../error.js'
import { color, icon } from '../style.js'
import { wrap } from '../util.js'
import { StackError } from '@awsless/formation'
import { logStackError } from './stack-error.js'

export const logError = (error: unknown) => {
	// console.log(error)

	if (error instanceof ConfigError) {
		logConfigError(error)
	} else if (error instanceof Cancelled) {
		log.message(color.error('Cancelled.'), {
			symbol: color.error(icon.error),
		})
	} else if (error instanceof StackError) {
		logStackError(error)
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
