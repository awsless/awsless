import { log } from '@clack/prompts'
import chalk from 'chalk'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { TestCase } from '../../../app.js'
import { fingerprintFromDirectory } from '../../../build/__fingerprint.js'
import { CustomReporter, FinishedEvent, TestError } from '../../../test/reporter.js'
import { startTest } from '../../../test/start.js'
import { directories, fileExist } from '../../../util/path.js'
import { color, icon } from '../style.js'
import { task, wrap } from '../util.js'

type StoredState = {
	fingerprint: string
	// duration: string
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

	return line.join(` `)
}

const logTestLogs = (event: FinishedEvent) => {
	if (event.logs.length > 0) {
		log.message(color.info.bold.inverse(' LOGS '), {
			symbol: color.dim(icon.dot),
		})
		log.message(event.logs.map(log => wrap(log, { hard: true })).join('\n'))
	}
}

const logTestErrors = (event: FinishedEvent) => {
	event.errors.forEach((error, i) => {
		const [message, ...comment] = error.message.split('//')
		const errorMessage = [
			color.error.bold(error.type + ':'),
			message,
			comment.length > 0 ? color.dim(`//${comment}`) : '',
		].join(' ')

		log.message(
			[
				//
				color.error.inverse.bold(` FAIL `),
				color.dim(`(${i + 1}/${event.errors.length})`),
				color.dim(icon.arrow.right),
				error.file,
				color.dim(icon.arrow.right),
				error.test,
				[
					`\n\n`,
					wrap(errorMessage, {
						hard: true,
					}),
					...(error.diff ? ['\n\n', error.diff] : []),
				].join(''),
				// error.test,
			].join(' '),
			{ symbol: color.error(icon.error) }
		)
	})
}

export const runTest = async (stack: string, dir: string, filters: string[]) => {
	await mkdir(directories.test, { recursive: true })

	const fingerprint = await fingerprintFromDirectory(dir)
	const file = join(directories.test, `${stack}.json`)
	const exists = await fileExist(file)

	if (exists && !process.env.NO_CACHE) {
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
			logTestLogs(data)
			logTestErrors(data)

			return data.failed === 0
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

	logTestLogs(result)
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

export const runTests = async (tests: TestCase[], stackFilters: string[] = [], testFilters: string[] = []) => {
	for (const test of tests) {
		if (stackFilters && stackFilters.length > 0) {
			if (!stackFilters.includes(test.stackName)) {
				continue
			}
		}

		for (const path of test.paths) {
			const result = await runTest(test.name, path, testFilters)

			if (!result) {
				return false
			}
		}
	}

	return true
}
