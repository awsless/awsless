import { CloudFrontClient } from '@aws-sdk/client-cloudfront'
import { CloudFrontKeyValueStoreClient } from '@aws-sdk/client-cloudfront-keyvaluestore'
import { LambdaClient } from '@aws-sdk/client-lambda'
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { log, prompt } from '@awsless/clui'
import { DynamoDBClient } from '@awsless/dynamodb'
import { Command } from 'commander'
import { createApp } from '../../app.js'
import { AppConfig } from '../../config/app.js'
import { StackConfig } from '../../config/stack.js'
import { Cancelled, ExpectedError } from '../../error.js'
import { createInvalidationForDistributionTenants } from '../../formation/cloudfront.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { generateGlobalAppId, getBundleFunctionName } from '../../util/name.js'
import { createWorkSpace } from '../../util/workspace.js'
import { layout } from '../ui/complex/layout.js'

// The credential prelude & the clients every command starts from.
export const createClients = async (appConfig: AppConfig) => {
	const region = appConfig.region
	const credentials = await getCredentials(appConfig.profile)
	const accountId = await getAccountId(credentials, region)

	return {
		region,
		credentials,
		accountId,
		appId: generateGlobalAppId({ accountId, region, appName: appConfig.name }),
		functionName: getBundleFunctionName(appConfig.name),
		dynamo: new DynamoDBClient({ credentials, region }),
		lambda: new LambdaClient({ credentials, region }),
		kvs: new CloudFrontKeyValueStoreClient({ credentials, region }),
		// CloudFront is a global service that only answers in us-east-1.
		cloudfront: new CloudFrontClient({ credentials, region: 'us-east-1' }),
		s3: new S3Client({ credentials, region }),
	}
}

type ProxyType = 'icon' | 'image'

const proxyResources = (type: ProxyType, stack: StackConfig) => {
	return Object.keys((type === 'icon' ? stack.icons : stack.images) ?? {})
}

// The image & icon proxies share one cache layout, so their
// clear-cache commands share one implementation.
export const clearProxyCache = (program: Command, type: ProxyType) => {
	program
		.command('clear-cache')
		.argument('[stack]', `The stack name of the ${type} proxy`)
		.argument('[name]', `The name of the ${type} proxy`)
		.description(`Clears the cache of the ${type} proxy`)
		.action(async (stack: string | undefined, name: string | undefined) => {
			await layout(`${type} clear-cache`, async ({ appConfig, stackConfigs }) => {
				const {
					region,
					credentials,
					accountId,
					s3: s3Client,
					cloudfront: cloudFrontClient,
				} = await createClients(appConfig)

				if (!stack) {
					const stacks = stackConfigs.filter(stack => proxyResources(type, stack).length > 0)

					if (process.env.SKIP_PROMPT) {
						throw new ExpectedError(
							`Pass the stack argument when running with --skip-prompt: [ ${stacks
								.map(stack => stack.name)
								.join(', ')} ]`
						)
					}

					stack = await prompt.select({
						message: 'Select the stack:',
						options: stacks.map(stack => ({
							label: stack.name,
							value: stack.name,
						})),
					})
				}

				if (!name) {
					const stackConfig = stackConfigs.find(s => s.name === stack)
					if (!stackConfig) {
						throw new ExpectedError(`The stack "${stack}" doesn't exist.`)
					}

					const names = proxyResources(type, stackConfig)
					if (names.length === 0) {
						throw new ExpectedError(`No ${type} resources are defined in stack "${stack}".`)
					}

					if (process.env.SKIP_PROMPT) {
						throw new ExpectedError(
							`Pass the ${type} name argument when running with --skip-prompt: [ ${names.join(', ')} ]`
						)
					}

					name = await prompt.select({
						message: `Select the ${type} resource:`,
						options: names.map(name => ({
							label: name,
							value: name,
						})),
					})
				}

				if (!process.env.SKIP_PROMPT) {
					const ok = await prompt.confirm({
						message: `Are you sure you want to clear the cache`,
					})

					if (!ok) {
						throw new Cancelled()
					}
				}

				// ------------------------------------------------
				// Setup to get the correct data

				const { shared, app } = createApp({ appConfig, stackConfigs, accountId })

				const { workspace } = await createWorkSpace({
					credentials,
					accountId,
					region,
				})

				await workspace.hydrate(app)

				let distributionId: string
				let cache: { bucket: string; prefix: string }
				try {
					distributionId = await shared.entry(type, 'distribution-id', name)
					const entry = shared.entry(type, 'cache', name)
					cache = { bucket: await entry.bucket, prefix: entry.prefix }
				} catch {
					throw new ExpectedError(`The ${type} resource hasn't been deployed yet.`)
				}

				// ------------------------------------------------
				// Remove all files from the cache bucket

				let totalDeleted = 0

				await log.task({
					initialMessage: 'Clearing cache...',
					successMessage: 'Cache successfully cleared.',
					task: async () => {
						let continuationToken: string | undefined
						while (true) {
							const result = await s3Client.send(
								new ListObjectsV2Command({
									Bucket: cache.bucket,
									Prefix: cache.prefix,
									ContinuationToken: continuationToken,
									MaxKeys: 1000, // Maximum allowed per request
								})
							)

							if (result.Contents && result.Contents.length > 0) {
								await s3Client.send(
									new DeleteObjectsCommand({
										Bucket: cache.bucket,
										Delete: {
											Objects: result.Contents.map(obj => ({
												Key: obj.Key!,
											})),
											Quiet: true,
										},
									})
								)

								totalDeleted += result.Contents.length
							}

							continuationToken = result.NextContinuationToken

							if (!continuationToken) {
								break
							}
						}

						await createInvalidationForDistributionTenants(cloudFrontClient, {
							distributionId,
							paths: ['/*'],
						})
					},
				})

				return `${totalDeleted} objects deleted from cache.`
			})
		})
}
