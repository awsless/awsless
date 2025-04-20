import { Config } from '../../../config/config.js'
import { list } from './list.js'

export const header = (config: Config) => {
	return list({
		App: config.app.name,
		Stage: config.stage,
		Region: config.app.region,
		Profile: config.app.profile,
	})
}
