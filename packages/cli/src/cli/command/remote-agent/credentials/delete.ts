import { log } from '@awsless/clui'
import { Command } from 'commander'
import { layout } from '../../../ui/complex/layout.js'
import { createRemoteAgentIam } from './shared.js'

export const del = (program: Command) => {
	program
		.command('delete')
		.description('Delete the remote agent IAM user, its policy & access keys')
		.action(async () => {
			await layout('remote-agent credentials delete', async ({ appConfig }) => {
				const { iam } = await createRemoteAgentIam(appConfig)

				const deleted = await log.task({
					initialMessage: `Deleting the ${iam.userName} IAM user...`,
					successMessage: `Deleted the ${iam.userName} IAM user.`,
					errorMessage: `Failed to delete the ${iam.userName} IAM user.`,
					task: () => iam.deleteUser(),
				})

				if (!deleted) {
					log.info(`The ${iam.userName} IAM user doesn't exist - nothing to delete.`)
				}
			})
		})
}
