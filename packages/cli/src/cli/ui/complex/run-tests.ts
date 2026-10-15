import { createHash } from 'crypto'
import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { availableParallelism } from 'os'
import { join, relative, sep } from 'path'
import { inspect } from 'util'
import { log } from '@awsless/clui'
import { parse, stringify } from '@awsless/json'
import { generateFileHash, generateFolderHash, loadWorkspace } from '@awsless/ts-file-cache'
import type { TestManifest } from 'awsless'
import wildstring from 'wildstring'
import { TestCase } from '../../../app.js'
import { AppConfig } from '../../../config/app.js'
import { ModuleError, startProjectsTest, TestEntry, TestError, TestResponse } from '../../../test/start.js'
import { directories, fileExist } from '../../../util/path.js'
import { debug } from '../../debug.js'
import { color, icon } from '../style.js'

type StoredState = {
	fingerprint: string
} & TestResponse

const formatDuration = (duration: bigint) => {
	const ms = Number(duration / 1_000_000n)

	return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

// Evals pass on a share of their cases, since model answers vary between runs.
type Score = Pick<TestResponse, 'passed' | 'failed'>

const isPassing = (event: Score, threshold = 1) => {
	const total = event.passed + event.failed

	return event.failed === 0 || (total > 0 && event.passed / total >= threshold)
}

const formatResult = (props: {
	label: string
	stack: string
	cached: boolean
	event: TestResponse
	threshold?: number
	// The stack wide score the threshold applies to.
	score?: Score
}) => {
	const line: string[] = [`${props.label} ${color.info(props.stack)}`, color.dim(icon.arrow.right)]
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

	line.push(stats.join(color.line.dim(` ${icon.dot} `)))

	const score = props.score ?? props.event

	if (typeof props.threshold === 'number' && score.failed > 0) {
		const rate = Math.floor((score.passed / (score.passed + score.failed)) * 100)
		const text = `(${rate}% passed, needs ${Math.round(props.threshold * 100)}%)`

		line.push(isPassing(score, props.threshold) ? color.dim(text) : color.error(text))
	}

	// Results cached by older versions carry a bogus duration.
	if (props.event.duration > 0n) {
		line.push(color.dim(`(${formatDuration(props.event.duration)})`))
	}

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
			color.dim(test.name),
			[`\n\n`, errorMessage, ...(error.diff ? ['\n\n', error.diff] : [])].join(''),
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
		} catch {}
	}

	if (error.cause) {
		// Inspect never throws & renders circulars, unlike JSON.stringify.
		extra.push(`cause: ${inspect(error.cause)}`)
	}

	return [error.message, syscall && `(${syscall})`, ...extra, '\n', error.stack ?? '(no stack captured)']
		.filter(Boolean)
		.join(' ')
}

// Mirrors the vitest include/exclude rules: any js/ts file counts,
// except underscore prefixed files & folders.
const countTestFiles = async (dir: string) => {
	let entries

	try {
		entries = await readdir(dir, { recursive: true, withFileTypes: true })
	} catch {
		return 0
	}

	return entries.filter(entry => {
		if (!entry.isFile() || !/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
			return false
		}

		const relativePath = relative(dir, join(entry.parentPath, entry.name))

		return relativePath.split(sep).every(segment => !segment.startsWith('_'))
	}).length
}

const readCachedResult = async (file: string, fingerprint: string) => {
	if (process.env.NO_CACHE) {
		return
	}

	const exists = await fileExist(file)

	if (!exists) {
		return
	}

	const raw = await readFile(file, { encoding: 'utf8' })
	const data = parse(raw) as StoredState

	if (data.fingerprint === fingerprint) {
		return data
	}

	return
}

// A loaded machine briefly refuses local server connections, so a
// stack that failed on nothing but system errors gets one retry.
const transient = (error: ModuleError) =>
	['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE'].includes(error.code ?? '') ||
	['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE'].some(code => error.message.includes(code))

// The env the test workers see, shared by the test & deploy commands.
export const createTestEnv = (props: {
	appConfig: AppConfig
	appId: string
	accountId: string
	manifestFile: string
}) => ({
	APP: props.appConfig.name,
	APP_ID: props.appId,
	AWS_REGION: props.appConfig.region,
	AWS_ACCOUNT_ID: props.accountId,
	AWSLESS_TEST_MANIFEST: props.manifestFile,
})

export type RunCase = TestCase & {
	env?: Record<string, string>
	threshold?: number
}

