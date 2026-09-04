import { prompt } from '@awsless/clui'
import { URN } from '@terraforge/core'
import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { Cancelled } from '../../../error.js'
import { generateGlobalAppId } from '../../../util/name.js'
import { createDeploymentBackends, getAppReleaseLockUrn } from '../../../util/workspace.js'
import { layout } from '../../ui/complex/layout.js'
import { createClients } from '../util.js'

export const unlock = (program: Command) => {
	program
		.command('unlock')
		.description('Release the lock that ensures sequential deployments')
		.action(async () => {
			await layout('state unlock', async ({ appConfig, stackConfigs }) => {
				const { region, credentials, accountId } = await createClients(appConfig)

				const { app } = createApp({ appConfig, stackConfigs, accountId })
				const { lock } = createDeploymentBackends({ credentials, region, accountId })
				const releaseUrn = getAppReleaseLockUrn(
					generateGlobalAppId({ accountId, region, appName: appConfig.name })
				)

				const lockedUrns: URN[] = []

				for (const urn of [app.urn, releaseUrn]) {
					if (await lock.locked(urn)) {
						lockedUrns.push(urn)
					}
				}

				if (lockedUrns.length === 0) {
					return 'No lock exists.'
				}

				if (!process.env.SKIP_PROMPT) {
					const ok = await prompt.confirm({
						message:
							'Releasing the lock that ensures sequential deployments might result in corrupt state if a deployment is still running. Are you sure?',
						initialValue: false,
					})

					if (!ok) {
						throw new Cancelled()
					}
				}

				for (const urn of lockedUrns) {
					await lock.insecureReleaseLock(urn)
				}

				return 'The deployment lock was successfully released.'
			})
		})
}
