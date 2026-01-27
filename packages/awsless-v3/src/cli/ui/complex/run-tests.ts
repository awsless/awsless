import { log } from '@awsless/clui'
import chalk from 'chalk'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import hrtime from 'pretty-hrtime'
import wildstring from 'wildstring'
import { TestCase } from '../../../app.js'
import { fingerprintFromDirectory } from '../../../build/__fingerprint.js'
import { CustomReporter, FinishedEvent, TestError } from '../../../test/reporter.js'
import { startTest } from '../../../test/start.js'
import { directories, fileExist } from '../../../util/path.js'
import { color, icon } from '../style.js'
import { task, wrap } from '../util.js'

type StoredState = {
	fingerprint: string
	duration: number
	errors: TestError[]
	passed: number
	failed: number
	logs: string[]
}

// const formatFileName = (path?: string) => {
// 	if (!path) {
// 		return ''
// 	}

// 	const abs = join(process.cwd(), path)
// 	const rel = relative(dir, abs)
// 	const ext = extname(rel)

// 	if (!ext) {
// 		return path
// 	}

// 	const name = basename(rel, ext)
// 	const base = dirname(rel)
// 	const start = base === '.' ? '' : style.placeholder(base + '/')

// 	return `${start}${name}${style.placeholder(ext)}`
// }

const formatResult = (props: { stack: string; cached: boolean; event: FinishedEvent }) => {
	const line: string[] = [`Test ${chalk.magenta(props.stack)}`]

	if (props.cached) {
		line.push(color.warning(`(from cache)`))
	}

	if (props.event.passed > 0) {
		line.push(color.success(`${props.event.passed} passed`))
	}

	if (props.event.failed > 0) {
		line.push(color.error(`${props.event.failed} failed`))
	}

	if (props.event.duration > 0) {
		// const [time, unit] = hrtime(props.event.duration, {}).split(' ')
		// return color.attr(time) + color.attr.dim(unit)
		// line.push(color.success(`${props.event.duration}`))
	}

	return line.join(` `)
}

const logTestLogs = (event: FinishedEvent) => {
	if (event.logs.length > 0) {
		log.message(color.info.bold.inverse(' LOGS '), color.dim(icon.dot))
		log.message(event.logs.map(log => wrap(log, { hard: true })).join('\n'))
	}
}

const formatFileName = (error: TestError) => {
	const name = [error.file]

	// console.log(error)

	const loc = error.location

	if (loc) {
		if (typeof loc.line === 'number') {
			name.push(`:${loc.line}`)

			if (typeof loc.column === 'number') {
				name.push(`:${loc.column}`)
			}
		}
	}

	return name.join('')
}

const logTestErrors = (event: FinishedEvent) => {
	event.errors.forEach((error, i) => {
		const [message, ...comment] = error.message.split('//')
		const errorMessage = [
			color.error.bold(error.type + ':'),
			message,
			comment.length > 0 ? color.dim(`//${comment}`) : '',
		].join(' ')

		log.error(
			[
				//
				color.error.inverse.bold(` FAIL `),
				color.dim(`(${i + 1}/${event.errors.length})`),
				color.dim(icon.arrow.right),
				formatFileName(error),
				color.dim(icon.arrow.right),
				// `\n${color.label.inverse.bold(` TEST `)}`,
				color.dim(error.test),
				[`\n\n`, errorMessage, ...(error.diff ? ['\n\n', error.diff] : [])].join(''),
				// error.test,
			].join(' ')
		)
	})
}

export const runTest = async (
	stack: string,
	dir: string,
	filters: string[],
	opts: {
		showLogs: boolean
	}
) => {
	await mkdir(directories.test, { recursive: true })

	const file = join(directories.test, `${stack}.json`)
	const fingerprint = await fingerprintFromDirectory(dir)

	if (!process.env.NO_CACHE) {
		const exists = await fileExist(file)

		if (exists) {
			const raw = await readFile(file, { encoding: 'utf8' })
			const data = JSON.parse(raw) as StoredState

			if (data.fingerprint === fingerprint) {
				log.step(
					formatResult({
						stack,
						cached: true,
						event: data,
					})
				)

				if (opts.showLogs) {
					logTestLogs(data)
				}

				logTestErrors(data)

				return data.failed === 0
			}
		}
	}

	const reporter = new CustomReporter()

	const result = await task(`Run tests for ${stack} stack`, async update => {
		let result: FinishedEvent

		reporter.on('update', ({ tasks }) => {
			update(
				[
					//
					stack,
					icon.arrow.right,
					tasks.at(-1)?.name,
					// tasks.map(t => t.name).join(` ${icon.arrow.right} `),
				].join(' ')
			)
		})

		reporter.on('finished', event => {
			result = event

			update(formatResult({ event, stack, cached: false }))
		})

		await startTest({
			reporter,
			dir,
			filters,
		})

		return result!
	})

	if (opts.showLogs) {
		logTestLogs(result)
	}

	logTestErrors(result)

	await writeFile(
		file,
		JSON.stringify({
			...result,
			fingerprint,
		})
	)

	return result.errors.length === 0
}

export const runTests = async (
	tests: TestCase[],
	stackFilters: string[] = [],
	testFilters: string[] = [],
	opts: {
		showLogs: boolean
	}
) => {
	for (const test of tests) {
		if (stackFilters && stackFilters.length > 0) {
			const found = stackFilters.find(f => wildstring.match(f, test.stackName))

			if (!found) {
				continue
			}
		}

		for (const path of test.paths) {
			const result = await runTest(test.name, path, testFilters, opts)

			if (!result) {
				return false
			}
		}
	}

	return true
}
