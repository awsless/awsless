import { Command } from 'commander'
import { ExpectedError } from '../../error.js'
import { layout } from '../ui/complex/layout.js'
import { rollbackAppDeployment } from '../../util/deployment.js'

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

				const targets = await rollbackAppDeployment({ appConfig, deploymentId })

				return `Deployment #${targets[0]} is live.`
			})
		})
}
