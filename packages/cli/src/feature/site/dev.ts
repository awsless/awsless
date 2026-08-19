import { ChildProcess, spawn } from 'child_process'
import { delimiter, dirname, isAbsolute, join, normalize, relative } from 'path'
import { log } from '@awsless/clui'
import { glob } from 'glob'
import { findFreePort, stopChild, stripAnsi } from '../../dev/util.js'
import { DevContext } from '../../feature.js'
import { directories } from '../../util/path.js'
import { formatRouteKey } from '../bundle/util.js'
import { planStaticRoutes } from './static-routes.js'

// A pooled site dev server: the child survives dev restarts & every
// run rebinds the dashboard sink to its own event bus.
type SiteDevServer = {
	port: number
	tail: string[]
	child: ChildProcess
	sink: {
		emit: (data: { date: number; line: string }) => void
		health?: (status: 'up' | 'down', detail?: string) => void
		stopping: boolean
	}
}

// The dev & build commands resolve binaries like npm scripts do: every
// ancestor node_modules/.bin joins the PATH, so "vite" just works.
export const binPath = (from: string) => {
	const paths: string[] = []
	let dir = from

	while (true) {
		paths.push(join(dir, 'node_modules', '.bin'))
		const parent = dirname(dir)

		if (parent === dir) {
			break
		}

		dir = parent
	}

	paths.push(process.env.PATH ?? '')

	return paths.join(delimiter)
}

