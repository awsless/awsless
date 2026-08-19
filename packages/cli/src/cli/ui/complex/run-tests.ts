import { createHash } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { inspect } from 'util'
import { log } from '@awsless/clui'
// import { fingerprintFromDirectory } from '../../../build/__fingerprint.js'
// import { CustomReporter, FinishedEvent, TestError } from '../../../test/reporter.js'
import { parse, stringify } from '@awsless/json'
import { generateFileHash, generateFolderHash, loadWorkspace, Workspace } from '@awsless/ts-file-cache'
import type { TestManifest } from 'awsless'
// import hrtime from 'pretty-hrtime'
import wildstring from 'wildstring'
import { TestCase } from '../../../app.js'
import { ExpectedError } from '../../../error.js'
import { ModuleError, startTest, TestEntry, TestError, TestResponse } from '../../../test/start.js'
import { directories, fileExist } from '../../../util/path.js'
import { debug } from '../../debug.js'
import { color, icon } from '../style.js'
// import { task, wrap } from '../util.js'

type StoredState = {
	fingerprint: string
	// duration: number
	// errors: TestError[]
	// passed: number
	// failed: number
	// logs: string[]
} & TestResponse

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

const formatResult = (props: { stack: string; cached: boolean; event: TestResponse }) => {
	const line: string[] = [`Test ${color.info(props.stack)}`, color.dim(icon.arrow.right)]
	const stats: string[] = []

	if (props.cached) {
		line.push(color.warning(`(from cache)`))
	}

	if (props.event.passed > 0) {
		stats.push(color.success(`${props.event.passed} passed`))
	}

	if (props.event.skipped > 0) {
		stats.push(color.warning(`${props.event.skipped} skipped`))
	}

	if (props.event.failed > 0) {
		stats.push(color.error(`${props.event.failed} failed`))
	}

	if (props.event.duration > 0n) {
		// const [time, unit] = hrtime(props.event.duration, {}).split(' ')
		// return color.attr(time) + color.attr.dim(unit)
		// line.push(color.success(`${props.event.duration}`))
	}

	line.push(stats.join(color.line.dim(` ${icon.dot} `)))

	return line.join(` `)
}

const logTestLogs = (event: TestResponse) => {
	for (const test of event.tests) {
		if (test.logs.length > 0) {
			log.message(
				[
					color.info.bold.inverse(' LOGS '),
					color.dim(icon.arrow.right),
					formatFileName(test),
					color.dim(icon.arrow.right),
					color.dim(test.name),
				].join(' '),
				color.line(icon.dot)
			)
			log.message(test.logs.map(log => log.text).join('\n'))
		}
	}
}

