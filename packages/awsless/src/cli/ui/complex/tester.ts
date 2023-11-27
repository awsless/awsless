import { configDefaults } from 'vitest/config'
import { Vitest, startVitest } from 'vitest/node'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import { swc } from 'rollup-plugin-swc3'
import { Reporter } from 'vitest'
import { br } from '../ui/../layout/basic.js'
import { Signal } from '../../lib/signal.js'
import { createSpinner } from '../../ui/layout/spinner.js'
import { getTests } from '@vitest/runner/utils'
import { style, symbol } from '../../style.js'
import { Task } from 'vitest'
import { createTimer } from '../../../util/timer.js'
import { basename, extname, join, relative } from 'path'
import { UserConsoleLog } from 'vitest'
import { RenderFactory } from '../../lib/renderer.js'
import { textWrap } from '../layout/text-box.js'
import { fingerprintFromDirectory } from '../../../util/fingerprint.js'
import { directories, fileExist } from '../../../util/path.js'
import { mkdir, readFile, writeFile } from 'fs/promises'
import json from '@rollup/plugin-json'

type TestError = {
	file: string
	test: string
	diff?: string
	type: string
	message: string
}

type StoredState = {
	fingerprint: string
	duration: string
	errors: TestError[]
	passed: number
	failed: number
	logs: string[]
}

class CustomReporter implements Reporter {
	private interval?: NodeJS.Timer
	private tasks?: Task[]
	private ctx?: Vitest
	private logs: string[] = []
	private events: Record<string, undefined | ((event?: unknown) => void)> = {}

	on(event: 'start', cb: () => void): void
	on(event: 'update', cb: (event: { tasks: Task[] }) => void): void
	on(
		event: 'finished',
		cb: (event: { errors: TestError[]; passed: number; failed: number; logs: string[] }) => void
	): void
	on(event: string, cb: (event?: any) => void) {
		this.events[event] = cb
	}

	onInit(ctx: Vitest) {
		this.ctx = ctx
	}

	onCollected() {
		this.tasks = this.ctx?.state.getFiles()

		if (!this.interval) {
			this.interval = setInterval(this.update.bind(this), 33)
			this.update()
			this.events.start?.()
		}
	}

	onFinished() {
		clearInterval(this.interval)
		this.interval = undefined

		const tests = getTests(this.tasks!)
		const passed = tests.filter(t => t.result?.state === 'pass').length
		const failed = tests.filter(t => t.result?.state === 'fail').length
		const errors = tests
			.map(test => {
				if (!test.result?.errors || test.result.errors.length === 0) {
					return []
				}

				return test.result.errors.map(error => ({
					file: test.file?.name,
					test: test.name,
					diff: error.showDiff && error.diff ? error.diff : undefined,
					type: error.name,
					message: error.message,
				}))
			})
			.flat()

		this.events.finished?.({ errors, passed, failed, logs: this.logs })
	}

	update() {
		const tasks = this.runningTasks(this.tasks!)
		this.events.update?.({ tasks })
	}

	onUserConsoleLog(log: UserConsoleLog) {
		if (log.taskId) {
			const test = this.ctx?.state.idMap.get(log.taskId)
			if (test) {
				test.name
			}
		}

		this.logs.push(log.content.trimEnd())
	}

	runningTask(tasks: Task[]) {
		return tasks.find(t => t.result?.state === 'run')
	}

	runningTasks(tasks: Task[]): Task[] {
		const task = this.runningTask(tasks)

		if (!task) {
			return []
		}

		if (task.type === 'suite') {
			return [task, ...this.runningTasks(task.tasks)]
		}

		return [task]
	}
}

// const fileExist = (file:string) => {

// }

