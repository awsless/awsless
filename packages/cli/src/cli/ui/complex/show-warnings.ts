import { log, prompt } from '@awsless/clui'
import { Warning } from '../../../app.js'
import { Cancelled } from '../../../error.js'
import { color } from '../style.js'

export const showWarnings = async (warnings: Warning[]) => {
	for (const warning of warnings) {
		log.warning(
			[
				//
				color.warning('Warning!'),
				warning.message,
			].join('\n')
		)
	}

	if (warnings.length > 0 && !process.env.SKIP_PROMPT) {
		const result = await prompt.confirm({
			initialValue: false,
			message: `Some issues remain unresolved. If you continue, your app may not function correctly. Do you still want to proceed?`,
		})

		if (!result) {
			throw new Cancelled()
		}
	}
}
