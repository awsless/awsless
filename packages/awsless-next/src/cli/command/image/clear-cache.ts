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
		.command('cache-clear')
		.argument('[stack]', 'The stack name of the image proxy')
		.argument('[name]', 'The name of the image proxy')
		.description('Clears the cache of the image proxy')
		.action(async (stack: string | undefined, name: string | undefined) => {
			await layout('image cache-clear', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				if (!stack) {
					const imageStacks = stackConfigs.filter(stack => {
						if (Object.keys(stack.images ?? {}).length > 0) {
							return stack
						}
						return
					})

					stack = await prompt.select({
						message: 'Select the stack:',
						options: imageStacks.map(stack => ({
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

					const names = Object.keys(stackConfig.images ?? {})
					if (!names) {
						throw new ExpectedError(`No image resources are defined in stack "${stack}".`)
					}

					name = await prompt.select({
						message: 'Select the image resource:',
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
					profile,
					region,
				})

				await workspace.hydrate(app)

				let distributionId: string | undefined
				let cacheBucket: string | undefined
				try {
					distributionId = await shared.entry('image', 'distribution-id', name)
					cacheBucket = await shared.entry('image', 'cache-bucket', name)
				} catch (_) {
					throw new ExpectedError(`The image resource hasn't been deployed yet.`)
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
										Items: ['/*'],
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