export const singleTester = (stack: string, dir: string): RenderFactory<Promise<boolean>> => {
	const formatFileName = (path?: string) => {
		if (!path) {
			return ''
		}

		path = join(process.cwd(), path)
		path = relative(dir, path)

		const ext = extname(path)
		const bas = basename(path, ext)

		return `${bas}${style.placeholder(ext)}`
	}

	const formatLogs = (logs: string[], width: number) => {
		return logs
			.map(log => {
				return [
					textWrap([style.placeholder(`${symbol.dot} LOG `), log].join(''), width, {
						skipFirstLine: true,
						indent: 2,
					}),
					br(),
				]
			})
			.flat()
	}

	const formatErrors = (errors: TestError[], width: number) => {
		return errors
			.map(error => {
				const [message, ...comment] = error.message.split('//')
				const errorMessage = [
					style.error(`${style.error.bold(error.type)}: ${message}`),
					comment.length > 0 ? style.placeholder(`//${comment}`) : '',
					br(),
				].join('')

				return [
					br(),
					style.error(`${symbol.dot} `),
					style.error.inverse(` FAIL `),
					' ',
					style.placeholder(symbol.pointerSmall),
					' ',
					formatFileName(error.file),
					' ',
					style.placeholder(symbol.pointerSmall),
					' ',
					error.test,
					br(),
					textWrap(errorMessage, width, { indent: 2 }),
					...(error.diff ? [br(), error.diff, br()] : []),
				]
			})
			.flat()
	}

	const formatOutput = ({
		passed,
		failed,
		width,
		logs,
		errors,
		duration,
		cached,
	}: StoredState & { width: number; cached?: boolean }) => {
		const icon = failed > 0 ? style.error(symbol.error) : style.success(symbol.success)
		const values: string[] = [icon, ' ', style.label(stack), cached ? style.warning(' (from cache)') : '']

		if (passed > 0) {
			values.push(' ', style.placeholder(symbol.pointerSmall), style.success(` ${passed} passed`))
		}

		if (failed > 0) {
			values.push(' ', style.placeholder(symbol.pointerSmall), style.error(` ${failed} failed`))
		}

		return [
			...values,
			' ',
			style.placeholder(symbol.pointerSmall),
			' ',
			duration,
			br(),
			...formatLogs(logs, width),
			...formatErrors(errors, width),
		]
	}

	return async term => {
		const timer = createTimer()

		await mkdir(directories.test, { recursive: true })

		const fingerprint = await fingerprintFromDirectory(dir)
		const file = join(directories.test, `${stack}.json`)
		const exists = await fileExist(file)
		const line = new Signal<Array<string | Signal<string>>>([])

		term.out.write(line)

		if (exists && !process.env.NO_CACHE) {
			const raw = await readFile(file, { encoding: 'utf8' })
			const data = JSON.parse(raw) as StoredState
			if (data.fingerprint === fingerprint) {
				line.set(formatOutput({ ...data, width: term.out.width(), duration: timer(), cached: true }))
				return data.failed === 0
			}
		}

		const [icon, stop] = createSpinner()

		const reporter = new CustomReporter()
		line.set([icon, ' ', style.label(stack)])

		reporter.on('update', ({ tasks }) => {
			line.set([
				icon,
				' ',
				style.label(stack),
				...tasks
					.map((task, i) => [
						' ',
						style.placeholder(symbol.pointerSmall),
						' ',
						i === 0 ? formatFileName(task.name) : style.placeholder(task.name),
					])
					.flat(),
				' ',
				style.placeholder(symbol.pointerSmall),
				' ',
				timer(),
				br(),
			])
		})

		let data: StoredState

		reporter.on('finished', ({ errors, passed, failed, logs }) => {
			stop()

			const duration = timer()
			const width = term.out.width()

			data = { fingerprint, errors, passed, failed, logs, duration }
			line.set(formatOutput({ ...data, width }))
		})

		const result = await startVitest(
			'test',
			[],
			{
				// name: config.name,
				watch: false,
				ui: false,
				silent: true,
				dir,
				include: ['**/*.{js,jsx,ts,tsx}'],
				exclude: ['**/_*', '**/_*/**', ...configDefaults.exclude],
				globals: true,
				reporters: reporter,
				// outputFile: {
				// 	json: './.awsless/test/output.json',
				// },
			},
			{
				plugins: [
					// @ts-ignore
					commonjs({ sourceMap: true }),
					// @ts-ignore
					nodeResolve({ preferBuiltins: true }),
					swc({
						jsc: {
							// baseUrl: dirname(input),
							minify: { sourceMap: true },
						},
						sourceMaps: true,
					}),
					// @ts-ignore
					json(),
				],
			}
		)

		await writeFile(file, JSON.stringify(data!))

		return result?.state.getCountOfFailedTests() === 0
	}
}

export const runTester = (tests: Map<string, string[]>): RenderFactory<Promise<boolean>> => {
	return async term => {
		for (const [name, paths] of tests.entries()) {
			for (const path of paths) {
				const result = await term.out.write(singleTester(name, path))

				if (!result) {
					return false
				}
			}
		}

		return true
	}
}
