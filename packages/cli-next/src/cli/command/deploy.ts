import { DynamoDBClient } from '@awsless/dynamodb'
import { log, prompt } from '@awsless/clui'
import { LambdaClient } from '@aws-sdk/client-lambda'
import { Command } from 'commander'
import { createApp } from '../../app.js'
import { Cancelled } from '../../error.js'
import { nextDeploymentId } from '../../formation/cloudfront-kvs.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { formatGlobalResourceName, generateGlobalAppId } from '../../util/name.js'
import { playSuccessSound } from '../../util/sound.js'
import {
	createDeploymentBackends,
	createWorkSpace,
	getAppReleaseLockUrn,
	pullRemoteState,
} from '../../util/workspace.js'
import { bootstrapAwsless } from '../ui/complex/bootstrap-awsless.js'
import { buildAssets } from '../ui/complex/build-assets.js'
import { layout } from '../ui/complex/layout.js'
import { runTests } from '../ui/complex/run-tests.js'
import { showWarnings } from '../ui/complex/show-warnings.js'
import { color } from '../ui/style.js'
import { preflightDeployment, promoteAppDeployment } from './deployment.js'

export const deploy = (program: Command) => {
	program
		.command('deploy')
		.option('--skip-tests', 'Skip tests')
		.option('--import', 'Import already existing resources')
		.description('Deploy your app to AWS')
		.action(async (options: { skipTests: boolean; import: boolean }) => {
			await layout('deploy', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				// ---------------------------------------------------
				// deploy the bootstrap first...

				await bootstrapAwsless({ credentials, region, accountId })

				// ---------------------------------------------------
				// every deployment gets the next app-wide number; cancelled
				// deploys leave a harmless gap in the sequence

				const dynamo = new DynamoDBClient({ credentials, region })
				const globalAppId = generateGlobalAppId({
					accountId,
					region,
					appName: appConfig.name,
				})
				const deploymentId = await nextDeploymentId(dynamo, globalAppId)

				// ---------------------------------------------------

				const { app, tests, warnings, builders, ready } = createApp({
					appConfig,
					stackConfigs,
					accountId,
					deploymentId,
					import: options.import,
				})

				await showWarnings(warnings)

				if (!process.env.SKIP_PROMPT) {
					const ok = await prompt.confirm({
						message: `Are you sure you want to deploy ${color.warning('all')} stacks?`,
					})

					if (!ok) {
						throw new Cancelled()
					}
				}

				// ---------------------------------------------------
				// Building stack assets & run tests

				if (!options.skipTests) {
					const passed = await runTests(tests, [], [], {
						showLogs: false,
					})

					if (!passed) {
						throw new Cancelled()
					}
				}

				await buildAssets(builders, [])

				// ---------------------------------------------------
				// call ready after the builds

				ready()

				// ---------------------------------------------------

				const { workspace, state } = await createWorkSpace({
					credentials,
					accountId,
					region,
				})
				const { lock: releaseLock } = createDeploymentBackends({ credentials, accountId, region })
				const releaseUrn = getAppReleaseLockUrn(globalAppId)
				const lambda = new LambdaClient({ credentials, region })
				const functionName = formatGlobalResourceName({
					appName: appConfig.name,
					resourceType: 'function',
					resourceName: 'bundle',
				})
				let deployments: string[] = []

				await log.task({
					initialMessage: 'Deploying the stacks to AWS',
					successMessage: 'Done deploying the stacks to AWS.',
					async task() {
						const release = await releaseLock.lock(releaseUrn)

						try {
							await preflightDeployment({ lambda, functionName, deploymentId })
							await workspace.deploy(app, { filters: [] })

							await pullRemoteState(app, state)
							const deployed = await state.get(app.urn)
							const previewUrls = new Map<string, string>()
							const stacks = Object.values(deployed?.stacks ?? {}) as Array<{
								nodes: Record<string, { type: string; output: { domainName?: string } }>
							}>
							for (const stack of stacks) {
								for (const [urn, node] of Object.entries(stack.nodes)) {
									if (node.type === 'aws_cloudfront_distribution' && urn.endsWith(':{preview}')) {
										const routerId = urn.match(/:router:\{([^}]+)\}/)?.[1]
										if (routerId) {
											previewUrls.set(routerId, `https://${node.output.domainName}`)
										}
									}
								}
							}

							const deploymentDomain = appConfig.defaults.deploymentDomain

							deployments = Object.keys(appConfig.defaults.router ?? {}).map(routerId => {
								return [
									`${routerId}: deployment #${deploymentId}`,
									deploymentDomain && `https://${routerId}-${deploymentId}.${deploymentDomain}`,
									previewUrls.get(routerId),
								]
									.filter(Boolean)
									.join('\n')
							})

							// Promotion goes live, so it must be the last fallible step.
							await promoteAppDeployment({
								appConfig,
								deploymentId,
							})
						} finally {
							await release()
						}
					},
				})

				playSuccessSound()

				const details = deployments.length > 0 ? `\n${deployments.join('\n')}` : ''

				return `Deployment #${deploymentId} is live.${details}`
			})
		})
}
