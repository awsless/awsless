import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { OpenSearchServer } from '@awsless/open-search-server'
import { RedisServer } from '@awsless/redis'
import { AppConfig } from '../config/app.js'
import { StackConfig } from '../config/stack.js'
import { localEngine } from '../dev/engine.js'
import { directories } from '../util/path.js'
import { createTestManifest, TestManifest } from './manifest.js'

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
	let search: OpenSearchServer | undefined
	let booting: Promise<void> | undefined

	// The boots are deferred until a stack actually misses the test
	// cache, so a fully cached run never pays for them.
	const ensureReady = () => {
		booting ??= (async () => {
			manifest.servers = {}

			if (manifest.searches.length > 0) {
				search = new OpenSearchServer({ engine: localEngine() === 'real' ? 'opensearch' : 'memory' })
				await search.listen()

				manifest.servers.search = { endpoint: `http://localhost:${search.port}` }
			}

			if (manifest.caches.length > 0) {
				redis = new RedisServer({ engine: localEngine() === 'real' ? 'redis' : 'memory' })
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
		await search?.close()
	}
}
