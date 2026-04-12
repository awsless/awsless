import { log, prompt } from '@awsless/clui'
import { diff } from '@vitest/utils/diff'
import { capitalCase } from 'change-case'
import { Command } from 'commander'
import wildstring from 'wildstring'
import { createApp } from '../../../app.js'
import { Cancelled, ExpectedError } from '../../../error.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { createWorkSpace } from '../../../util/workspace.js'
import { layout } from '../../ui/complex/layout.js'
import { color } from '../../ui/style.js'

export const refresh = (program: Command) => {
	program
		.command('refresh')
		.argument('[stacks...]', 'Optionally filter stacks to refresh')
		.description(
			'Compares & syncs the current resource state with the state known to exist in the actual cloud provider.'
		)
		.action(async (filters: string[]) => {
			await layout('state refresh', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				const { app } = createApp({ appConfig, stackConfigs, accountId })
				const { workspace } = await createWorkSpace({ credentials, region, accountId })

				const stackNames = app.stacks
					.filter(stack => {
						return !!filters.find(f => wildstring.match(f, stack.name))
					})
					.map(s => s.name)

				const formattedFilter = stackNames.map(i => color.info(i)).join(color.dim(', '))

				if (filters.length > 0 && stackNames.length === 0) {
					throw new ExpectedError(`The stack filters provided didn't match.`)
				}

				if (!process.env.SKIP_PROMPT) {
					const refreshAll = filters.length === 0
					const refreshSingle = filters.length === 1
					const ok = await prompt.confirm({
						message: refreshAll
							? `Are you sure you want to refresh ${color.warning('all')} stacks?`
							: refreshSingle
								? `Are you sure you want to refresh the ${formattedFilter} stack?`
								: `Are you sure you want to refresh the [ ${formattedFilter} ] stacks?`,
					})

					if (!ok) {
						throw new Cancelled()
					}
				}

				const result = await log.task({
					initialMessage: 'Retrieving the latest state from AWS...',
					successMessage: 'Done retrieving latest state from AWS.',
					errorMessage: 'Failed retrieving latest state from AWS.',
					task() {
						return workspace.refresh(app, {
							filters: stackNames,
						})
					},
				})

				if (!result) {
					return 'Your state is up to date.'
				}

				for (const entry of result.operations) {
					log.warning([color.warning.bold.inverse(` ${capitalCase(entry.operation)} `), entry.urn].join('\n'))

					if (entry.operation === 'update') {
						// console.log(entry.before, entry.after)
						const diffResult = diff(entry.before, entry.after)

						if (diffResult) {
							log.message(diffResult)
						}
					}

					const message =
						entry.operation === 'update'
							? `Are you sure you want to mark this resource as drifted inside your state file?`
							: `Are you sure you want to delete this resource from your state file?`

					const ok = await prompt.confirm({
						message,
						initialValue: false,
					})

					if (ok) {
						entry.commit()
					}
				}

				await log.task({
					initialMessage: 'Saving state changes...',
					successMessage: 'Done storing state changes.',
					errorMessage: 'Failed storing state changes.',
					task() {
						return result.commit()
					},
				})

				return
			})
		})
}
