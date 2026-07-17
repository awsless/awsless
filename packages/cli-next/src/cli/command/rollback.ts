import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { Cancelled } from '../../error.js'
import { rollbackAppDeployment } from '../../util/deployment.js'
import { playSuccessSound } from '../../util/sound.js'
import { layout } from '../ui/complex/layout.js'

export const rollback = (program: Command) => {
	program
		.command('rollback')
		.argument('[deployment]', 'Deployment id to activate, like "main-42", defaults to the previous deployment')
		.description('Activate an earlier deployment')
		.action(async (id: string | undefined) => {
			await layout('rollback', async ({ appConfig }) => {
				if (!process.env.SKIP_PROMPT) {
					const ok = await prompt.confirm({
						message:
							id === undefined
								? `Are you sure you want to activate the previous deployment?`
								: `Are you sure you want to activate deployment #${id}?`,
					})

					if (!ok) {
						throw new Cancelled()
					}
				}

				const target = await log.task({
					initialMessage: 'Activating the deployment',
					successMessage: 'Done activating the deployment.',
					task: () => rollbackAppDeployment({ appConfig, id }),
				})

				playSuccessSound()

				return `Deployment #${target} is live.`
			})
		})
}
