import { log } from '@awsless/clui'
// import { note } from '@clack/prompts'
import { AppConfig } from '../../config/app.js'
import { ProgramOptions } from '../program.js'
import { color } from './style.js'
// import { list, wrap } from './util.js'

export const logApp = (app: AppConfig, opt: ProgramOptions) => {
	const data: Record<string, string> = {
		App: app.name,
		Region: app.region,
		Profile: app.profile,
	}

	if (opt.stage) {
		data.Stage = color.warning(opt.stage)
	}

	log.list('App Config', data)

	// note(wrap(list(data)), 'App Config')
}
