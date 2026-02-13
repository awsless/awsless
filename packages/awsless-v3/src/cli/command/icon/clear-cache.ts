import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront'
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { Cancelled, log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { randomUUID } from 'crypto'
import { createApp } from '../../../app.js'
import { ExpectedError } from '../../../error.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { createWorkSpace } from '../../../util/workspace.js'
import { layout } from '../../ui/complex/layout.js'

export const clearCache = (program: Command) => {
	program
		.command('clear-cache')
		.argument('[stack]', 'The stack name of the icon proxy')
		.argument('[name]', 'The name of the icon proxy')
		.description('Clears the cache of the icon proxy')
		.action(async (stack: string | undefined, name: string | undefined) => {
			await layout('icon clear-cache', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				if (!stack) {
					const iconStacks = stackConfigs.filter(stack => {
						if (Object.keys(stack.icons ?? {}).length > 0) {
							return stack
						}
						return
					})

					stack = await prompt.select({
						message: 'Select the stack:',
						options: iconStacks.map(stack => ({
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

					const names = Object.keys(stackConfig.icons ?? {})
					if (!names) {
						throw new ExpectedError(`No icon resources are defined in stack "${stack}".`)
					}

					name = await prompt.select({
						message: 'Select the icon resource:',
						options: names.map(name => ({
							label: name,
							value: name,
						})),
					})
				}

				const ok = await prompt.confirm({
					message: `Are you sure you want to clear the cache`,
				})

				if (!ok) {
					throw new Cancelled()
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
				let cacheBucket: string
				try {
					distributionId = await shared.entry('icon', 'distribution-id', name)
					cacheBucket = await shared.entry('icon', 'cache-bucket', name)
				} catch (_) {
					throw new ExpectedError(`The icon resource hasn't been deployed yet.`)
				}

				// ------------------------------------------------
				// Remove all files from the cache bucket

				const s3Client = new S3Client({
					credentials,
					region,
				})

				const cloudFrontClient = new CloudFrontClient({
					credentials,
					region: 'us-east-1',
				})

				let totalDeleted = 0

				await log.task({
					initialMessage: 'Clearing cache...',
					successMessage: 'Cache successfully cleared.',
					task: async () => {
						let continuationToken: string | undefined
						while (true) {
							const result = await s3Client.send(
								new ListObjectsV2Command({
									Bucket: cacheBucket,
									ContinuationToken: continuationToken,
									MaxKeys: 1000, // Maximum allowed per request
								})
							)

							if (result.Contents && result.Contents.length > 0) {
								await s3Client.send(
									new DeleteObjectsCommand({
										Bucket: cacheBucket,
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

						await cloudFrontClient.send(
							new CreateInvalidationCommand({
								DistributionId: distributionId,
								InvalidationBatch: {
									CallerReference: randomUUID(),
									Paths: {
										Quantity: 1,
										Items: [shared.entry('icon', 'path', name!)],
									},
								},
							})
						)
					},
				})

				return `${totalDeleted} objects deleted from cache.`
			})
		})
}
