import { log } from '@awsless/clui'
import { Command } from 'commander'
import { layout } from '../../../ui/complex/layout.js'
import { createRemoteAgentIam, ensureRemoteAgentUser, printCredentials } from './shared.js'

export const rotate = (program: Command) => {
	program
		.command('rotate')
		.description('Replace the access key of the remote agent IAM user')
		.action(async () => {
			await layout('remote-agent credentials rotate', async ({ appConfig }) => {
				const { iam, policy } = await createRemoteAgentIam(appConfig)

				await ensureRemoteAgentUser(iam, policy)

				// The new key exists before the old ones go, so an agent
				// switching over never hits a window without a valid key.
				const old = await iam.listKeys()
				const key = await iam.createKey()

				for (const entry of old) {
					await iam.deleteKey(entry.id)
				}

				if (old.length > 0) {
					log.info(`Deleted ${old.length} previous access key${old.length === 1 ? '' : 's'}.`)
				}

				printCredentials(appConfig, key)
			})
		})
}
