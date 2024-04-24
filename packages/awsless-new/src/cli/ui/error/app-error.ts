import { AppError, StackError } from '@awsless/formation'
import { log } from '@clack/prompts'
import { color, icon } from '../style.js'
import { wrap } from '../util.js'
import { logStackError } from './stack-error.js'

export const logAppError = (error: AppError) => {
	log.message(
		wrap([color.error(error.message), color.dim(`App: ${error.app}`)].join('\n'), {
			hard: true,
		}),
		{ symbol: color.error(icon.error) }
	)

	for (const issue of error.issues) {
		if (issue instanceof StackError) {
			logStackError(issue)
		} else if (issue instanceof Error) {
			log.message(wrap(color.error(issue.message), { hard: true }), {
				symbol: color.error(icon.error),
			})
		}
	}
}
