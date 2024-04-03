import { log } from '@clack/prompts'
import { configError } from './config-error.js'
import { Cancelled, ConfigError } from '../../../error.js'
import { color, icon } from '../style.js'
import { wrap } from '../util.js'

export const logError = (error: unknown) => {
	// console.log(error)

	if (error instanceof ConfigError) {
		configError(error)
	} else if (error instanceof Cancelled) {
		log.message(color.error('Cancelled.'), {
			symbol: color.error(icon.error),
		})
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
