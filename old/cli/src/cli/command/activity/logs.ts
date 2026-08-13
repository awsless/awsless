import { log } from '@awsless/clui'
import { Command } from 'commander'
import { format } from 'date-fns'
import { createApp } from '../../../app.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { createWorkSpace } from '../../../util/workspace.js'
import { bootstrapAwsless } from '../../ui/complex/bootstrap-awsless.js'
import { layout } from '../../ui/complex/layout.js'
import { color, icon } from '../../ui/style.js'

export const logs = (program: Command) => {
	program
		.command('logs')
		.option('--limit <number>', 'The size limit of logs to tail', '10')
		.description('Tail the activity logs')
		.action(async (options: { limit: string }) => {
			await layout('activity logs', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				await bootstrapAwsless({ credentials, region, accountId })

				const logs = await log.task({
					initialMessage: 'Loading activity logs',
					successMessage: 'Done loading activity logs.',
					errorMessage: 'Failed loading activity logs.',
					async task() {
						const { app } = createApp({ appConfig, stackConfigs, accountId })
						const { activityLog } = await createWorkSpace({ credentials, region, accountId })

						const limit = parseInt(options.limit, 10) ?? 10
						const logs = await activityLog.tail(app.urn, limit)

						return logs
					},
				})

				if (logs.length === 0) {
					return color.line.dim(`(empty)`)
				}

				const actions = {
					deploy: color.success('deploy'),
					delete: color.error('delete'),
				}

				for (const item of logs) {
					const date = new Date(item.date)
					log.info(
						[
							[
								color.line.dim(format(date, 'yyyy-MM-dd')),
								color.line(format(date, 'HH:mm:ss')),
								color.line.dim(icon.arrow.right),
								color.warning(item.user),
							].join(' '),
							[
								//
								actions[item.action],
								...(item.filters?.map(f => color.info(f)) ?? []),
							].join(' '),
						].join('\n')
					)
				}

				return
			})
		})
}
