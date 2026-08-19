import { ChildProcess } from 'child_process'
import { dirname, join } from 'path'
import { log } from '@awsless/clui'
import { constantCase } from 'change-case'
import deepmerge from 'deepmerge'
import { spawnDevChild } from '../../dev/children.js'
import { findFreePort, stopChild, stripAnsi } from '../../dev/util.js'
import { DevContext } from '../../feature.js'
import { formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { binPath } from '../site/dev.js'

// A local instance runs its code as a long lived bun child, like the
// deployed fargate task runs the compiled program. The instance queue
// lives in the shared sqs shim as a pull queue, so the program polls
// its messages exactly like in production, and Instance.stack.name()
// sends into it through the same INSTANCE_*_URL env var.
//
// The health server port comes in through PORT, since a fixed port 80
// can't host multiple local instances - instance code should bind
// process.env.PORT ?? 80.
export const instanceOnDev = async (ctx: DevContext) => {
	const instances = ctx.stackConfigs.flatMap(stackConfig => {
		return Object.entries(stackConfig.instances ?? {}).map(([id, props]) => ({ stackConfig, id, props }))
	})

	if (instances.length === 0) {
		return
	}

	const { port, queues } = await ctx.useSqs()

	for (const { stackConfig, id, props } of instances) {
		const name = formatLocalResourceName({
			appName: ctx.appConfig.name,
			stackName: stackConfig.name,
			resourceType: 'instance',
			resourceName: id,
		})

		queues.set(name, undefined)

		const queueUrl = `http://127.0.0.1:${port}/000000000000/${name}`

		ctx.addEnv(`INSTANCE_${constantCase(stackConfig.name)}_${constantCase(id)}_URL`, queueUrl)

		const channel = `instance:${stackConfig.name}:${id}`
		const healthPort = await findFreePort()
		const merged = deepmerge(ctx.appConfig.instance ?? {}, props) as typeof props
		const file = merged.code.file
		const cwd = join(directories.root, dirname(stackConfig.file))

		let child: ChildProcess | undefined
		let stopping = false
		let restarting = false

		// The boot only exists once the server started with the full local
		// env, while the dashboard restart action registers now.
		let boot: (() => void) | undefined

		const restart = async (reason: string) => {
			if (!boot || restarting) {
				return
			}

			restarting = true
			ctx.emitEvent(channel, { date: Date.now(), line: reason })

			try {
				if (child) {
					stopping = true
					await stopChild(child)
					stopping = false
				}

				boot()
			} finally {
				restarting = false
			}
		}

		ctx.registerServer({
			name: `instance ${id}`,
			async start({ env }) {
				const tail: string[] = []

				boot = () => {
					ctx.reportHealth(`instance ${id}`, 'up')

					// The program runs on bun straight from source, like the
					// deployed executable that bun compiled. It sees the full
					// local environment plus its production only vars.
					child = spawnDevChild('bun', [file], {
						cwd,
						stdio: ['ignore', 'pipe', 'pipe'],
						env: {
							...process.env,
							...env,
							...merged.environment,
							STACK: stackConfig.name,
							PORT: String(healthPort),
							PATH: binPath(cwd),
						},
					})

					// The output stays out of the cli log: every line streams
					// to the dashboard panel & the last lines only surface in
					// the terminal when the instance dies.
					const capture = (chunk: Buffer) => {
						for (const raw of chunk.toString().split('\n')) {
							const line = stripAnsi(raw)

							if (line.trim() === '') {
								continue
							}

							tail.push(line)
							ctx.emitEvent(channel, { date: Date.now(), line })
						}

						while (tail.length > 20) {
							tail.shift()
						}
					}

					child.stdout?.on('data', capture)
					child.stderr?.on('data', capture)

					child.on('exit', (code, signal) => {
						if (stopping) {
							return
						}

						// A signal exit (code null) is usually the terminal
						// group SIGINT of a ctrl-c - only a real non-zero
						// exit logs as a crash. The health chip goes down
						// either way: the program is gone.
						if (code !== null && code !== 0) {
							log.error(`The instance "${id}" exited with code ${code}:\n${tail.join('\n')}`)
							ctx.emitEvent(channel, { date: Date.now(), line: `Exited with code ${code}`, error: true })
						}

						ctx.reportHealth(
							`instance ${id}`,
							'down',
							code !== null ? `exited with code ${code}` : `killed by ${signal}`
						)
					})
				}

				boot()
			},
			async stop() {
				stopping = true

				if (child) {
					await stopChild(child)
				}
			},
		})

		ctx.registerResource({
			kind: 'instance',
			stack: stackConfig.name,
			id,
			detail: `http://localhost:${healthPort}`,
			queueUrl,
			channel,
			restart: () => restart('Restarting...'),
		})
	}
}
