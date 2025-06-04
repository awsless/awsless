import { AppError } from '@awsless/formation'
import { log } from '@clack/prompts'
import { color, icon } from '../style.js'
import { wrap } from '../util.js'
import { logResourceError } from './stack-error.js'

export const logAppError = (error: AppError) => {
	log.message(
		wrap([color.error(error.message), `App: ${error.app}`].join('\n'), {
			hard: true,
		}),
		{ symbol: color.error(icon.error) }
	)

	for (const issue of error.issues) {
		logResourceError(issue)
		// if (issue instanceof StackError) {
		// } else if (issue instanceof Error) {
		// 	log.message(wrap(color.error(issue.message), { hard: true }), {
		// 		symbol: color.error(icon.error),
		// 	})
		// }
	}
}
