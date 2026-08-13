import { RedisServer } from '@awsless/redis'
import { Command } from 'commander'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { createApp } from '../../app.js'
import { findFreePort, LOCAL_ACCOUNT_ID } from '../../dev/util.js'
import { ExpectedError } from '../../error.js'
import { createTestManifest } from '../../test/manifest.js'
import { directories } from '../../util/path.js'
import { layout } from '../ui/complex/layout.js'
import { runTests } from '../ui/complex/run-tests.js'

const waitForSearch = async (port: number, timeoutMs: number) => {
	const deadline = Date.now() + timeoutMs

	while (Date.now() < deadline) {
		try {
			const res = await fetch(`http://localhost:${port}`)

			if (res.ok) {
				return
			}
		} catch (_) {}

		await new Promise(resolve => setTimeout(resolve, 500))
	}

	throw new Error('The local OpenSearch server never became ready.')
}

export const test = (program: Command) => {
	program
		.command('test')
		.argument('[stacks...]', 'Optionally filter stacks to test')
		.option('-f --filters <string...>', 'Optionally filter test files')
		.description('Test your app')
		.action(async (stacks?: string[], options?: { filters?: string[] }) => {
			await layout(`test ${stacks ?? ''}`, async props => {
				// Tests run fully local against the auto test environment,
				// so they never need aws credentials - the same fake
				// account as the dev environment feeds the synth.
				const accountId = LOCAL_ACCOUNT_ID

				const { tests, appId } = createApp({ ...props, accountId })

				if (tests.length === 0) {
					return 'No tests found.'
				}

				// The manifest lets the vitest setup materialize the whole
				// app: every table, real handler & test config value.
				const manifest = createTestManifest(props.appConfig, props.stackConfigs)
				const manifestFile = join(directories.output, 'test', 'manifest.json')

				// The heavy resource servers boot ONCE for the whole test
				// run & every test file namespaces into them, so test
				// files never race each other over ports. Tables run as a
				// cheap in-process server per test file instead, so their
				// stream consumers settle inside the write calls.
				let redis: RedisServer | undefined
				let killSearch: (() => Promise<void>) | undefined

				manifest.servers = {}

				let passed = false

				// The boots live inside the try: a launched server whose
				// readiness check fails must still tear down.
				try {
					if (manifest.searches.length > 0) {
						const { download, launch, VERSION_3_5_0_MIN } = await import('@awsless/open-search')

						const port = await findFreePort()
						const path = await download(VERSION_3_5_0_MIN)

						killSearch = await launch({
							path,
							port,
							host: 'localhost',
							version: VERSION_3_5_0_MIN,
							debug: false,
						})

						await waitForSearch(port, 60_000)

						manifest.servers.search = { domain: `localhost:${port}` }
					}

					if (manifest.caches.length > 0) {
						redis = new RedisServer()
						// Every vitest worker isolates into its own database.
						await redis.start(undefined, undefined, ['--databases', '256'])
						await redis.ping()

						manifest.servers.redis = { host: '127.0.0.1', port: await redis.getPort() }
					}

					await mkdir(join(directories.output, 'test'), { recursive: true })
					await writeFile(manifestFile, JSON.stringify(manifest))

					passed = await runTests(tests, stacks, options?.filters, {
						showLogs: true,
						manifest,
						env: {
							APP: props.appConfig.name,
							APP_ID: appId,
							AWS_REGION: props.appConfig.region,
							AWS_ACCOUNT_ID: accountId,
							AWSLESS_TEST_MANIFEST: manifestFile,
						},
					})
				} finally {
					await redis?.kill()
					await killSearch?.()
				}

				if (!passed) {
					throw new ExpectedError('Tests failed.')
				}

				return 'All tests finished.'
			})
		})
}
