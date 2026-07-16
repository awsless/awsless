import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { Cancelled, ExpectedError } from '../../error.js'
import { rollbackAppDeployment } from '../../util/deployment.js'
import { playSuccessSound } from '../../util/sound.js'
import { layout } from '../ui/complex/layout.js'

export const rollback = (program: Command) => {
	program
		.command('rollback')
		.argument('[deployment-id]', 'Deployment number to activate, defaults to the previous deployment')
		.description('Activate an earlier deployment')
		.action(async (arg: string | undefined) => {
			await layout('rollback', async ({ appConfig }) => {
				const deploymentId = arg === undefined ? undefined : Number(arg)

				if (deploymentId !== undefined && !Number.isInteger(deploymentId)) {
					throw new ExpectedError(`"${arg}" isn't a valid deployment number.`)
				}

				if (!process.env.SKIP_PROMPT) {
					const ok = await prompt.confirm({
						message:
							deploymentId === undefined
								? `Are you sure you want to activate the previous deployment?`
								: `Are you sure you want to activate deployment #${deploymentId}?`,
					})

					if (!ok) {
						throw new Cancelled()
					}
				}

				const target = await log.task({
					initialMessage: 'Activating the deployment',
					successMessage: 'Done activating the deployment.',
					task: () => rollbackAppDeployment({ appConfig, deploymentId }),
				})

				playSuccessSound()

				return `Deployment #${target} is live.`
			})
		})
}
