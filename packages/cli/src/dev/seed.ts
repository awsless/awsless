import { spawn } from 'child_process'
import { isAbsolute, join } from 'path'
import { debug } from '../cli/debug.js'
import { directories } from '../util/path.js'

// The app wide seed file runs with the full local environment, so it
// uses the app's real code against the local servers - table streams
// fire exactly like handler writes. One file instead of per-stack
// seeds, so the seeding order is explicit instead of depending on the
// stack load order.
export const createSeedRunner = (props: { seed?: string; env: Record<string, string> }) => {
	const file = props.seed && (isAbsolute(props.seed) ? props.seed : join(directories.root, props.seed))

	let running: Promise<void> | undefined

	const run = () => {
		// A reseed while a seed is running joins the running one.
		running ??= (async () => {
			try {
				if (!file) {
					return
				}

				debug(`Seeding from ${props.seed}`)

				await new Promise<void>((resolve, reject) => {
					const child = spawn('bun', [file], {
						cwd: directories.root,
						stdio: ['ignore', 'pipe', 'pipe'],
						env: { ...process.env, ...props.env },
					})

					const output: string[] = []

					const capture = (chunk: Buffer) => {
						output.push(chunk.toString())
					}

					child.stdout?.on('data', capture)
					child.stderr?.on('data', capture)

					child.on('error', reject)
					child.on('exit', code => {
						const logs = output.join('').trim()

						if (logs) {
							debug(logs)
						}

						if (code === 0) {
							resolve()
						} else {
							reject(new Error(`The seed exited with code ${code}:\n${logs}`))
						}
					})
				})
			} finally {
				running = undefined
			}
		})()

		return running
	}

	return { count: file ? 1 : 0, run }
}
