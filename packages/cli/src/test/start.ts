// import commonjs from '@rollup/plugin-commonjs'
// import json from '@rollup/plugin-json'
// import nodeResolve from '@rollup/plugin-node-resolve'
import { dirname, join } from 'path'
// import { swc } from 'rollup-plugin-swc3'
import { fileURLToPath } from 'url'
import { configDefaults } from 'vitest/config'
import { Reporter, RunnerTask, startVitest } from 'vitest/node'
import { hoistConfigPlugin } from './hoist-config.js'

class NullReporter implements Reporter {}

export const startTest = async (props: {
	dir: string
	filters: string[]
	env?: Record<string, string>
}): Promise<TestResponse> => {
	const __dirname = dirname(fileURLToPath(import.meta.url))
	const startTime = process.hrtime.bigint()

	process.noDeprecation = true

	// Vitest sets NODE_ENV=test on the whole CLI process and never restores
	// it, which leaks test mode into subprocesses spawned after the tests,
	// like site builds where it flips the Config proxy into mock mode.
	// Bracket access on purpose: Bun.build inlines the dot access as a
	// "development" literal at bundle time, which breaks the restore.
	const nodeEnv = process.env['NODE_ENV']
	const restoreNodeEnv = () => {
		if (nodeEnv === undefined) {
			delete process.env['NODE_ENV']
		} else {
			process.env['NODE_ENV'] = nodeEnv
		}
	}

	const vitest = await startVitest(
		'test',
		props.filters,
		{
			// name: config.name,
			watch: false,
			ui: false,
			silent: true,
			dir: props.dir,
			include: ['**/*.{js,jsx,ts,tsx}'],
			exclude: ['**/_*', '**/_*/**', ...configDefaults.exclude],
			globals: true,
			reporters: [new NullReporter()],
			// isolate: false,
			// typecheck: {
			// 	enabled: true,
			// 	only: false,
			// 	exclude: ['**/_*', '**/_*/**', ...configDefaults.exclude],
			// 	include: ['**/*.{js,jsx,ts,tsx}'],
			// 	checker: 'tsc',
			// },
			// reporters: 'json',
			// typecheck: {
			// 	checker: 'tsc',
			// 	enabled: true,
			// },
			env: props.env,

			setupFiles: [
				//
				join(__dirname, 'test-global-setup.js'),
			],

			// globalSetup: [
			// 	//
			// 	join(__dirname, 'test-global-setup.js'),
			// ],

			// env: {
			// 	TZ: 'UTC',
			// },
			// typecheck: {
			// 	enabled: true,
			// 	// ignoreSourceErrors: false,
			// 	// checker: 'tsc',
			// 	// include: ['**/*.{js,jsx,ts,tsx}'],
			// 	// only: true,
			// 	// allowJs: true,
			// },
			// outputFile: {
			// 	json: './.awsless/test/output.json',
			// },
		},
		{
			logLevel: 'silent',
			plugins: [
				// Hoists top level mock.config calls above the imports,
				// like vitest does for vi.mock.
				hoistConfigPlugin(),
				// // @ts-ignore
				// commonjs({ sourceMap: true }),
				// // @ts-ignore
				// nodeResolve({ preferBuiltins: true }),
				// swc({
				// 	jsc: {
				// 		// baseUrl: dirname(input),
				// 		minify: { sourceMap: true },
				// 	},
				// 	sourceMaps: true,
				// }),
				// // @ts-ignore
				// json(),
			],
		}
	).finally(restoreNodeEnv)

	let skipped = 0
	let passed = 0
	let failed = 0

	const duration = startTime - process.hrtime.bigint()
	const errors: ModuleError[] = []
	const tests: TestEntry[] = []
	const modules = vitest.state.getTestModules()

	// console.log(vitest.

	for (const module of modules) {
		for (const test of module.children.allTests()) {
			const result = test.result()

			// console.log(result)

			switch (result.state) {
				case 'pending':
					break
				case 'skipped':
					skipped++
					break
				case 'passed':
					passed++
					break
				case 'failed':
					failed++
					break
			}

			const entry: TestEntry = {
				file: test.module.relativeModuleId,
				name: test.name,
				logs: [],
				errors: [],
			}

			tests.push(entry)

			if ('task' in test) {
				const task: RunnerTask = test.task as RunnerTask
				for (const log of task.logs ?? []) {
					entry.logs.push({
						time: log.time,
						text: log.content,
					})
				}
			}

			for (const error of result.errors ?? []) {
				const stack = error.stacks?.[0]
				entry.errors.push({
					location: stack ? { line: stack.line, column: stack.column } : test.location,
					message: error.message,
					diff: error.diff,
					type: error.name,
				})
			}
		}

		for (const error of module.errors()) {
			const stack = error.stacks?.[0]
			errors.push({
				type: error.name,
				message: error.message,
				location: stack ? { line: stack.line, column: stack.column } : undefined,
			})
		}
	}

	await vitest.close()

	return {
		tests,
		errors,
		passed,
		failed,
		skipped,
		duration,
	}
}

export type ModuleError = {
	location?: {
		line: number
		column: number
	}
	type?: string
	message: string
}

export type TestError = {
	location?: {
		line: number
		column: number
	}
	diff?: string
	type?: string
	message: string
}

export type TestLog = {
	time: number
	text: string
}

export type TestEntry = {
	file: string
	name: string
	errors: TestError[]
	logs: TestLog[]
}

export type TestResponse = {
	passed: number
	failed: number
	skipped: number
	duration: bigint
	errors: ModuleError[]
	tests: TestEntry[]
	// logs: string[]
}

// type StoredState = {
// 	fingerprint: string
// 	duration: number
// 	errors: TestError[]
// 	passed: number
// 	failed: number
// 	logs: string[]
// }
