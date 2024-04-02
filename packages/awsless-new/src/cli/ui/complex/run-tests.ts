import { configDefaults } from 'vitest/config'
import { Vitest, startVitest } from 'vitest/node'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import { swc } from 'rollup-plugin-swc3'
import { Reporter } from 'vitest'
import { getSuites, getTests } from '@vitest/runner/utils'
import { color, icon } from '../style.js'
import { Task } from 'vitest'
// import { createTimer } from '../../../util/timer.js'
import { basename, dirname, extname, join, relative } from 'path'
import { UserConsoleLog } from 'vitest'
// import { fingerprintFromDirectory } from '../../../util/fingerprint.js'
import { directories, fileExist } from '../../../util/path.js'
import { mkdir, readFile, writeFile } from 'fs/promises'
import json from '@rollup/plugin-json'
import { TestCase } from '../../../app.js'
import { createTimer } from '../../../util/timer.js'
import { fingerprintFromDirectory } from '../../../build/fingerprint.js'
import { task } from '../util.js'
import { CustomReporter, FinishedEvent, TestError } from '../../../test/reporter.js'
import { startTest } from '../../../test/start.js'
import { log, note } from '@clack/prompts'
// import { debug } from '../../logger.js'

type StoredState = {
	fingerprint: string
	duration: string
	errors: TestError[]
	passed: number
	failed: number
	logs: string[]
}

// const fileExist = (file:string) => {

// }

