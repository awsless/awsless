import { prompt } from '@awsless/clui'
import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { Cancelled } from '../../../error.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { createWorkSpace } from '../../../util/workspace.js'
import { layout } from '../../ui/complex/layout.js'

export const unlock = (program: Command) => {
	program
		.command('unlock')
		.description('Release the lock that ensures sequential deployments')
		.action(async () => {
			await layout('state unlock', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				const { app } = createApp({ appConfig, stackConfigs, accountId })
				const { lock } = await createWorkSpace({ credentials, region, accountId, profile })
				const isLocked = await lock.locked(app.urn)

				if (!isLocked) {
					return 'No lock is exists.'
				}

				const ok = await prompt.confirm({
					message:
						'Releasing the lock that ensures sequential deployments might result in corrupt state if a deployment is still running. Are you sure?',
					initialValue: false,
				})

				if (!ok) {
					throw new Cancelled()
				}

				await lock.insecureReleaseLock(app.urn)

				return 'The state lock was been successfully released.'
			})
		})
}
