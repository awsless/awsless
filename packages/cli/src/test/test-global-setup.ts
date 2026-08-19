import { readFileSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { $mockdate, setGlobalTypes } from '@awsless/json'
import { beforeAll } from 'vitest'

// The awsless module MUST be the exact same instance the test files
// import, so the registry & client mocks land in the right copy. The
// test files resolve it from the project, while this setup file lives
// inside the cli - so the project's own copy is loaded explicitly.
const loadAwsless = async (): Promise<any> => {
	try {
		const dir = join(process.cwd(), 'node_modules', 'awsless')
		const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
		const entry = pkg.exports?.['.']?.import ?? pkg.module ?? pkg.main

		if (entry) {
			return await import(/* @vite-ignore */ pathToFileURL(join(dir, entry)).href)
		}
	} catch (_) {}

	return import('awsless')
}

// The auto test environment materializes the whole app from the config
// manifest: every table exists, cross stack function, task & queue
// calls run the REAL handler of the other stack, and topic & pubsub
// publishes are recorded spies. This runs at module scope, so the test
// config values are set before any test file import resolves.
const manifestFile = process.env.AWSLESS_TEST_MANIFEST

if (manifestFile) {
	const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'))

	// Resources on a shared run-wide server (like the search indexes)
	// namespace through a unique per-file app prefix - full isolation
	// without booting those servers per file.
	process.env.APP = manifest.servers?.search
		? `${manifest.app}-t${Math.random().toString(36).slice(2, 8)}`
		: manifest.app

	process.env.AWS_REGION = manifest.region

	process.env.AWS_ACCESS_KEY_ID ??= 'local'
	process.env.AWS_SECRET_ACCESS_KEY ??= 'local'

	if (manifest.servers?.search) {
		process.env.SEARCH_DOMAIN = manifest.servers.search.domain
	}

	// The table key envs must exist before any test file import, so
	// schema only table defines resolve their keys from the config.
	const { constantCase } = await import('change-case')

	for (const table of manifest.tableKeys ?? []) {
		process.env[`TABLE_${constantCase(table.stack)}_${constantCase(table.id)}_KEYS`] = JSON.stringify(table.keys)
	}

	const awsless = (await loadAwsless()) as {
		setupTestEnv?: (manifest: unknown, options: { importFile: (file: string) => Promise<any> }) => Promise<void>
	}

	// Older awsless versions simply skip the auto environment. The
	// handler imports route through this file, so vitest transforms
	// the typescript & shares module instances with the test files.
	await awsless.setupTestEnv?.(manifest, {
		importFile: file => import(/* @vite-ignore */ file),
	})
}

beforeAll(() => {
	// Set timezone for dates to UTC-0 to get consistant test results
	process.env.TZ = 'UTC'

	// FIX json stringify & parse for MockDate's
	setGlobalTypes({ $mockdate })

	// The bigfloat equality tester registers in the awsless test setup,
	// which also covers cross-module instances via duck typing.
})
