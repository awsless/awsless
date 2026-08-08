import { LambdaClient } from '@aws-sdk/client-lambda'
import { Cancelled as CancelledError, log, prompt } from '@awsless/clui'
import { DynamoDBClient } from '@awsless/dynamodb'
import { Command } from 'commander'
import { createApp } from '../../app.js'
import { Cancelled, ExpectedError } from '../../error.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import {
	claimDeployment,
	markDeployed,
	preflightDeployment,
	promoteAppDeployment,
	readDeployedFunctionVersions,
} from '../../util/deployment.js'
import { generateGlobalAppId, getBundleFunctionName } from '../../util/name.js'
import { playSuccessSound } from '../../util/sound.js'
import { SsmStore } from '../../util/ssm.js'
import { createWorkSpace, getAppReleaseLockUrn, pullRemoteState } from '../../util/workspace.js'
import { bootstrapAwsless } from '../ui/complex/bootstrap-awsless.js'
import { buildAssets } from '../ui/complex/build-assets.js'
import { layout } from '../ui/complex/layout.js'
import { runTests } from '../ui/complex/run-tests.js'
import { showWarnings } from '../ui/complex/show-warnings.js'
import { verifyAlertEndpoints } from '../ui/complex/verify-alert-endpoints.js'

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
				// every deployment claims the next sequence number of its git
				// branch in the manifest; abandoned deploys leave a record
				// without a function version that the prune command sweeps up

				const dynamo = new DynamoDBClient({ credentials, region })
				const globalAppId = generateGlobalAppId({
					accountId,
					region,
					appName: appConfig.name,
				})
				const deployment = await claimDeployment({ client: dynamo, appId: globalAppId })

				// ---------------------------------------------------

				const params = new SsmStore({ credentials, appConfig })
				const configValues = await params.list()

				const { app, tests, warnings, builders, ready, appId, configs } = createApp({
					appConfig,
					stackConfigs,
					accountId,
					deploymentId: deployment.id,
					import: options.import,
					configValues,
				})

				// Warn when a config value the app depends on hasn't been set.
				if (configs.size > 0) {
					const missing = [...configs].filter(name => !(name in configValues))

					if (missing.length > 0) {
						warnings.push({
							message: `The following config values haven't been set yet: [ ${missing.join(
								', '
							)} ]. Set them with "awsless config set <name>".`,
						})
					}
				}

				await showWarnings(warnings)

				if (!process.env.SKIP_PROMPT) {
					const ok = await prompt.confirm({
						message: 'Are you sure you want to deploy?',
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
						env: {
							APP: appConfig.name,
							APP_ID: appId,
							AWS_REGION: appConfig.region,
							AWS_ACCOUNT_ID: accountId,
						},
					})

					if (!passed) {
						throw new ExpectedError('Tests failed.')
					}
				}

				await buildAssets(builders, [])

				// ---------------------------------------------------
				// call ready after the builds

				ready()

				// ---------------------------------------------------

				const {
					workspace,
					state,
					lock: releaseLock,
				} = await createWorkSpace({
					credentials,
					accountId,
					region,
				})
				const releaseUrn = getAppReleaseLockUrn(globalAppId)
				const lambda = new LambdaClient({ credentials, region })
				const functionName = getBundleFunctionName(appConfig.name)

				await log.task({
					initialMessage: 'Deploying the stacks to AWS',
					successMessage: 'Done deploying the stacks to AWS.',
					async task() {
						const release = await releaseLock.lock(releaseUrn)

						try {
							await preflightDeployment({ lambda, dynamo, appId: globalAppId, functionName, deployment })
							await workspace.deploy(app, { filters: [] })

							await pullRemoteState(app, state)
							const remoteState = await state.get(app.urn)
							const functionVersion = readDeployedFunctionVersions(remoteState)[functionName]

							if (functionVersion) {
								await markDeployed({
									client: dynamo,
									appId: globalAppId,
									id: deployment.id,
									functionVersion,
								})
							}

							// Promotion goes live, so it must be the last fallible step.
							await promoteAppDeployment({
								appConfig,
								id: deployment.id,
							})
						} finally {
							await release()
						}
					},
				})

				playSuccessSound()

				// The deployment is already live, so this may never fail the deploy.
				try {
					await verifyAlertEndpoints({ credentials, appConfig, accountId, configValues })
				} catch (error) {
					if (error instanceof Cancelled || error instanceof CancelledError) {
						log.warning('Skipped the alert endpoint verification.')
					} else {
						log.warning(`Skipped the alert endpoint verification. ${error}`)
					}
				}

				return `Deployment ${deployment.id} is live.`
			})
		})
}
