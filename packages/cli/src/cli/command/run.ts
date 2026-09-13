import { prompt } from '@awsless/clui'
import { DynamoDBClient, dynamoDBClient } from '@awsless/dynamodb'
import { iotClient, IoTDataPlaneClient } from '@awsless/iot'
import { LambdaClient, lambdaClient } from '@awsless/lambda'
import { S3Client, s3Client } from '@awsless/s3'
import { SNSClient, snsClient } from '@awsless/sns'
import { SQSClient, sqsClient } from '@awsless/sqs'
import { constantCase } from 'change-case'
import { Command as CliCommand } from 'commander'
import { createApp } from '../../app.js'
import { Command, CommandHandler } from '../../command.js'
import { ExpectedError } from '../../error.js'
import { formatTableKeys } from '../../feature/table/util.js'
import { layout } from '../ui/complex/layout.js'
import { createClients } from './util.js'

export const run = (program: CliCommand) => {
	program
		.command('run')
		.allowUnknownOption(true)
		.argument('[command]', 'The command you want to run')
		.description('Run one of your defined commands.')
		.action(async (selected: string | undefined) => {
			await layout(`run ${selected ?? ''}`, async ({ appConfig, stackConfigs }) => {
				const { region, credentials, accountId } = await createClients(appConfig)
				const { commands, appId } = createApp({ appConfig, stackConfigs, accountId })

				// ---------------------------------------------------
				// Select the command

				let command: Command | undefined

				if (selected) {
					command = commands.find(cmd => {
						return cmd.name === selected
					})
				} else if (process.env.SKIP_PROMPT) {
					throw new ExpectedError(
						`Pass the command argument when running with --skip-prompt: [ ${commands
							.map(cmd => cmd.name)
							.join(', ')} ]`
					)
				} else {
					command = await prompt.select({
						message: 'Pick the command you want to run:',
						initialValue: commands[0],
						options: commands.map(cmd => ({
							value: cmd,
							label: cmd.name,
							hint: cmd.description,
						})),
					})
				}

				if (!command) {
					throw new ExpectedError(`The provided command doesn't exist.`)
				}

				// ---------------------------------------------------
				// Set env vars

				process.env.APP = appConfig.name
				process.env.APP_ID = appId
				process.env.AWS_REGION = region
				process.env.AWS_ACCOUNT_ID = accountId

				// Commands import app code that may define tables, which
				// resolve their keys from TABLE_<STACK>_<ID>_KEYS envs.
				for (const stack of stackConfigs) {
					for (const [id, props] of Object.entries(stack.tables ?? {})) {
						process.env[`TABLE_${constantCase(stack.name)}_${constantCase(id)}_KEYS`] = JSON.stringify(
							formatTableKeys(props)
						)
					}
				}

				// ---------------------------------------------------
				// Import the command

				const module = await import(command.file)

				const handler: CommandHandler | undefined = module[command.handler]

				if (!handler) {
					throw new ExpectedError(`No "${command.handler}" handler found.`)
				}

				// ---------------------------------------------------
				// Setup AWS clients with the correct credentials

				dynamoDBClient.set(new DynamoDBClient({ region, credentials }))
				lambdaClient.set(new LambdaClient({ region, credentials }))
				snsClient.set(new SNSClient({ region, credentials }))
				iotClient.set(new IoTDataPlaneClient({ region, credentials }))
				sqsClient.set(new SQSClient({ region, credentials }))
				s3Client.set(new S3Client({ region, credentials }))

				// ---------------------------------------------------
				// Run command

				await handler({
					region,
					credentials,
					accountId,
				})
			})
		})
}