export const runTest = async (stack: string, dir: string, filters: string[]) => {
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

	// const formatLogs = (logs: string[], width: number) => {
	// 	const length = logs.length

	// 	if (length === 0) {
	// 		return []
	// 	}

	// 	const header = ` Logs ${length} `
	// 	const lineSize = (width - 2) / 2 - header.length / 2

	// 	return [
	// 		'  ',
	// 		style.info(symbol.line.repeat(lineSize)),
	// 		style.info.inverse.bold(header),
	// 		style.info(symbol.line.repeat(lineSize + (header.length % 2 ? 0 : 1))),
	// 		br(),
	// 		br(),

	// 		...logs
	// 			.map(log => {
	// 				return [
	// 					textWrap([style.info(`${symbol.dot} `), log].join(''), width, {
	// 						skipFirstLine: true,
	// 						indent: 2,
	// 					}),
	// 					br(),
	// 					br(),
	// 				]
	// 			})
	// 			.flat(),
	// 	]
	// }

	// const formatErrors = (errors: TestError[], width: number) => {
	// 	const length = errors.length

	// 	if (length === 0) {
	// 		return []
	// 	}

	// 	const header = ` Failed Tests ${length} `
	// 	const lineSize = (width - 2) / 2 - header.length / 2

	// 	return [
	// 		'  ',
	// 		style.error(symbol.line.repeat(lineSize)),
	// 		style.error.inverse.bold(header),
	// 		style.error(symbol.line.repeat(lineSize + (header.length % 2 ? 0 : 1))),
	// 		br(),
	// 		...errors
	// 			.map((error, i) => {
	// 				const [message, ...comment] = error.message.split('//')
	// 				const errorMessage = [
	// 					style.error.bold(error.type + ':'),
	// 					' ',
	// 					message,
	// 					comment.length > 0 ? style.placeholder(`//${comment}`) : '',
	// 					br(),
	// 				].join('')
	// 				const pagination = `[${i + 1}/${length}]${symbol.line}`
	// 				const name = error.test ? [' ', style.placeholder(symbol.pointerSmall), ' ', error.test] : []

	// 				return [
	// 					br(),
	// 					style.error(`${symbol.error} `),
	// 					style.error.inverse.bold(` FAIL `),
	// 					' ',
	// 					style.placeholder(symbol.pointerSmall),
	// 					' ',
	// 					formatFileName(error.file),
	// 					...name,
	// 					br(),
	// 					br(),
	// 					textWrap(errorMessage, width, { indent: 2 }),
	// 					...(error.diff ? [br(), error.diff, br()] : []),
	// 					br(),
	// 					'  ',
	// 					style.error.dim(symbol.line.repeat(width - 2 - pagination.length) + pagination),
	// 					br(),
	// 				]
	// 			})
	// 			.flat(),
	// 	]
	// }

	// const formatOutput = ({
	// 	passed,
	// 	failed,
	// 	width,
	// 	logs,
	// 	errors,
	// 	duration,
	// 	cached,
	// }: StoredState & { width: number; cached?: boolean }) => {
	// 	const icon = failed > 0 ? style.error(symbol.error) : style.success(symbol.success)
	// 	const values: string[] = [icon, ' ', style.label(stack), cached ? style.warning(' (from cache)') : '']

	// 	if (passed > 0) {
	// 		values.push(' ', style.placeholder(symbol.pointerSmall), style.success(` ${passed} passed`))
	// 	}

	// 	if (failed > 0) {
	// 		values.push(' ', style.placeholder(symbol.pointerSmall), style.error(` ${failed} failed`))
	// 	}

	// 	return [
	// 		...values,
	// 		' ',
	// 		style.placeholder(symbol.pointerSmall),
	// 		' ',
	// 		duration,
	// 		br(),
	// 		...formatLogs(logs, width),
	// 		...formatErrors(errors, width),
	// 	]
	// }

	// const timer = createTimer()

	// await task(`Running tests for ${stack} stack`, () => {

	// })

	await mkdir(directories.test, { recursive: true })

	const fingerprint = await fingerprintFromDirectory(dir)
	const file = join(directories.test, `${stack}.json`)
	const exists = await fileExist(file)

	// const line = new Signal<Array<string | Signal<string>>>([])

	// term.out.write(line)

	if (exists && !process.env.NO_CACHE) {
		const raw = await readFile(file, { encoding: 'utf8' })
		const data = JSON.parse(raw) as StoredState
		if (data.fingerprint === fingerprint) {
			// line.set(formatOutput({ ...data, width: term.out.width(), duration: timer(), cached: true }))
			// formatOutput({ ...data, width: term.out.width(), duration: timer(), cached: true })
			return data.failed === 0
		}
	}

	const reporter = new CustomReporter()

	const result = await task(`Run tests for ${stack} stack`, async update => {
		let result: FinishedEvent

		reporter.on('update', ({ tasks }) => {
			// console.log(tasks.map(t => t.name))
			update(
				[
					//
					stack,
					icon.arrow.right,
					tasks.map(t => t.name).join(` ${icon.arrow.right} `),
				].join(' ')
			)
		})

		reporter.on('finished', event => {
			result = event
			// console.log(passed, failed, logs)
			// console.log(errors, passed, failed, logs)
			// ✓ affiliate-campaign (from cache) › 13 passed › 5.41ms

			const line: string[] = [stack]

			if (event.passed > 0) {
				line.push(color.success(`${event.passed} passed`))
			}

			if (event.failed > 0) {
				line.push(color.error(`${event.failed} failed`))
			}

			update(line.join(` ${color.dim(icon.dot)} `))

			// note(logs.map(log => log).join('\n'), 'Logs')

			// textWrap([style.info(`${symbol.dot} `), log].join(''), width, {
			// 	skipFirstLine: true,
			// 	indent: 2,
			// }),

			// 	const icon = failed > 0 ? style.error(symbol.error) : style.success(symbol.success)
			// 	const values: string[] = [icon, ' ', style.label(stack), cached ? style.warning(' (from cache)') : '']
		})

		await startTest({
			reporter,
			dir,
			filters,
		})

		return result!

		// return result?.state.getCountOfFailedTests() === 0
	})

	note(result.logs.map(log => color.info(log)).join('\n'), 'Logs')

	// const length = result.errors

	result.errors
		.map((error, i) => {
			const [message, ...comment] = error.message.split('//')
			const errorMessage = [
				color.error.bold(error.type + ':'),
				' ',
				message,
				comment.length > 0 ? color.dim(`//${comment}`) : '',
				'\n',
			].join('')

			const pagination = `[${i + 1}/${result.errors.length}]`

			// const pagination = `[${i + 1}/${length}]${icon.line}`
			// const name = error.test ? [' ', style.placeholder(symbol.pointerSmall), ' ', error.test] : []

			log.message(
				[
					//
					color.error.inverse.bold(` FAIL `),
					color.dim(icon.arrow.right),
					error.file,
					'\n',
					errorMessage,
					// error.test,
				].join(' '),
				{ symbol: color.error(icon.error) }
			)

			return [
				'\n',
				color.error(`${icon.error} `),
				color.error.inverse.bold(` FAIL `),
				' ',
				color.dim(icon.arrow.right),
				' ',
				error.file,
				// formatFileName(error.file),
				// ...name,
				'\n',
				'\n',
				// br(),
				// br(),
				errorMessage,
				// textWrap(errorMessage, width, { indent: 2 }),
				...(error.diff ? ['\n', error.diff, '\n'] : []),
				'\n',
				'  ',
				// color.error.dim(symbol.line.repeat(width - 2 - pagination.length) + pagination),
				'\n',
			].join('')
		})
		.join('\n')

	// note(
	// 	result.errors
	// 		.map((error, i) => {
	// 			const [message, ...comment] = error.message.split('//')
	// 			const errorMessage = [
	// 				color.error.bold(error.type + ':'),
	// 				' ',
	// 				message,
	// 				comment.length > 0 ? color.dim(`//${comment}`) : '',
	// 				'\n',
	// 			].join('')
	// 			const pagination = `[${i + 1}/${result.errors.length}]`
	// 			// const pagination = `[${i + 1}/${length}]${icon.line}`
	// 			// const name = error.test ? [' ', style.placeholder(symbol.pointerSmall), ' ', error.test] : []

	// 			return [
	// 				'\n',
	// 				color.error(`${icon.error} `),
	// 				color.error.inverse.bold(` FAIL `),
	// 				' ',
	// 				color.dim(icon.arrow.right),
	// 				' ',
	// 				error.file,
	// 				// formatFileName(error.file),
	// 				// ...name,
	// 				'\n',
	// 				'\n',
	// 				// br(),
	// 				// br(),
	// 				errorMessage,
	// 				// textWrap(errorMessage, width, { indent: 2 }),
	// 				...(error.diff ? ['\n', error.diff, '\n'] : []),
	// 				'\n',
	// 				'  ',
	// 				// color.error.dim(symbol.line.repeat(width - 2 - pagination.length) + pagination),
	// 				'\n',
	// 			].join('')
	// 		})
	// 		.join('\n'),
	// 	`Failed Tests ${result.errors.length}`
	// )

	// const formatErrors = (errors: TestError[], width: number) => {
	// 	const length = errors.length

	// 	if (length === 0) {
	// 		return []
	// 	}

	// 	const header = ` Failed Tests ${length} `
	// 	const lineSize = (width - 2) / 2 - header.length / 2

	// 	return [
	// 		'  ',
	// 		style.error(symbol.line.repeat(lineSize)),
	// 		style.error.inverse.bold(header),
	// 		style.error(symbol.line.repeat(lineSize + (header.length % 2 ? 0 : 1))),
	// 		br(),
	// 		...errors
	// 			.map((error, i) => {
	// 				const [message, ...comment] = error.message.split('//')
	// 				const errorMessage = [
	// 					style.error.bold(error.type + ':'),
	// 					' ',
	// 					message,
	// 					comment.length > 0 ? style.placeholder(`//${comment}`) : '',
	// 					br(),
	// 				].join('')
	// 				const pagination = `[${i + 1}/${length}]${symbol.line}`
	// 				const name = error.test ? [' ', style.placeholder(symbol.pointerSmall), ' ', error.test] : []

	// 				return [
	// 					br(),
	// 					style.error(`${symbol.error} `),
	// 					style.error.inverse.bold(` FAIL `),
	// 					' ',
	// 					style.placeholder(symbol.pointerSmall),
	// 					' ',
	// 					formatFileName(error.file),
	// 					...name,
	// 					br(),
	// 					br(),
	// 					textWrap(errorMessage, width, { indent: 2 }),
	// 					...(error.diff ? [br(), error.diff, br()] : []),
	// 					br(),
	// 					'  ',
	// 					style.error.dim(symbol.line.repeat(width - 2 - pagination.length) + pagination),
	// 					br(),
	// 				]
	// 			})
	// 			.flat(),
	// 	]
	// }

	// let data: StoredState

	// reporter.on('finished', ({ errors, passed, failed, logs }) => {
	// 	stop()

	// 	const duration = timer()
	// 	const width = term.out.width()

	// 	data = { fingerprint, errors, passed, failed, logs, duration }
	// 	line.set(formatOutput({ ...data, width }))
	// })

	// const result = await startTest({
	// 	reporter,
	// 	dir,
	// 	filters,
	// })

	// await writeFile(file, JSON.stringify(data!))

	// return result?.state.getCountOfFailedTests() === 0

	// return true
}

export const runTests = async (tests: TestCase[], filters: string[] = []) => {
	for (const test of tests) {
		for (const path of test.paths) {
			const result = await runTest(test.name, path, filters)

			if (!result) {
				return false
			}
		}
	}

	return true
}
