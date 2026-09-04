import { CloudWatchLogsClient, StartLiveTailCommand } from '@aws-sdk/client-cloudwatch-logs'
import { log } from '@awsless/clui'
import { color as chalk } from '@awsless/clui'
import { aws } from '@terraforge/aws'
import { getMeta, resolveInputs } from '@terraforge/core'
import chunk from 'chunk'
import { Command as CliCommand } from 'commander'
import { formatDate } from 'date-fns'
import { createApp } from '../../../app.js'
import { ExpectedError } from '../../../error.js'
import { isError } from '../../../util/aws.js'
import { layout } from '../../ui/complex/layout.js'
import { color, icon } from '../../ui/style.js'
import { createClients } from '../util.js'
import { matchGroups, originFromLogGroup, parseLogLine } from './util.js'

export const logs = (program: CliCommand) => {
	program
		.command('logs')
		.argument(
			'[groups...]',
			'Only stream specific log groups, like "bundle", "my-stack" or "my-stack:function:name".'
		)
		.description('Stream the latest logs from your app.')
		.action(async (groups: string[]) => {
			await layout(`logs`, async ({ appConfig, stackConfigs, exit }) => {
				const { region, credentials, accountId } = await createClients(appConfig)
				const { app } = createApp({ appConfig, stackConfigs, accountId })

				// ---------------------------------------------------
				// Log group names come from the config alone, so the
				// deployed state never needs loading.

				const groupArns: string[] = []
				const origins: string[] = []

				for (const resource of app.resources) {
					if (!(resource instanceof aws.cloudwatch.LogGroup)) {
						continue
					}

					const name = (await resolveInputs(getMeta(resource).input.name)) as string
					const origin = originFromLogGroup(name, appConfig.name)

					origins.push(origin)

					if (!matchGroups(origin, groups)) {
						continue
					}

					groupArns.push(`arn:aws:logs:${region}:${accountId}:log-group:${name}`)
				}

				if (groupArns.length === 0) {
					if (origins.length === 0) {
						throw new ExpectedError('No log groups found to stream from.')
					}

					throw new ExpectedError(
						[
							`No log groups match: ${groups.join(', ')}`,
							`Available log groups:`,
							...origins.map(origin => `  ${origin}`),
						].join('\n')
					)
				}

				// ---------------------------------------------------
				// Start Live Tail session

				const client = new CloudWatchLogsClient({
					credentials,
					region,
				})

				const controller = new AbortController()

				process.once('exit', () => {
					controller.abort()
				})

				process.once('SIGINT', () => {
					controller.abort()
				})

				const streams = await log.task({
					initialMessage: 'Connecting to the log stream...',
					errorMessage: 'Failed to connect to the log stream.',
					async task(ctx) {
						const result = await Promise.all(
							chunk(groupArns, 10).map(async arns => {
								const command = new StartLiveTailCommand({
									logGroupIdentifiers: arns,
								})

								const response = await client.send(command, {
									abortSignal: controller.signal,
								})

								if (!response.responseStream) {
									throw new Error('Failed to connect to the log stream.')
								}

								return response.responseStream
							})
						)

						ctx.updateMessage(
							`Connected to ${result.length} log stream${plural(result.length)} for ${groupArns.length} log group${plural(groupArns.length)}.`
						)

						return result
					},
				})

				// ---------------------------------------------------
				// Format incoming logs

				try {
					await Promise.all(
						streams.map(async stream => {
							for await (const event of stream) {
								if (!event.sessionUpdate) {
									continue
								}

								for (const result of event.sessionUpdate.sessionResults ?? []) {
									const identifier = result.logGroupIdentifier ?? ''
									const groupName = identifier.includes(':log-group:')
										? identifier.split(':log-group:').at(-1)!
										: identifier

									const line = parseLogLine(result.message ?? '')
									const origin = line.route ?? originFromLogGroup(groupName, appConfig.name)
									const date = line.date ?? new Date(result.timestamp ?? Date.now())

									formatLog(line.level, date, origin, line.message)
								}
							}
						})
					)
				} catch (error) {
					// The ctrl-c abort surfaces as a stream error, not a failure.
					if (isError(error, 'AbortError')) {
						exit(130)
					}

					throw error
				}
			})
		})
}

const plural = (count: number) => {
	return count > 1 ? 's' : ''
}

const formatLog = (level: string, date: Date, origin: string, message: string) => {
	const levels: Record<string, (v: string) => string> = {
		INFO: chalk.cyan,
		DEBUG: chalk.cyan,
		TRACE: chalk.cyan,
		WARN: chalk.yellow,
		ERROR: chalk.red,
		FATAL: chalk.magenta,
		SYSTEM: chalk.blue,
	}

	const levelColor = levels[level] ?? chalk.cyan

	log.message(
		[
			[
				//
				levelColor(level),
				color.dim(formatDate(date, 'HH:mm:ss')),
				color.info(origin),
			].join(' '),
			message,
		].join('\n'),
		levelColor(icon.dot)
	)
}
