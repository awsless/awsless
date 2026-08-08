import { log, prompt } from '@awsless/clui'
import { DynamoDBClient } from '@awsless/dynamodb'
import { Command } from 'commander'
import { createApp } from '../../app.js'
import { Cancelled } from '../../error.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { listDeployments, removeDeployment } from '../../util/deployment.js'
import { playSuccessSound } from '../../util/sound.js'
import { createWorkSpace, getAppReleaseLockUrn, pullRemoteState } from '../../util/workspace.js'
import { layout } from '../ui/complex/layout.js'
import { color } from '../ui/style.js'
import { task } from '../ui/util.js'

export const del = (program: Command) => {
	program
		.command('delete')
		.description('Delete your app from AWS')
		.action(async () => {
			await layout('delete', async ({ appConfig, stackConfigs }) => {
				if (appConfig.protect) {
					log.warning('Your app is protected against deletion.')

					if (process.env.SKIP_PROMPT) {
						return 'Disable the protect flag and try again.'
					} else {
						const confirmation = await prompt.text({
							message: `Type "${color.error('delete')}" to confirm deletion:`,
							validate(value) {
								if (value !== 'delete') {
									return 'Please type "delete" to confirm.'
								}

								return
							},
						})

						if (confirmation !== 'delete') {
							throw new Cancelled()
						}
					}
				}

				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				// ---------------------------------------------------

				const { app, appId, ready } = createApp({ appConfig, stackConfigs, accountId })

				ready()

				if (!process.env.SKIP_PROMPT) {
					const ok = await prompt.confirm({
						message: `Are you sure you want to ${color.error('delete')} your app?`,
					})

					if (!ok) {
						throw new Cancelled()
					}
				}

				// ---------------------------------------------------

				const {
					workspace,
					state,
					lock: releaseLock,
				} = await createWorkSpace({
					credentials,
					accountId,
					region,
				})

				await task('Deleting the app from AWS', async update => {
					// The release lock keeps a concurrent deploy or rollback
					// from promoting into a half-deleted app.
					const release = await releaseLock.lock(getAppReleaseLockUrn(appId))

					try {
						await workspace.delete(app, { filters: [] })
						await pullRemoteState(app, state)

						// Sweep the deployment manifest, so a deleted app
						// lists no stale deployment history.
						const dynamo = new DynamoDBClient({ credentials, region })

						for (const item of await listDeployments(dynamo, appId)) {
							await removeDeployment(dynamo, appId, item.id)
						}
					} finally {
						await release()
					}

					update('Done deleting the app from AWS.')
				})

				playSuccessSound()

				return 'Your app has been deleted!'
			})
		})
}
