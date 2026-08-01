import { LambdaClient } from '@aws-sdk/client-lambda'
import { log, prompt } from '@awsless/clui'
import { DynamoDBClient } from '@awsless/dynamodb'
import { Command } from 'commander'
import { createApp } from '../../app.js'
import { Cancelled } from '../../error.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import {
	claimDeployment,
	formatDeploymentSummary,
	markDeployed,
	preflightDeployment,
	promoteAppDeployment,
	readDeployedFunctionVersion,
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

				const { app, tests, warnings, builders, ready, appId, configs } = createApp({
					appConfig,
					stackConfigs,
					accountId,
					deploymentId: deployment.id,
					import: options.import,
				})

				// Warn when a config value the app depends on hasn't been set.
				if (configs.size > 0) {
					const params = new SsmStore({ credentials, appConfig })
					const values = await params.list()
					const missing = [...configs].filter(name => !(name in values))

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
						throw new Cancelled()
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

				const deployments = await log.task({
					initialMessage: 'Deploying the stacks to AWS',
					successMessage: 'Done deploying the stacks to AWS.',
					async task() {
						const release = await releaseLock.lock(releaseUrn)

						try {
							await preflightDeployment({ lambda, dynamo, appId: globalAppId, functionName, deployment })
							await workspace.deploy(app, { filters: [] })

							await pullRemoteState(app, state)
							const remoteState = await state.get(app.urn)
							const functionVersion = readDeployedFunctionVersion(remoteState)

							if (functionVersion) {
								await markDeployed({
									client: dynamo,
									appId: globalAppId,
									id: deployment.id,
									functionVersion,
								})
							}

							const deployments = formatDeploymentSummary({
								state: remoteState,
								appConfig,
								id: deployment.id,
							})

							// Promotion goes live, so it must be the last fallible step.
							await promoteAppDeployment({
								appConfig,
								id: deployment.id,
							})

							return deployments
						} finally {
							await release()
						}
					},
				})

				playSuccessSound()

				// The outro truncates to the terminal width, so the multi-line
				// summary is logged as a message, which wraps instead.
				for (const summary of deployments) {
					log.message(summary)
				}

				return `Deployment #${deployment.id} is live.`
			})
		})
}
