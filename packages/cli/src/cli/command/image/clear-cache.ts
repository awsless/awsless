// import { randomUUID } from 'crypto'
import { CloudFrontClient } from '@aws-sdk/client-cloudfront'
// import { CloudFrontClient, CreateInvalidationForDistributionTenantCommand } from '@aws-sdk/client-cloudfront'
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { Cancelled, log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { ExpectedError } from '../../../error.js'
import { createInvalidationForDistributionTenants } from '../../../formation/cloudfront.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { createWorkSpace } from '../../../util/workspace.js'
import { layout } from '../../ui/complex/layout.js'

export const clearCache = (program: Command) => {
	program
		.command('clear-cache')
		.argument('[stack]', 'The stack name of the image proxy')
		.argument('[name]', 'The name of the image proxy')
		.description('Clears the cache of the image proxy')
		.action(async (stack: string | undefined, name: string | undefined) => {
			await layout('image clear-cache', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				if (!stack) {
					const imageStacks = stackConfigs.filter(stack => {
						if (Object.keys(stack.images ?? {}).length > 0) {
							return stack
						}
						return
					})

					if (process.env.SKIP_PROMPT) {
						throw new ExpectedError(
							`Pass the stack argument when running with --skip-prompt: [ ${imageStacks
								.map(stack => stack.name)
								.join(', ')} ]`
						)
					}

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
					if (names.length === 0) {
						throw new ExpectedError(`No image resources are defined in stack "${stack}".`)
					}

					if (process.env.SKIP_PROMPT) {
						throw new ExpectedError(
							`Pass the image name argument when running with --skip-prompt: [ ${names.join(', ')} ]`
						)
					}

					name = await prompt.select({
						message: 'Select the image resource:',
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
					distributionId = await shared.entry('image', 'distribution-id', name)
					const entry = shared.entry('image', 'cache', name)
					cache = { bucket: await entry.bucket, prefix: entry.prefix }
				} catch {
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
					region,
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
