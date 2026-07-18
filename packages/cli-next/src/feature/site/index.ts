import { Group } from '@terraforge/core'
import { constantCase } from 'change-case'
import { createHash } from 'crypto'
import { glob } from 'glob'
import { basename, dirname, join } from 'path'
import { defineFeature } from '../../feature.js'
import { SiteDeployment } from '../../formation/s3.js'
import { getCredentials } from '../../util/aws.js'
import { generateCacheKey } from '../../util/cache.js'
import { formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { formatRouteKey, registerBundleFunction, ROUTE_HEADER } from '../bundle/util.js'
import { Route } from '../router/route.js'
import { getFeatureFolder } from '../store/index.js'

export const siteFeature = defineFeature({
	name: 'site',
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.sites ?? {})) {
			const group = new Group(ctx.stack, 'site', id)

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'site',
				resourceName: id,
			})

			const addRoutes = ctx.shared.entry('router', 'addRoutes', props.router)
			const routeKey = props.path.endsWith('/') ? `${props.path}*` : `${props.path}/*`

			// ------------------------------------------------------------
			// Build your site

			if (props.build) {
				const buildProps = props.build
				ctx.registerBuild('site', name, async build => {
					const fingerprint = await generateCacheKey(buildProps.cacheKey)

					return build(fingerprint, async write => {
						const credentialProvider = await getCredentials(ctx.appConfig.profile)
						const credentials = await credentialProvider()

						const cwd = join(directories.root, dirname(ctx.stackConfig.file))
						const env: Record<string, string | undefined> = {
							...process.env,

							// Pass the app config name
							APP: ctx.appConfig.name,

							// Basic AWS info
							AWS_REGION: ctx.appConfig.region,
							AWS_ACCOUNT_ID: ctx.accountId,

							// Give AWS access
							AWS_ACCESS_KEY_ID: credentials.accessKeyId,
							AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
							AWS_SESSION_TOKEN: credentials.sessionToken,
						}

						// Add the config values for just the site.

						for (const name of props.build?.configs ?? []) {
							env[`CONFIG_${constantCase(name)}`] = name
						}

						for (const name of ctx.stackConfig.configs ?? []) {
							env[`CONFIG_${constantCase(name)}`] = name
						}

						const instance = Bun.spawn(buildProps.command.split(' '), {
							cwd,
							env,
							stdout: 'pipe',
							stderr: 'pipe',
							// stdout: 'ignore',
							// stderr: ''
							// stdout: 'inherit',
							// stderr: 'inherit',
						})

						await instance.exited

						if (instance.exitCode !== null && instance.exitCode > 0) {
							// const error = instance.stderr
							// throw new ExpectedError(await instance.stderr?.text() ?? '')

							// console.log('')
							// console.log(await instance.stderr.text())
							// // console.log('')
							// // console.log(await instance.stdout.text())
							// console.log('')
							throw new Error('Site build failed')
						}

						// await execCommand({
						// 	cwd,
						// 	command: buildProps.command,
						// 	env,
						// })

						await write('HASH', fingerprint)

						return {
							size: 'n/a',
						}
					})
				})
			}

			// ------------------------------------------------------------
			// Server Side Rendering

			if (props.ssr) {
				const ssr = props.ssr
				const bundleRouteKey = formatRouteKey(ctx.stack.name, 'site', id)

				registerBundleFunction(ctx, bundleRouteKey, ssr)

				addRoutes({
					[routeKey]: {
						type: 'lambda',
						forwardHost: true,
						urlEncodedQueryString: true,

						// The custom route header tells the bundle which site to render.
						requestHeaders: {
							[ROUTE_HEADER]: bundleRouteKey,
						},
					},
				})
			}

			// ------------------------------------------------------------
			// Static Assets

			if (props.static) {
				const bucket = ctx.shared.get('store', 'bucket')
				const folder = getFeatureFolder('site', ctx.stack.name, id)

				// ------------------------------------------------------------
				// Get all static files

				ctx.onReady(() => {
					if (typeof props.static === 'string') {
						const staticDir = props.static
						const files = glob
							.sync('**', {
								cwd: staticDir,
								nodir: true,
							})
							.sort()
						const hashes = files.map(file => $hash(join(staticDir, file)))
						const version = $combine(...hashes).pipe(hashes => {
							const hash = createHash('sha1')

							for (const [index, file] of files.entries()) {
								hash.update(file)
								hash.update(hashes[index]!)
							}

							return hash.digest('hex')
						})
						const deployment = new SiteDeployment(group, 'deployment', {
							bucket: bucket.name,
							prefix: folder,
							source: staticDir,
							version,
						})

						const staticRoutes: Record<string, Route> = {}

						// html pages and extensionless files get their own exact route;
						// every other file is covered by the single asset route below
						for (const file of files) {
							if (file.endsWith('.html')) {
								const strippedHtmlFile = file.endsWith('index.html')
									? file.slice(0, -11)
									: file.slice(0, -5)

								const urlFriendlyFile = strippedHtmlFile.endsWith('/')
									? strippedHtmlFile.slice(0, -1)
									: strippedHtmlFile

								const routeFileKey = join(props.path, urlFriendlyFile)

								staticRoutes[routeFileKey] = {
									type: 's3',
									domainName: bucket.regionalDomainName,
									rewrite: { to: $interpolate`/${folder}v-${deployment.version}/${file}` },
								}
							} else if (!basename(file).includes('.')) {
								staticRoutes[join(props.path, file)] = {
									type: 's3',
									domainName: bucket.regionalDomainName,
									rewrite: { to: $interpolate`/${folder}v-${deployment.version}/${file}` },
								}
							}
						}

						// one route serves every asset of this site version
						const pathPattern =
							props.path === '/' ? '' : props.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

						staticRoutes[join(props.path, '*.')] = {
							type: 's3',
							domainName: bucket.regionalDomainName,
							rewrite: {
								regex: `^${pathPattern}/?(.*)$`,
								to: $interpolate`/${folder}v-${deployment.version}/$1`,
							},
						}

						addRoutes(staticRoutes, { dependsOn: [deployment, bucket.policy] })
					}
				})
			}
		}
	},
})
