import { log } from '@awsless/clui'
import { Command } from 'commander'
import { layout } from '../../../ui/complex/layout.js'
import { color } from '../../../ui/style.js'
import { createRemoteAgentIam, ensureRemoteAgentUser, printCredentials } from './shared.js'

export const create = (program: Command) => {
	program
		.command('create')
		.description('Create the IAM user & access key a remote agent needs to run the dev & test commands')
		.action(async () => {
			await layout('remote-agent credentials create', async ({ appConfig }) => {
				const { iam, policy } = await createRemoteAgentIam(appConfig)

				await ensureRemoteAgentUser(iam, policy)

				// A second key can be made, but its secret would then live
				// next to a key nobody can see anymore - rotation is the
				// explicit path for that.
				const keys = await iam.listKeys()

				if (keys.length > 0) {
					const key = keys[0]!
					const created = key.createdAt ? ` created ${key.createdAt.toISOString()}` : ''

					log.warning(
						`The ${iam.userName} user already has an access key (${key.id}${created}). ` +
							`Its secret can't be shown again - run ${color.info('awsless remote-agent credentials rotate')} to replace it.`
					)

					return
				}

				const key = await iam.createKey()

				printCredentials(appConfig, key)
			})
		})
}
