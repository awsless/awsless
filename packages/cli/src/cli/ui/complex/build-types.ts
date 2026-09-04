import { log } from '@awsless/clui'
import { AppConfig } from '../../../config/app.js'
import { StackConfig } from '../../../config/stack.js'
import { generateTypes } from '../../../type-gen/generate.js'

// A plain step instead of a spinner task: the spinner produced random
// @clack/prompts errors around the type generation.
export const buildTypes = async (props: { appConfig: AppConfig; stackConfigs: StackConfig[] }) => {
	await generateTypes(props)
	log.step('Done generating type definition files.')
}
