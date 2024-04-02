import { spinner } from '@clack/prompts'
import { AppConfig } from '../../../config/app.js'
import { StackConfig } from '../../../config/stack.js'
import { generateTypes } from '../../../type-gen/generate.js'

export const buildTypes = async (appConfig: AppConfig, stackConfigs: StackConfig[]) => {
	const spin = spinner()
	spin.start(`Generate type definition files`)

	try {
		await generateTypes(appConfig, stackConfigs)
	} catch (error) {
		spin.stop(`Failed`, 2)
		throw error
	}

	spin.stop(`Done generating type definition files.`)
}
