import { spawn } from 'child_process'
import { mkdir, writeFile } from 'fs/promises'
import { isAbsolute, join } from 'path'
import { pathToFileURL } from 'url'
import { debug } from '../cli/debug.js'
import { StackConfig } from '../config/stack.js'
import { directories } from '../util/path.js'

// The marker the runner prints before each seed module, so the parent
// can attribute output, timings & failures to the right stack.
const MARKER = '__awsless_seed__:'

// Seed files run with the full local environment, so they use the
// app's real code against the local servers - table streams fire
// exactly like handler writes. All seeds share ONE bun process: the
// import graph (awsless, the app libs) transpiles once instead of per
// seed, which dominates the cost of a fresh process per stack.
export const createSeedRunner = (props: { stackConfigs: StackConfig[]; env: Record<string, string> }) => {
	const seeds = props.stackConfigs
		.filter(stack => stack.seed)
		.map(stack => ({
			name: stack.name,
			file: isAbsolute(stack.seed!) ? stack.seed! : join(directories.root, stack.seed!),
		}))

	let running: Promise<[string, number][]> | undefined

	const run = () => {
		// A reseed while a seed is running joins the running one.
		running ??= (async () => {
			try {
				// The runner imports every seed module in stack order, so
				// seeds behave exactly like they ran one after the other.
				const runner = seeds
					.map(entry => {
						return `console.log(${JSON.stringify(MARKER + entry.name)})\nawait import(${JSON.stringify(
							pathToFileURL(entry.file).href
						)})\n`
					})
					.join('')

				const runnerDir = join(directories.output, 'local')
				const runnerFile = join(runnerDir, 'seed-runner.mjs')

				await mkdir(runnerDir, { recursive: true })
				await writeFile(runnerFile, runner)

				const timings: [string, number][] = []

				await new Promise<void>((resolve, reject) => {
					const child = spawn('bun', [runnerFile], {
						cwd: directories.root,
						stdio: ['ignore', 'pipe', 'pipe'],
						env: { ...process.env, ...props.env },
					})

					// Markers stream live, so the debug log carries a
					// timestamp per stack & failures name their stack.
					let current: string | undefined
					let started = Date.now()
					const output: string[] = []
					let buffered = ''

					const capture = (chunk: Buffer) => {
						buffered += chunk.toString()

						let index
						while ((index = buffered.indexOf('\n')) >= 0) {
							const line = buffered.slice(0, index)
							buffered = buffered.slice(index + 1)

							if (line.startsWith(MARKER)) {
								if (current) {
									timings.push([current, Date.now() - started])
								}

								current = line.slice(MARKER.length)
								started = Date.now()
								debug(`Seeding the ${current} stack`)
							} else {
								output.push(line)
							}
						}
					}

					child.stdout?.on('data', capture)
					child.stderr?.on('data', capture)

					child.on('error', reject)
					child.on('exit', code => {
						capture(Buffer.from('\n'))
						const logs = output.join('\n').trim()

						if (logs) {
							debug(logs)
						}

						if (code === 0) {
							if (current) {
								timings.push([current, Date.now() - started])
							}

							resolve()
						} else {
							reject(
								new Error(
									`The seed of the "${current ?? seeds[0]?.name}" stack exited with code ${code}:\n${logs}`
								)
							)
						}
					})
				})

				return timings
			} finally {
				running = undefined
			}
		})()

		return running
	}

	return { count: seeds.length, run }
}
