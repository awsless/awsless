import { readFileSync } from 'fs'
import { join } from 'path'
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'

// Shared test config for every workspace package: each package's test
// script points here and the working directory decides which package
// runs. A package can extend this with a "vitest" field in its
// package.json.
const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))

export default mergeConfig(
	defineConfig({
		root: process.cwd(),
		test: {
			globals: true,
			include: ['test/**/*.{js,jsx,ts,tsx}'],
			exclude: ['test/**/_*', ...configDefaults.exclude],
		},
	}),
	{ test: pkg.vitest ?? {} }
)
