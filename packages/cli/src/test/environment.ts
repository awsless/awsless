import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { RedisServer } from '@awsless/redis'
import { AppConfig } from '../config/app.js'
import { StackConfig } from '../config/stack.js'
import { findFreePort } from '../dev/util.js'
import { directories } from '../util/path.js'
import { createTestManifest, TestManifest } from './manifest.js'

const waitForSearch = async (port: number, timeoutMs: number) => {
	const deadline = Date.now() + timeoutMs

	while (Date.now() < deadline) {
		try {
			const res = await fetch(`http://localhost:${port}`)

			if (res.ok) {
				return
			}
		} catch {}

		await new Promise(resolve => setTimeout(resolve, 500))
	}

	throw new Error('The local OpenSearch server never became ready.')
}

// Builds the test manifest & boots the shared resource servers
// around a test run. The test & deploy commands both run tests, so
// the whole environment setup lives here once - a run without the
// manifest registers no mocks at all and fails on the first
// mock.*() call.
export const withTestEnvironment = async (
	appConfig: AppConfig,
	stackConfigs: StackConfig[],
	run: (props: { manifest: TestManifest; manifestFile: string; ensureReady: () => Promise<void> }) => Promise<boolean>
) => {
	// The manifest lets the vitest setup materialize the whole
	// app: every table, real handler & test config value.
	const manifest = createTestManifest(appConfig, stackConfigs)
	const manifestFile = join(directories.output, 'test', 'manifest.json')

	// The heavy resource servers boot ONCE for the whole test
	// run & every test file namespaces into them, so test
	// files never race each other over ports. Tables run as a
	// cheap in-process server per test file instead, so their
	// stream consumers settle inside the write calls.
	let redis: RedisServer | undefined
	let killSearch: (() => Promise<void>) | undefined
	let booting: Promise<void> | undefined

	// The boots are deferred until a stack actually misses the test
	// cache, so a fully cached run never pays for them.
	const ensureReady = () => {
		booting ??= (async () => {
			manifest.servers = {}

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

				manifest.servers.search = { domain: `http://localhost:${port}` }
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
		})()

		return booting
	}

	// The teardown lives in the finally: a launched server whose
	// readiness check fails must still tear down.
	try {
		return await run({ manifest, manifestFile, ensureReady })
	} finally {
		await redis?.kill()
		await killSearch?.()
	}
}
