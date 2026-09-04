import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { createApp } from '../../app.js'
import { Cancelled, ExpectedError } from '../../error.js'
import { withTestEnvironment } from '../../test/environment.js'
import {
	claimDeployment,
	markDeployed,
	preflightDeployment,
	promoteAppDeployment,
	readDeployedFunctionVersions,
} from '../../util/deployment.js'
import { playSuccessSound } from '../../util/sound.js'
import { SsmStore } from '../../util/ssm.js'
import { createWorkSpace, getAppReleaseLockUrn, pullRemoteState } from '../../util/workspace.js'
import { bootstrapAwsless } from '../ui/complex/bootstrap-awsless.js'
import { buildAssets } from '../ui/complex/build-assets.js'
import { layout } from '../ui/complex/layout.js'
import { createTestEnv, runTests } from '../ui/complex/run-tests.js'
import { showWarnings } from '../ui/complex/show-warnings.js'
import { verifyAlertEndpoints } from '../ui/complex/verify-alert-endpoints.js'
import { createClients } from './util.js'

export const deploy = (program: Command) => {
	program
		.command('deploy')
		.option('--skip-tests', 'Skip tests')
		.option('--import', 'Import already existing resources')
		.description('Deploy your app to AWS')
		.action(async (options: { skipTests: boolean; import: boolean }) => {
			await layout('deploy', async ({ appConfig, stackConfigs }) => {
				const startedAt = new Date()
				const {
					region,
					credentials,
					accountId,
					dynamo,
					lambda,
					functionName,
					appId: globalAppId,
				} = await createClients(appConfig)

				// ---------------------------------------------------
				// deploy the bootstrap first...

				await bootstrapAwsless({ credentials, region, accountId })

				// ---------------------------------------------------

				const params = new SsmStore({ credentials, appConfig })
				const configValues = await params.list()

				// A first pass feeds the checks that run before a deployment
				// id is claimed; the graph is rebuilt with the claimed id below.
				const { tests, warnings, appId, configs } = createApp({
					appConfig,
					stackConfigs,
					accountId,
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
				// Run tests

				if (!options.skipTests) {
					const passed = await withTestEnvironment(
						appConfig,
						stackConfigs,
						({ manifest, manifestFile, ensureReady }) => {
							return runTests(tests, [], [], {
								showLogs: false,
								manifest,
								ensureReady,
								env: createTestEnv({ appConfig, appId, accountId, manifestFile }),
							})
						}
					)

					if (!passed) {
						throw new ExpectedError('Tests failed.')
					}
				}

				// ---------------------------------------------------
				// The claim comes after the prompt & the tests, so a declined
				// or failing deploy doesn't burn a sequence number.

				const deployment = await claimDeployment({ client: dynamo, appId: globalAppId, startedAt })

				const { app, builders, ready } = createApp({
					appConfig,
					stackConfigs,
					accountId,
					deploymentId: deployment.id,
					import: options.import,
					configValues,
				})

				// ---------------------------------------------------
				// Building stack assets

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
					if (error instanceof Cancelled) {
						log.warning('Skipped the alert endpoint verification.')
					} else {
						log.warning(`Skipped the alert endpoint verification. ${String(error)}`)
					}
				}

				return `Deployment ${deployment.id} is live.`
			})
		})
}