// Local sites mirror the deployed router exactly: the ssr handler runs
// inside the bundle behind the same catch-all route, and the static
// assets get the same route store keys, served by a tiny local file
// server instead of the asset bucket.
//
// A site with a dev command instead runs your own dev server (like
// vite) behind the local router, so the frontend & every api route
// share one origin - hmr websockets included.
export const siteOnDev = async (ctx: DevContext) => {
	for (const stackConfig of ctx.stackConfigs) {
		for (const [id, props] of Object.entries(stackConfig.sites ?? {})) {
			const routerId = props.router
			const pattern = props.path.endsWith('/') ? `${props.path}*` : `${props.path}/*`

			if (props.dev) {
				const key = `site-dev:${stackConfig.name}:${id}`
				const existing = ctx.peek<SiteDevServer>(key)
				const port = props.dev.port ?? existing?.port ?? (await findFreePort())
				const command = props.dev.command.replaceAll('$PORT', String(port))
				const channel = `site:${stackConfig.name}:${id}`

				// The dev server survives restarts, so the claim happens
				// here & the boot (which needs the full env) in start.
				ctx.retain(key)

				// "localhost" instead of 127.0.0.1, since dev servers like
				// vite may bind the ipv6 loopback only.
				ctx.addRoute({
					routerId,
					pattern,
					proxy: `http://localhost:${port}`,
				})

				ctx.registerServer({
					name: `site ${id} dev`,
					async start({ env }) {
						// The env is part of the fingerprint: a config restart
						// that adds a queue, config or endpoint must reboot the
						// child, or it keeps running with stale variables.
						const value = await ctx.keep<SiteDevServer>(key, { command, port, env }, async () => {
							const [bin, ...args] = command.split(' ')
							const cwd = join(directories.root, dirname(stackConfig.file))

							// The dashboard sink swaps every run, since each
							// run builds a fresh event bus.
							const sink: SiteDevServer['sink'] = {
								emit: () => {},
								stopping: false,
							}

							// The command runs with the full local environment,
							// like "awsless bind --local". Its output stays out
							// of the cli log: every line streams to the
							// dashboard panel & the last lines only surface in
							// the terminal when the dev server dies.
							const child = spawn(bin!, args, {
								cwd,
								stdio: ['ignore', 'pipe', 'pipe'],
								env: { ...process.env, ...env, PORT: String(port), PATH: binPath(cwd) },
							})

							const tail: string[] = []
							const capture = (chunk: Buffer) => {
								for (const raw of chunk.toString().split('\n')) {
									const line = stripAnsi(raw)

									if (line.trim() === '') {
										continue
									}

									tail.push(line)
									sink.emit({ date: Date.now(), line })
								}

								while (tail.length > 20) {
									tail.shift()
								}
							}

							child.stdout?.on('data', capture)
							child.stderr?.on('data', capture)

							child.on('exit', (code, signal) => {
								if (sink.stopping) {
									return
								}

								// A signal exit (code null) is usually the
								// terminal group SIGINT of a ctrl-c - only a
								// real non-zero exit logs as a crash. The
								// health chip goes down either way: the
								// server is gone.
								if (code !== null && code !== 0) {
									log.error(
										`The site "${id}" dev server exited with code ${code}:\n${tail.join('\n')}`
									)
									sink.emit({ date: Date.now(), line: `Exited with code ${code}` })
								}

								sink.health?.(
									'down',
									code !== null ? `exited with code ${code}` : `killed by ${signal}`
								)
							})

							return {
								value: { port, tail, sink, child },
								stop: async () => {
									sink.stopping = true
									await stopChild(child)
								},
							}
						})

						// Rebind the dashboard feed & replay the recent
						// output into the fresh event bus.
						value.sink.emit = data => ctx.emitEvent(channel, data)
						value.sink.health = (status, detail) => ctx.reportHealth(`site ${id}`, status, detail)
						value.sink.stopping = false

						// The pooled child may have crashed while no run was
						// listening - report its real state, not just changes.
						value.sink.health(value.child.exitCode === null ? 'up' : 'down')

						for (const line of value.tail) {
							ctx.emitEvent(channel, { date: Date.now(), line })
						}
					},
				})

				ctx.registerResource({
					kind: 'site',
					id,
					stack: stackConfig.name,
					detail: `http://localhost:${ctx.routerPort(routerId)}${props.path === '/' ? '' : props.path}`,
					channel,
				})

				continue
			}

			if (props.ssr) {
				ctx.addRoute({
					routerId,
					pattern,
					routeKey: formatRouteKey(stackConfig.name, 'site', id),
				})
			}

			if (typeof props.static === 'string') {
				const staticDir = props.static

				// Serve the static files the same way the asset bucket
				// does, bound eagerly so the actual port is known.
				const server = Bun.serve({
					port: 0,
					hostname: '127.0.0.1',
					async fetch(request) {
						const pathname = decodeURIComponent(new URL(request.url).pathname)
						const path = normalize(join(staticDir, pathname))

						// Path-relative containment instead of a string prefix:
						// /site-secret passes a bare startsWith('/site') even
						// though it escapes the static folder.
						const rel = relative(normalize(staticDir), path)

						if (rel.startsWith('..') || isAbsolute(rel)) {
							return new Response('Forbidden', { status: 403 })
						}

						const file = Bun.file(path)

						if (await file.exists()) {
							return new Response(file)
						}

						return new Response('Not found', { status: 404 })
					},
				})

				ctx.registerServer({
					name: `site ${id}`,
					async start() {},
					async stop() {
						await server.stop(true)
					},
				})

				const proxy = `http://127.0.0.1:${server.port}`
				const files = glob.sync('**', { cwd: staticDir, nodir: true }).sort()
				const plan = planStaticRoutes(files, props.path)

				// Exact file routes rewrite straight to their file, like
				// the deployed s3 origin rewrites.
				for (const [routeFileKey, file] of Object.entries(plan.files)) {
					ctx.addRoute({
						routerId,
						pattern: routeFileKey,
						rawKey: true,
						proxy,
						rewrite: { regex: '^.*$', to: `/${file}` },
					})
				}

				const pathPattern = props.path === '/' ? '' : props.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
				const assetRewrite = { regex: `^${pathPattern}/?(.*)$`, to: '/$1' }

				for (const routeDirKey of plan.dirs) {
					ctx.addRoute({ routerId, pattern: routeDirKey, rawKey: true, proxy, rewrite: assetRewrite })
				}

				if (plan.catchAll) {
					ctx.addRoute({ routerId, pattern: plan.catchAll, rawKey: true, proxy, rewrite: assetRewrite })
				}
			}

			ctx.registerResource({
				kind: 'site',
				id,
				stack: stackConfig.name,
				routeKey: props.ssr ? formatRouteKey(stackConfig.name, 'site', id) : undefined,
				detail: `http://localhost:${ctx.routerPort(routerId)}${props.path === '/' ? '' : props.path}`,
			})
		}
	}
}
