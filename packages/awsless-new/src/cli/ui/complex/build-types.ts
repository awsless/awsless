import { log } from '@clack/prompts'
import { AppConfig } from '../../../config/app.js'
import { StackConfig } from '../../../config/stack.js'
import { generateTypes } from '../../../type-gen/generate.js'
// import { task } from '../util.js'

export const buildTypes = async (props: { appConfig: AppConfig; stackConfigs: StackConfig[] }) => {
	await generateTypes(props)
	log.step('Done generating type definition files.')

	// For t

	// await task('Generate type definition files', async update => {
	// 	await generateTypes(props)

	// 	update('Done generating type definition files.')
	// })
}
