import { configDefaults } from 'vitest/config'
import { Vitest, startVitest } from 'vitest/node'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import { swc } from 'rollup-plugin-swc3'
import { Reporter } from 'vitest'
import { Renderer } from '../../lib/renderer.js'
import { br } from '../ui/../layout/basic.js'
import { Signal } from '../../lib/signal.js'
import { createSpinner } from '../../ui/layout/spinner.js'
import { getTests } from '@vitest/runner/utils'
import { style, symbol } from '../../style.js'
import { Task } from 'vitest'
import { createTimer } from '../../../util/timer.js'
import { basename, extname } from 'path'
import { UserConsoleLog } from 'vitest'
import { RenderFactory } from '../../lib/renderer.js'

class CustomReporter implements Reporter {
	private started = false
	private interval?: NodeJS.Timer
	private timer?: () => string
	private tasks?: Task[]
	private ctx?: Vitest
	private line: Signal = new Signal([])
	private icon?: Signal<string>
	private logs: string[] = []
	private stopSpinner?: () => void

	constructor(private stack: string, private out: Renderer) {}

	onInit(ctx: Vitest) {
		this.ctx = ctx
	}

	onCollected() {
		this.tasks = this.ctx?.state.getFiles()

		if (!this.started) {
			this.start()
			this.started = true
		}
	}

	onFinished() {
		this.stop()
	}

	start() {
		const [icon, stop] = createSpinner()

		this.icon = icon
		this.stopSpinner = stop
		this.interval = setInterval(this.update.bind(this), 33)
		this.timer = createTimer()
		this.update()

		this.out.write(this.line)
		this.out.gap()
	}

	stop() {
		clearInterval(this.interval)
		this.interval = undefined
		this.stopSpinner?.()

		const tests = getTests(this.tasks!)
		const passed = tests.filter(t => t.result?.state === 'pass').length
		const failed = tests.filter(t => t.result?.state === 'fail').length
		const icon = failed > 0 ? style.error(symbol.error) : style.success(symbol.success)
		const values: string[] = [icon, ' ', style.label(this.stack)]

		if (passed > 0) {
			values.push(' ', style.placeholder(symbol.pointerSmall), style.success(` ${passed} passed`))
		}

		if (failed > 0) {
			values.push(' ', style.placeholder(symbol.pointerSmall), style.error(` ${failed} failed`))
		}

		this.line.set([
			...values,
			' ',
			style.placeholder(symbol.pointerSmall),
			' ',
			this.timer?.(),
			br(),
			this.formatLogs(),
			this.formatErrors(),
		])
	}

	update() {
		// const tests = getTests(this.tasks!)
		const tasks = this.runningTasks(this.tasks!)
		// const task = this.runningTask(this.tasks!)

		this.line.set([
			this.icon,
			' ',
			style.label(this.stack),
			// ' ',
			// style.placeholder(`(${tests.length})`),
			...tasks.map((task, i) => [
				' ',
				style.placeholder(symbol.pointerSmall),
				' ',
				i === 0 ? task.name : style.placeholder(task.name),
			]),
			// style.placeholder(tests.length),
			// ' ',
			// style.placeholder(symbol.pointerSmall),
			// ' ',
			' ',
			style.placeholder(symbol.pointerSmall),
			' ',
			this.timer?.(),
			br(),
			this.formatLogs(),
			// this.formatErrors(),
			// ...this.renderTask(this.tasks!),
		])
	}

	formatLogs() {
		return this.logs.map(log => {
			return [style.placeholder(`${symbol.dot} LOG `), log]
		})
	}

	formatErrors() {
		const tests = getTests(this.tasks!)
		return tests.map(test => {
			if (!test.result?.errors || test.result.errors.length === 0) {
				return []
			}

			return [
				br(),
				style.error(`${symbol.dot} `),
				style.error.inverse(` FAIL `),
				' ',
				style.placeholder(symbol.pointerSmall),
				' ',
				test.file?.name,
				' ',
				style.placeholder(`${symbol.pointerSmall} ${test.name}`),
				br(),
				test.result.errors.map(error => {
					const [message, ...comment] = error.message.split('//')
					const values: string[] = [
						'  ',
						style.error(`${style.error.bold(error.name)}: ${message}`),
						comment.length > 0 ? style.placeholder(`//${comment}`) : '',
						br(),
					]

					if (error.showDiff && error.diff) {
						values.push(br(), error.diff, br())
					}

					// values.push(error.diff, br())

					return values
				}),
			]
		})
	}

	onUserConsoleLog(log: UserConsoleLog) {
		if (log.taskId) {
			const test = this.ctx?.state.idMap.get(log.taskId)
			if (test) {
				test.name
			}
		}
		this.logs.push(log.content)
	}

	formatFileName(path: string) {
		const ext = extname(path)
		const bas = basename(path, ext)

		return `${bas}${style.placeholder(ext)}`
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

export const singleTester = (stack: string, dir?: string): RenderFactory => {
	return async term => {
		await startVitest(
			'test',
			[],
			{
				// name: config.name,
				watch: false,
				ui: false,
				silent: true,
				// dir: '',
				// dir: './test',
				dir,
				include: ['**/*.{js,jsx,ts,tsx}'],
				exclude: ['**/_*', '**/_*/**', ...configDefaults.exclude],
				globals: true,
				reporters: new CustomReporter(stack, term.out),
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
	}
}

export const runTester = (tests: Map<string, string[]>): RenderFactory => {
	return async term => {
		for (const [name, paths] of tests.entries()) {
			for (const path of paths) {
				await term.out.write(singleTester(name, path))
			}
		}
	}
}
