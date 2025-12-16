import { log } from '@awsless/clui'
import { AppConfig } from '../../../config/app.js'
import { StackConfig } from '../../../config/stack.js'
import { generateTypes } from '../../../type-gen/generate.js'
// import { task } from '../util.js'

export const buildTypes = async (props: { appConfig: AppConfig; stackConfigs: StackConfig[] }) => {
	await generateTypes(props)
	log.step('Done generating type definition files.')

	// Sadly doing this will generate random @clack/prompts errors.

	// await log.task({
	// 	initialMessage: 'Generate type definition files...',
	// 	successMessage: 'Done generating type definition files.',
	// 	errorMessage: 'Failed generating type definition files.',
	// 	async task() {
	// 		await generateTypes(props)
	// 	},
	// })
}
