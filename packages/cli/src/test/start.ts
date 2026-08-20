import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { configDefaults } from 'vitest/config'
import { Reporter, RunnerTask, startVitest } from 'vitest/node'
import { hoistConfigPlugin } from './hoist-config.js'

export type ProjectTest = {
	name: string
	dir: string
	env?: Record<string, string>
}

export const startProjectsTest = async (props: {
	projects: ProjectTest[]
	filters: string[]
	workers?: number
	onFileFinished?: () => void
}): Promise<Map<string, TestResponse>> => {
	const __dirname = dirname(fileURLToPath(import.meta.url))
	const startTime = process.hrtime.bigint()

	process.noDeprecation = true

	// Vitest sets NODE_ENV=test on the whole CLI process and never restores
	// it, which leaks test mode into subprocesses spawned after the tests,
	// like site builds where it flips the Config proxy into mock mode.
	// Bracket access on purpose: Bun.build inlines the dot access as a
	// "development" literal at bundle time, which breaks the restore.
	const nodeEnv = process.env['NODE_ENV']
	const timezone = process.env['TZ']

	// Dates must behave identically everywhere, and a runtime TZ change
	// inside a bun worker thread is ignored - so the workers inherit
	// UTC from this process at spawn instead.
	process.env['TZ'] = 'UTC'

	const restoreNodeEnv = () => {
		if (nodeEnv === undefined) {
			delete process.env['NODE_ENV']
		} else {
			process.env['NODE_ENV'] = nodeEnv
		}

		if (timezone === undefined) {
			delete process.env['TZ']
		} else {
			process.env['TZ'] = timezone
		}
	}

	const progressReporter: Reporter = {
		onTestModuleEnd() {
			props.onFileFinished?.()
		},
	}

	// Surfaces the raw vitest output for debugging the runner itself.
	const debug = process.env.AWSLESS_TEST_DEBUG === '1'

	// Every stack becomes a project in one instance, so the startup
	// cost is paid once instead of per stack.
	const vitest = await startVitest(
		'test',
		props.filters,
		{
			watch: false,
			ui: false,
			silent: !debug,
			reporters: debug ? ['default'] : [progressReporter],
			maxWorkers: props.workers,
			pool: (process.env.AWSLESS_TEST_POOL as 'forks' | 'threads' | undefined) ?? 'forks',

			projects: props.projects.map(project => ({
				// Project configs don't inherit the root vite plugins.
				plugins: [
					// Hoists top level mock.config calls above the imports,
					// like vitest does for vi.mock.
					hoistConfigPlugin(),
				],
				test: {
					name: project.name,
					dir: project.dir,
					include: ['**/*.{js,jsx,ts,tsx}'],
					exclude: ['**/_*', '**/_*/**', ...configDefaults.exclude],
					globals: true,
					env: project.env,
					setupFiles: [join(__dirname, 'test-global-setup.js')],
				},
			})),
		},
		{
			logLevel: debug ? 'info' : 'silent',
		}
	).finally(restoreNodeEnv)

	const duration = startTime - process.hrtime.bigint()
	const responses = new Map<string, TestResponse>()

	for (const project of props.projects) {
		responses.set(project.name, {
			tests: [],
			errors: [],
			passed: 0,
			failed: 0,
			skipped: 0,
			duration,
		})
	}

	for (const module of vitest.state.getTestModules()) {
		const response = responses.get(module.project.name)

		if (!response) {
			continue
		}

		for (const test of module.children.allTests()) {
			const result = test.result()

			switch (result.state) {
				case 'pending':
					break
				case 'skipped':
					response.skipped++
					break
				case 'passed':
					response.passed++
					break
				case 'failed':
					response.failed++
					break
			}

			const entry: TestEntry = {
				file: test.module.relativeModuleId,
				name: test.name,
				logs: [],
				errors: [],
			}

			response.tests.push(entry)

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
					stack: error.stack,
				})
			}
		}

		for (const error of module.errors()) {
			const stack = error.stacks?.[0]
			// Vitest serializes own enumerable props, so system error
			// details survive when present.
			const { code, syscall, address, port } = error as {
				code?: string
				syscall?: string
				address?: string
				port?: number
			}
			// Bun's system errors hide their details in non-standard spots,
			// so keep every leftover own prop & the cause chain verbatim.
			const {
				name: _n,
				message: _m,
				stack: _s,
				stacks: _ss,
				diff: _d,
				cause,
				...rest
			} = error as Record<string, unknown>

			response.errors.push({
				type: error.name,
				message: error.message,
				location: stack ? { line: stack.line, column: stack.column } : undefined,
				stack: error.stack,
				code,
				syscall,
				address,
				port,
				cause,
				props: Object.keys(rest).length > 0 ? rest : undefined,
			})
		}
	}

	await vitest.close()

	return responses
}

export type ModuleError = {
	location?: {
		line: number
		column: number
	}
	type?: string
	message: string
	stack?: string
	// System error details, when the module error wraps one - a bare
	// "ECONNREFUSED" is undiagnosable without the refused address.
	code?: string
	syscall?: string
	address?: string
	port?: number
	cause?: unknown
	props?: Record<string, unknown>
}

export type TestError = {
	location?: {
		line: number
		column: number
	}
	diff?: string
	type?: string
	message: string
	stack?: string
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
}
