import { log, prompt } from '@awsless/clui'
import { Warning } from '../../../app'
import { Cancelled } from '../../../error'
import { color } from '../style'

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

	if (warnings.length > 0) {
		const result = await prompt.confirm({
			initialValue: false,
			message: `Some issues remain unresolved. If you continue, your app may not function correctly. Do you still want to proceed?`,
		})

		if (!result) {
			throw new Cancelled()
		}
	}
}