const formatFileName = (test: TestEntry, error?: TestError) => {
	const name = [test.file]

	// console.log(error)

	const loc = error?.location

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

const logTestError = (index: number, event: TestResponse, test: TestEntry, error: TestError) => {
	if (error.stack) {
		debug(`Test error in ${test.file} › ${test.name}: ${error.message}\n${error.stack}`)
	}

	const [message, ...comment] = error.message.split('//')
	const errorMessage = [
		color.error.bold(error.type + ':'),
		message,
		comment.length > 0 ? color.dim(`//${comment.join('//')}`) : '',
	].join(' ')

	log.error(
		[
			//
			color.error.inverse.bold(` FAIL `),
			color.dim(`(${index}/${event.errors.length + event.failed})`),
			color.dim(icon.arrow.right),
			formatFileName(test, error),
			color.dim(icon.arrow.right),
			// `\n${color.label.inverse.bold(` TEST `)}`,
			color.dim(test.name),
			[`\n\n`, errorMessage, ...(error.diff ? ['\n\n', error.diff] : [])].join(''),
			// error.test,
		].join(' ')
	)
}

const logTestErrors = (event: TestResponse) => {
	let i = 0

	for (const test of event.tests) {
		for (const error of test.errors) {
			logTestError(++i, event, test, error)
		}
	}
}

// The terminal only shows the message, so the syscall details & the
// full stack go to the debug log - that's the only place a bare
// system error like "ECONNREFUSED" gets an address to chase.
const formatModuleError = (error: ModuleError) => {
	const syscall = [error.syscall, error.address, error.port && `port ${error.port}`].filter(Boolean).join(' ')
	const extra: string[] = []

	// Bun's system errors hide their details in non-standard spots, so
	// the raw leftover props & the cause chain go along verbatim.
	if (error.props) {
		try {
			extra.push(`props: ${JSON.stringify(error.props)}`)
		} catch (_) {}
	}

	if (error.cause) {
		// Inspect never throws & renders circulars, unlike JSON.stringify.
		extra.push(`cause: ${inspect(error.cause)}`)
	}

	return [error.message, syscall && `(${syscall})`, ...extra, '\n', error.stack ?? '(no stack captured)']
		.filter(Boolean)
		.join(' ')
}

export const runTest = async (
	stack: string,
	dir: string,
	filters: string[],
	workspace: Workspace,
	opts: {
		showLogs: boolean
		env?: Record<string, string>
		// Extra fingerprint material beyond the test folder, like the
		// manifest & the handler files it loads dynamically.
		fingerprint?: string
	}
) => {
	await mkdir(directories.test, { recursive: true })

	const file = join(directories.test, `${stack}.json`)
	const fingerprint = (await generateFolderHash(workspace, dir)) + (opts.fingerprint ?? '')

	if (!process.env.NO_CACHE) {
		const exists = await fileExist(file)

		if (exists) {
			const raw = await readFile(file, { encoding: 'utf8' })
			const data = parse(raw) as StoredState

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

	const result = await log.task({
		initialMessage: `Run tests for the ${color.info(stack)} stack`,
		errorMessage: `Running tests for the ${color.info(stack)} stack failed`,
		async task(ctx) {
			// A loaded machine can refuse or time out a local resource
			// server connection for a moment, killing an arbitrary stack
			// mid-run with a bare system error. Those clear within a tick,
			// so a run that failed on nothing but system errors gets one
			// retry instead of failing the whole run.
			const transient = (error: ModuleError) =>
				['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE'].includes(error.code ?? '') ||
				['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE'].some(code => error.message.includes(code))

			let result = await startTest({
				dir,
				filters,
				env: opts.env,
			})

			if (result.errors.length > 0 && result.errors.every(transient)) {
				for (const error of result.errors) {
					debug(`Transient module error in ${stack} tests, retrying once: ${formatModuleError(error)}`)
				}

				await new Promise(resolve => setTimeout(resolve, 1000))

				result = await startTest({
					dir,
					filters,
					env: opts.env,
				})
			}

			if (result.errors.length > 0) {
				// Module errors carry no test file context, so keep the
				// error type - a bare system error message like
				// "ECONNREFUSED" is unfindable on its own. The terminal
				// only shows the message, so the full stack goes to the
				// debug log.
				for (const error of result.errors) {
					debug(`Module error in ${stack} tests: ${formatModuleError(error)}`)
				}

				throw result.errors.map(
					error =>
						new ExpectedError(
							error.type && error.type !== 'Error' ? `${error.type}: ${error.message}` : error.message
						)
				)
			}

			ctx.updateSuccessMessage(
				formatResult({
					stack,
					cached: false,
					event: result,
				})
			)

			return result
		},
	})

	if (opts.showLogs) {
		logTestLogs(result)
	}

	logTestErrors(result)

	await writeFile(
		file,
		stringify({
			...result,
			fingerprint,
		})
	)

	// console.log(result)
	// console.log(result.errors.length === 0 && result.failed === 0)

	return result.errors.length === 0 && result.failed === 0
}

export const runTests = async (
	tests: TestCase[],
	stackFilters: string[] = [],
	testFilters: string[] = [],
	opts: {
		showLogs: boolean
		env?: Record<string, string>
		manifest?: TestManifest
	}
) => {
	const workspace = await loadWorkspace(directories.root)

	// The manifest & every handler file it references join the cache
	// fingerprint: cross-stack handlers & the test config values load
	// dynamically, so the test folder hash alone misses their changes.
	let manifestFingerprint = ''

	if (opts.manifest) {
		const { servers: _servers, ...stable } = opts.manifest

		const files = [...stable.streams, ...stable.functions, ...stable.tasks, ...stable.queues]
			.map(entry => entry.file)
			.filter((file): file is string => typeof file === 'string')
			.toSorted()

		const hashes = await Promise.all(files.map(file => generateFileHash(workspace, file).catch(() => 'missing')))

		manifestFingerprint = createHash('sha1').update(JSON.stringify(stable)).update(hashes.join(',')).digest('hex')
	}

	for (const test of tests) {
		if (stackFilters && stackFilters.length > 0) {
			const found = stackFilters.find(f => wildstring.match(f, test.stackName))

			if (!found) {
				continue
			}
		}

		for (const path of test.paths) {
			const result = await runTest(test.name, path, testFilters, workspace, {
				showLogs: opts.showLogs,
				fingerprint: manifestFingerprint,
				env: {
					...opts.env,
					STACK: test.stackName,
				},
			})

			if (!result) {
				return false
			}
		}
	}

	return true
}