export const runTests = async (
	tests: RunCase[],
	stackFilters: string[] = [],
	testFilters: string[] = [],
	opts: {
		showLogs: boolean
		// Evals call real models, so their results never cache & a slow
		// answer gets more time than a unit test.
		kind?: 'test' | 'eval'
		env?: Record<string, string>
		manifest?: TestManifest
		// Boots the shared resource servers, called before the first
		// uncached stack runs - a fully cached run skips them.
		ensureReady?: () => Promise<void>
	}
) => {
	const kind = opts.kind ?? 'test'
	const label = kind === 'eval' ? 'Eval' : 'Test'
	const noun = kind === 'eval' ? 'evals' : 'tests'
	const done = kind === 'eval' ? 'Evaluated' : 'Tested'
	const timeout = kind === 'eval' ? 60_000 : undefined

	const workspace = await loadWorkspace(directories.root)

	// The manifest & every handler file it references join the cache
	// fingerprint: cross-stack handlers & the test config values load
	// dynamically, so the test folder hash alone misses their changes.
	let manifestFingerprint = ''

	if (opts.manifest) {
		const { servers: _servers, ...stable } = opts.manifest

		const files = [
			...stable.streams,
			...stable.functions,
			...stable.tasks,
			...stable.queues,
			...(stable.crons ?? []),
		]
			.map(entry => entry.file)
			.filter((file): file is string => typeof file === 'string')
			.toSorted()

		const hashes = await Promise.all(files.map(file => generateFileHash(workspace, file).catch(() => 'missing')))

		manifestFingerprint = createHash('sha1').update(JSON.stringify(stable)).update(hashes.join(',')).digest('hex')
	}

	await mkdir(directories.test, { recursive: true })

	type PendingTest = {
		// The vitest project name - unique even when a stack has
		// multiple test folders.
		name: string
		stack: string
		dir: string
		file: string
		files: number
		fingerprint: string
		env?: Record<string, string>
		threshold?: number
	}

	const pending: PendingTest[] = []

	const selected = tests.filter(test => {
		if (stackFilters && stackFilters.length > 0) {
			return stackFilters.some(f => wildstring.match(f, test.stackName))
		}

		return true
	})

	// The folder hashes only read files, so every stack hashes at once.
	const fingerprints = new Map(
		await Promise.all(
			selected.flatMap(test =>
				test.paths.map(async dir => {
					const fingerprint = (await generateFolderHash(workspace, dir)) + manifestFingerprint

					return [dir, fingerprint] as const
				})
			)
		)
	)

	for (const test of selected) {
		for (const [index, dir] of test.paths.entries()) {
			// A declared test folder without any test files passes like it
			// always did - the zero-test guard below is for runs where
			// collection silently broke, not for empty folders.
			const files = await countTestFiles(dir)

			if (files === 0) {
				continue
			}

			// A stack with several test folders needs a result file per folder.
			const name = test.paths.length > 1 ? `${test.name}:${index}` : test.name
			const file = join(directories.test, `${name.replace(':', '-')}.json`)
			const fingerprint = fingerprints.get(dir)!
			const cached = kind === 'test' ? await readCachedResult(file, fingerprint) : undefined

			if (cached) {
				log.step(formatResult({ label, stack: test.name, cached: true, event: cached }))

				if (opts.showLogs) {
					logTestLogs(cached)
				}

				logTestErrors(cached)

				if (cached.failed > 0) {
					return false
				}

				continue
			}

			pending.push({
				name,
				stack: test.name,
				dir,
				file,
				files,
				fingerprint,
				threshold: test.threshold,
				env: {
					...opts.env,
					...test.env,
					STACK: test.stackName,
				},
			})
		}
	}

	if (pending.length === 0) {
		return true
	}
	await opts.ensureReady?.()

	// The main process mostly waits during the run, so the worker pool
	// gets every core.
	const workers = Math.max(1, Number(process.env.AWSLESS_TEST_CONCURRENCY) || availableParallelism())

	let results!: Map<string, TestResponse>

	// A threshold covers every folder of the stack, so the folder
	// layout never changes whether a stack passes.
	const scoreOf = (stack: string): Score => {
		const score = { passed: 0, failed: 0 }

		for (const entry of pending) {
			const result = entry.stack === stack ? results.get(entry.name) : undefined

			score.passed += result?.passed ?? 0
			score.failed += result?.failed ?? 0
		}

		return score
	}

	const passes = (entry: PendingTest, result: TestResponse) => {
		return typeof entry.threshold === 'number'
			? isPassing(scoreOf(entry.stack), entry.threshold)
			: result.failed === 0
	}

	await log.task({
		initialMessage:
			pending.length === 1
				? `Run ${noun} for the ${color.info(pending[0]!.stack)} stack`
				: `Run ${noun} for ${pending.length} stacks`,
		errorMessage: `Running ${noun} failed`,
		async task(ctx) {
			// A stack counts as done when its last test file finishes.
			// Test file filters make the expected counts unreachable, so
			// filtered runs report finished files instead.
			const expectedFiles = new Map(pending.map(entry => [entry.name, entry.files]))
			const finishedFiles = new Map<string, number>()
			const finishedStacks = new Set<string>()

			const run = (entries: PendingTest[]) => {
				return startProjectsTest({
					projects: entries.map(entry => ({ name: entry.name, dir: entry.dir, env: entry.env, timeout })),
					filters: testFilters,
					workers,
					onFileFinished(project) {
						const count = (finishedFiles.get(project) ?? 0) + 1

						finishedFiles.set(project, count)

						if (count >= (expectedFiles.get(project) ?? Infinity)) {
							finishedStacks.add(project)
						}

						const progress =
							testFilters.length > 0
								? `${[...finishedFiles.values()].reduce((sum, value) => sum + value, 0)} files done`
								: `${finishedStacks.size}/${pending.length} stacks done`

						ctx.updateMessage(`Run ${noun} for ${pending.length} stacks ${color.dim(`(${progress})`)}`)
					},
				})
			}

			results = await run(pending)

			const retries = pending.filter(entry => {
				const result = results.get(entry.name)

				return result && result.errors.length > 0 && result.errors.every(transient)
			})

			if (retries.length > 0) {
				for (const entry of retries) {
					for (const error of results.get(entry.name)!.errors) {
						debug(
							`Transient module error in ${entry.stack} tests, retrying once: ${formatModuleError(error)}`
						)
					}
				}

				await new Promise(resolve => setTimeout(resolve, 1000))

				const retried = await run(retries)

				for (const [name, result] of retried) {
					results.set(name, result)
				}
			}

			const failed = pending.filter(entry => {
				const result = results.get(entry.name)

				return !result || result.errors.length > 0 || !passes(entry, result)
			}).length

			ctx.updateSuccessMessage(
				failed === 0
					? `${done} ${pending.length} ${pending.length === 1 ? 'stack' : 'stacks'}`
					: `${done} ${pending.length} ${pending.length === 1 ? 'stack' : 'stacks'} ${color.error(`(${failed} failed)`)}`
			)
		},
	})

	let passed = true

	for (const entry of pending) {
		const result = results.get(entry.name)

		if (!result) {
			passed = false
			continue
		}

		if (result.errors.length > 0) {
			passed = false

			// A bare "ECONNREFUSED" is unfindable, so the type stays on
			// the terminal & the full stack goes to the debug log.
			for (const error of result.errors) {
				debug(`Module error in ${entry.stack} tests: ${formatModuleError(error)}`)

				log.error(
					[
						color.error.inverse.bold(` FAIL `),
						color.dim(icon.arrow.right),
						color.info(entry.stack),
						color.dim(icon.arrow.right),
						error.type && error.type !== 'Error' ? `${error.type}: ${error.message}` : error.message,
					].join(' ')
				)
			}

			continue
		}

		// A registered test folder that produced zero tests means the run
		// silently broke, not that the stack passed - unless the user
		// filtered the tests down themselves.
		if (result.tests.length === 0 && testFilters.length === 0) {
			passed = false

			log.error(
				[
					color.error.inverse.bold(` FAIL `),
					color.dim(icon.arrow.right),
					color.info(entry.stack),
					color.dim(icon.arrow.right),
					`No ${noun} ran for this stack.`,
				].join(' ')
			)

			continue
		}

		log.step(
			formatResult({
				label,
				stack: entry.stack,
				cached: false,
				event: result,
				threshold: entry.threshold,
				score: scoreOf(entry.stack),
			})
		)

		if (opts.showLogs) {
			logTestLogs(result)
		}

		logTestErrors(result)

		if (!passes(entry, result)) {
			passed = false
		}

		if (kind === 'eval') {
			continue
		}

		await writeFile(
			entry.file,
			stringify({
				...result,
				fingerprint: entry.fingerprint,
			})
		)
	}

	return passed
}
