import { prompt } from '@awsless/clui'
import { DynamoDBClient, dynamoDBClient } from '@awsless/dynamodb'
import { iotClient, IoTDataPlaneClient } from '@awsless/iot'
import { LambdaClient, lambdaClient } from '@awsless/lambda'
import { S3Client, s3Client } from '@awsless/s3'
import { SNSClient, snsClient } from '@awsless/sns'
import { SQSClient, sqsClient } from '@awsless/sqs'
import { Command as CliCommand } from 'commander'
import { createApp } from '../../app.js'
import { Command, CommandHandler } from '../../command.js'
import { ExpectedError } from '../../error.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { layout } from '../ui/complex/layout.js'
// import { task } from '../ui/util.js'

// @ts-ignore
import { tsImport } from 'tsx/esm/api'

export const run = (program: CliCommand) => {
	program
		.command('run')
		// .allowExcessArguments(true)
		.allowUnknownOption(true)
		// .passThroughOptions(true)
		.argument('[command]', 'The command you want to run')
		.description('Run one of your defined commands.')
		.action(async (selected: string | undefined) => {
			await layout(`run ${selected ?? ''}`, async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const credentials = await getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)
				const { commands, appId } = createApp({ appConfig, stackConfigs, accountId })

				// ---------------------------------------------------
				// Select the command

				let command: Command | undefined

				if (selected) {
					command = commands.find(cmd => {
						return cmd.name === selected
					})
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

				// ---------------------------------------------------
				// Import the command

				// console.log('before')
				// console.log(process.cwd())
				// console.log(command.file)
				// console.log(require.cache)

				// delete require.cache[command.file]

				let module: any

				try {
					module = await tsImport(command.file, {
						parentURL: import.meta.url,
					})
				} catch (error) {
					if (typeof error === 'object' && error !== null && 'message' in error) {
						throw error.message
					}

					throw new ExpectedError(`Failed to import: ${command.file}`)
				}

				// const module = await import(command.file)

				// console.log('after')

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

				// const result = await task('Running', update => {
				// 	const options = new CommandOptions(program.args)

				// 	return handler(options, {
				// 		region,
				// 		credentials,
				// 		accountId,
				// 		update,
				// 	})
				// })

				// const options = new CommandOptions(program.args)

				await handler({
					region,
					credentials,
					accountId,
				})

				return
			})
		})
}
