import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import wildstring from 'wildstring'
import { createApp } from '../../app.js'
import { Cancelled, ExpectedError } from '../../error.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { playSuccessSound } from '../../util/sound.js'
import { createWorkSpace, pullRemoteState } from '../../util/workspace.js'
import { debug } from '../debug.js'
import { layout } from '../ui/complex/layout.js'
import { color } from '../ui/style.js'
import { task } from '../ui/util.js'

export const del = (program: Command) => {
	program
		.command('delete')
		.argument('[stacks...]', 'Optionally filter stacks to delete')
		.description('Delete your app from AWS')
		.action(async (filters: string[]) => {
			await layout('delete', async ({ appConfig, stackConfigs }) => {
				if (appConfig.protect) {
					log.warning('Your app is protected against deletion.')

					return 'Disable the protect flag and try again.'
				}

				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				// ---------------------------------------------------

				const { app, ready } = createApp({ appConfig, stackConfigs, accountId })

				ready()

				// const deletingLine = deploymentLine.reverse()
				// const stackNames = app.stacks.filter(stack => filters.includes(stack.name)).map(s => s.name)
				const stackNames = app.stacks
					.filter(stack => {
						return !!filters.find(f => wildstring.match(f, stack.name))
					})
					.map(s => s.name)

				const formattedFilter = stackNames.map(i => color.info(i)).join(color.dim(', '))

				if (filters.length > 0 && stackNames.length === 0) {
					throw new ExpectedError(`The stack filters provided didn't match.`)
				}

				debug('Stacks to delete', formattedFilter)

				if (!process.env.SKIP_PROMPT) {
					const deployAll = filters.length === 0
					const deploySingle = filters.length === 1
					const ok = await prompt.confirm({
						message: deployAll
							? `Are you sure you want to ${color.error('delete')} ${color.warning('all')} stacks?`
							: deploySingle
								? `Are you sure you want to ${color.error('delete')} the ${formattedFilter} stack?`
								: `Are you sure you want to ${color.error(
										'delete'
									)} the [ ${formattedFilter} ] stacks?`,
					})

					if (!ok) {
						throw new Cancelled()
					}
				}

				// ---------------------------------------------------

				const { workspace, state } = await createWorkSpace({
					credentials,
					accountId,
					profile,
					region,
				})

				await task('Deleting the stacks to AWS', async update => {
					await workspace.delete(app, {
						filters: stackNames,
					})

					await pullRemoteState(app, state)

					update('Done deleting the stacks to AWS.')
				})

				playSuccessSound()

				return 'Your app has been deleted!'
			})
		})
}
