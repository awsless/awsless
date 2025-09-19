import { getSuites, getTests } from '@vitest/runner/utils'
import { parseStacktrace } from '@vitest/utils/source-map'
import { Reporter, Task, UserConsoleLog } from 'vitest'
import { Vitest } from 'vitest/node'

export type TestError = {
	location: {
		line?: number
		column?: number
	}
	file: string
	test?: string
	diff?: string
	type?: string
	message: string
}

export type FinishedEvent = {
	errors: TestError[]
	passed: number
	failed: number
	logs: string[]
}

export class CustomReporter implements Reporter {
	private interval?: NodeJS.Timeout
	private tasks?: Task[]
	private ctx?: Vitest
	private logs: string[] = []
	private events: Record<string, undefined | ((event?: unknown) => void)> = {}
	private cache?: string

	on(event: 'start', cb: () => void): void
	on(event: 'update', cb: (event: { tasks: Task[] }) => void): void
	on(event: 'finished', cb: (event: FinishedEvent) => void): void
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

		// debug('DEBUG', this.ctx)

		// console.log(this.tasks![0].tasks![0].tasks!)

		const suites = getSuites(this.tasks!)
		const tests = getTests(this.tasks!)
		// const tasks = [...suites, ...tests]
		const passed = tests.filter(t => t.result?.state === 'pass').length
		const failed = tests.filter(t => t.result?.state === 'fail').length

		const errors: TestError[] = [...suites, ...tests]
			.map(test => {
				if (!test.result?.errors || test.result.errors.length === 0) {
					return []
				}

				const item = test.type === 'suite' ? test : test.file

				// console.log(test.result.errors)
				// console.log(test)

				return test.result.errors.map(error => {
					const traces = error.stackStr ? parseStacktrace(error.stackStr) : []

					return {
						location: {
							line: traces[0]?.line ?? item.location?.line,
							column: traces[0]?.column ?? item.location?.column,
						},
						file: item.name,
						test: test.type === 'test' ? test.name : undefined,
						diff: error.showDiff && error.diff ? error.diff : undefined,
						type: error.name,
						message: error.message,
					}
				})
			})
			.flat()

		this.events.finished?.({ errors, passed, failed, logs: this.logs })
	}

	update() {
		const tasks = this.runningTasks(this.tasks!)

		if (tasks.length === 0) {
			return
		}

		const cache = JSON.stringify(tasks.map(t => t.id))

		if (this.cache !== cache) {
			this.events.update?.({ tasks })
			this.cache = cache
		}
	}

	onUserConsoleLog(log: UserConsoleLog) {
		// if (log.taskId) {
		// 	const test = this.ctx?.state.idMap.get(log.taskId)
		// 	if (test) {
		// 		test.name
		// 	}
		// }

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
