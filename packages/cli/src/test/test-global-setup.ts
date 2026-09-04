import { readFileSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { $mockdate, setGlobalTypes } from '@awsless/json'
import { beforeAll } from 'vitest'

// The mocks must land in the same awsless copy the test files import,
// which is the project's, not the cli's.
const loadAwsless = async (): Promise<any> => {
	try {
		const dir = join(process.cwd(), 'node_modules', 'awsless')
		const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
		const entry = pkg.exports?.['.']?.import ?? pkg.module ?? pkg.main

		if (entry) {
			return await import(/* @vite-ignore */ pathToFileURL(join(dir, entry)).href)
		}
	} catch {}

	return import('awsless')
}

// Module scope on purpose: the test config values must be set before
// any test file import resolves.
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
		process.env.SEARCH_ENDPOINT = manifest.servers.search.endpoint
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
	// Mocked dates must survive a json round trip inside the tests.
	setGlobalTypes({ $mockdate })
})
