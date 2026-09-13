import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { createApp } from '../../app.js'
import { Cancelled } from '../../error.js'
import { listDeployments, removeDeployment } from '../../util/deployment.js'
import { playSuccessSound } from '../../util/sound.js'
import { createWorkSpace, getAppReleaseLockUrn, pullRemoteState } from '../../util/workspace.js'
import { layout } from '../ui/complex/layout.js'
import { color } from '../ui/style.js'
import { createClients } from './util.js'

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

				const { region, credentials, accountId, dynamo } = await createClients(appConfig)

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

				await log.task({
					initialMessage: 'Deleting the app from AWS',
					successMessage: 'Done deleting the app from AWS.',
					async task() {
						// The release lock keeps a concurrent deploy or rollback
						// from promoting into a half-deleted app.
						const release = await releaseLock.lock(getAppReleaseLockUrn(appId))

						try {
							await workspace.delete(app, { filters: [] })
							await pullRemoteState(app, state)

							// A deleted app must not list stale deployment history.
							for (const item of await listDeployments(dynamo, appId)) {
								await removeDeployment(dynamo, appId, item.id)
							}
						} finally {
							await release()
						}
					},
				})

				playSuccessSound()

				return 'Your app has been deleted!'
			})
		})
}
