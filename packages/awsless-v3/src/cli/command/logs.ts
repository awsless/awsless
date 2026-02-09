import { CloudWatchLogsClient, StartLiveTailCommand } from '@aws-sdk/client-cloudwatch-logs'
import { log } from '@awsless/clui'
import { aws } from '@terraforge/aws'
import chalk from 'chalk'
import chunk from 'chunk'
import { Command as CliCommand } from 'commander'
import { formatDate } from 'date-fns'
import wildstring from 'wildstring'
import { createApp } from '../../app.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { createWorkSpace } from '../../util/workspace.js'
import { layout } from '../ui/complex/layout.js'
import { color, icon } from '../ui/style.js'
// import { task, wrap } from '../ui/util.js'

export const logs = (program: CliCommand) => {
	program
		.command('logs')
		.argument(`<stacks...>`, 'Provide a list of stacks to stream logs from.')
		.description('Stream the latest logs from you app.')
		.action(async (filters: string[]) => {
			await layout(`logs`, async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)
				const { app } = createApp({ appConfig, stackConfigs, accountId })

				const { workspace } = await createWorkSpace({
					credentials,
					accountId,
					profile,
					region,
				})

				await workspace.hydrate(app)

				// ---------------------------------------------------
				// Find log groups

				// const stackNames = app.stacks
				// 	.filter(stack => {
				// 		return !!filters.find(f => wildstring.match(f, stack.name))
				// 	})
				// 	.map(s => s.name)

				// console.log(
				// 	app.stacks.map(s => s.name),
				// 	filters,
				// 	stackNames
				// )

				const logGroupArns: string[] = []

				for (const stack of app.stacks) {
					// Filter stacks
					if (filters.find(f => wildstring.match(f, stack.name))) {
						// Find all log groups inside our stacks
						for (const resource of stack.resources) {
							if (resource.type === 'aws_cloudwatch_log_group') {
								const logGroup = resource as unknown as aws.cloudwatch.LogGroup

								logGroupArns.push(await logGroup.arn)
							}
						}
					}
				}

				// console.log(logGroupArns)

				// ---------------------------------------------------
				// Start Live Tail session

				const client = new CloudWatchLogsClient({
					credentials,
					region,
				})

				const abort = new AbortController()

				process.once('exit', () => {
					abort.abort()
				})

				process.once('SIGINT', () => {
					abort.abort()
				})

				const streams = await log.task({
					initialMessage: 'Connecting to the log stream...',
					errorMessage: 'Failed to connect to the log stream.',
					async task(ctx) {
						const result = await Promise.all(
							chunk(logGroupArns, 10).map(async arns => {
								const command = new StartLiveTailCommand({
									logGroupIdentifiers: arns,
								})

								const response = await client.send(command, {
									abortSignal: abort.signal,
								})

								if (!response.responseStream) {
									throw new Error('Failed to connect to the log stream.')
								}

								return response.responseStream
							})
						)

						ctx.updateMessage(
							`Connected to ${result.length} log stream${plural(result.length)} for ${logGroupArns.length} function${plural(logGroupArns.length)}.`
						)

						return result
					},
				})

				// ---------------------------------------------------
				// Format incoming logs

				await Promise.all(
					streams.map(async stream => {
						for await (const event of stream) {
							if (event.sessionUpdate) {
								for (const result of event.sessionUpdate.sessionResults ?? []) {
									const group = result.logGroupIdentifier?.split(':').at(1) ?? ''
									const timestamp = result.timestamp ?? Date.now()
									const date = new Date(timestamp)

									const message = result.message ?? ''
									const data = parseJsonLog(message)

									formatLog(data.level, data.date ?? date, group, data.message)
								}
							}
						}
					})
				)
			})
		})
}

const plural = (count: number) => {
	return count > 1 ? 's' : ''
}

const formatLog = (level: string, date: Date, group: string, message: string) => {
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
				color.info(group),
			].join(' '),
			message,
		].join('\n'),
		levelColor(icon.dot)
	)
}

const parseJsonLog = (
	message: string
): {
	level: string
	message: string
	date?: Date
} => {
	let json

	try {
		json = JSON.parse(message)
	} catch (error) {}

	if (
		'level' in json &&
		typeof json.level === 'string' &&
		'timestamp' in json &&
		typeof json.timestamp === 'string' &&
		'message' in json
	) {
		return {
			level: json.level,
			message: typeof json.message === 'string' ? json.message : JSON.stringify(json.message, undefined, 2),
			date: new Date(json.timestamp),
		}
	}

	if (
		'type' in json &&
		typeof json.type === 'string' &&
		json.type.startsWith('platform') &&
		'time' in json &&
		typeof json.time === 'string' &&
		'record' in json
	) {
		return {
			level: 'SYSTEM',
			message: JSON.stringify(json.record, undefined, 2),
			date: new Date(json.time),
		}
	}

	return {
		level: 'INFO',
		message: JSON.stringify(json, undefined, 2),
	}
}
