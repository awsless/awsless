import { note } from '@clack/prompts'
import { AppConfig } from '../../config/app.js'
import { list, wrap } from './util.js'

export const logApp = (app: AppConfig) => {
	note(
		wrap(
			list({
				App: app.name,
				Region: app.region,
				Profile: app.profile,
			})
		),
		'App Config'
	)
}
