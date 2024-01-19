import { AppConfig } from '../../../config/app.js'
import { list } from './list.js'

export const header = (app: AppConfig) => {
	return list({
		App: app.name,
		Stage: app.stage,
		Region: app.region,
		Profile: app.profile,
	})
}
