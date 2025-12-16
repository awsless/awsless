import { isCancel, spinner, text } from '@clack/prompts'
import { Command } from 'commander'
import { Cancelled } from '../../../error.js'
import { getCredentials } from '../../../util/aws.js'
import { SsmStore } from '../../../util/ssm.js'
import { layout } from '../../ui/complex/layout.js'

export const set = (program: Command) => {
	program
		.command('set <name>')
		.description('Set a config value')
		// .option('-e --encrypt', 'Encrypt the config value')
		.action(async (name: string) => {
			await layout('config set', async ({ appConfig }) => {
				const credentials = getCredentials(appConfig.profile)
				const params = new SsmStore({
					credentials,
					appConfig,
				})

				const initialValue = await params.get(name)

				const value = await text({
					message: 'Enter the config value:',
					initialValue,
					validate(value) {
						if (value === '') {
							return `Value can't be empty`
						}

						return
					},
				})

				if (isCancel(value)) {
					throw new Cancelled()
				}

				const spin = spinner()

				spin.start('Saving remote config parameter')

				await params.set(name, value)

				spin.stop(`Done saving remote config parameter.`)
			})
		})
}
