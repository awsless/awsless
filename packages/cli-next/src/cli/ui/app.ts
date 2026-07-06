import { log } from '@awsless/clui'
import { AppConfig } from '../../config/app.js'
import { ProgramOptions } from '../program.js'
import { color } from './style.js'

export const logApp = (app: AppConfig, opt: ProgramOptions) => {
	log.list('App Config', {
		App: app.name,
		Region: app.region,
		Profile: app.profile,
		...(opt.stage
			? {
					Stage: color.warning(opt.stage),
				}
			: {}),
	})
}
