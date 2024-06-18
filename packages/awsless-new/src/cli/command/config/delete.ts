import { confirm, isCancel, spinner } from '@clack/prompts'
import { Command } from 'commander'
import { Cancelled } from '../../../error.js'
import { getCredentials } from '../../../util/aws.js'
import { SsmStore } from '../../../util/ssm.js'
import { layout } from '../../ui/complex/layout.js'
import { color } from '../../ui/style.js'

export const del = (program: Command) => {
	program
		.command('delete <name>')
		.description('Delete a config value')
		.action(async (name: string) => {
			await layout('config delete', async ({ appConfig }) => {
				const credentials = getCredentials(appConfig.profile)
				const params = new SsmStore({
					credentials,
					appConfig,
				})

				const ok = await confirm({
					message: `Your deleting the ${color.info(name)} config parameter. Are you sure?`,
					initialValue: false,
				})

				if (!ok || isCancel(ok)) {
					throw new Cancelled()
				}

				const spin = spinner()
				spin.start(`Deleting remote config parameter`)

				await params.delete(name)

				spin.stop(`Done deleting remote config parameter.`)
			})
		})
}
