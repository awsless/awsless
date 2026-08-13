import { AppConfig } from '../config/app.js'
import { StackConfig } from '../config/stack.js'
import { features } from './index.js'

type Props = {
	appConfig: AppConfig
	stackConfigs: StackConfig[]
}

export const validateFeatures = (props: Props) => {
	for (const feature of features) {
		feature.onValidate?.(props)
	}
}
