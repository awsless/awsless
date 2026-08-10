import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { constantCase } from 'change-case'
import { createHash } from 'crypto'
import { glob } from 'glob'
import { dirname, join } from 'path'
import { ExpectedError } from '../../error.js'
import { defineFeature } from '../../feature.js'
import { SiteDeployment } from '../../formation/s3.js'
import { getCredentials } from '../../util/aws.js'
import { generateCacheKey } from '../../util/cache.js'
import { formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { formatRouteKey, registerBundleFunction, ROUTE_HEADER } from '../bundle/util.js'
import { createLambdaFunction, isStandaloneFunction } from '../function/util.js'
import { Route } from '../router/route.js'
import { binPath, siteOnDev } from './dev.js'
import { planStaticRoutes } from './static-routes.js'
import { getFeatureFolder } from '../asset/index.js'

export const siteFeature = defineFeature({
	name: 'site',
	onDev: siteOnDev,
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

			// A site with a dev command is fully served by its own dev
			// server locally, so the local dev environment never needs its
			// build output & skips the (expensive) build entirely.
			if (props.build && !(ctx.dev && props.dev)) {
				const buildProps = props.build
				ctx.registerBuild('site', name, async build => {
					const fingerprint = await generateCacheKey(buildProps.cacheKey)

					return build(fingerprint, async write => {
						const credentialProvider = await getCredentials(ctx.appConfig.profile)
						const credentials = await credentialProvider()

						const cwd = join(directories.root, dirname(ctx.stackConfig.file))
						const env: Record<string, string | undefined> = {
							...process.env,

							// Resolve bins from every ancestor node_modules/.bin,
							// like npm scripts do.
							PATH: binPath(cwd),

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

						for (const name of ctx.appConfig.configs ?? []) {
							env[`CONFIG_${constantCase(name)}`] = name
						}

						const instance = Bun.spawn(buildProps.command.split(' '), {
							cwd,
							env,
							stdout: 'pipe',
							stderr: 'pipe',
						})

						// Read stdout & stderr while the build runs, otherwise
						// the build hangs once its output fills the pipe buffer.
						const [output, errors] = await Promise.all([
							new Response(instance.stdout).text(),
							new Response(instance.stderr).text(),
							instance.exited,
						])

						// A killed build reports a null exit code.
						if (instance.exitCode !== 0) {
							const reason = instance.signalCode ? ` (${instance.signalCode})` : ''

							throw new ExpectedError(
								`Site build failed${reason}:\n${(errors.trim() || output.trim()).slice(-2000)}`
							)
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

			if (props.ssr && ctx.dev && props.dev) {
				// The site dev server renders ssr itself locally, so the ssr
				// handler stays out of the local dev bundle - often the
				// biggest part of the bundle build.
			} else if (props.ssr && isStandaloneFunction(props.ssr) && !ctx.dev) {
				// A custom lambda config deploys the ssr as its own stand-alone
				// lambda & the router hits its function url directly, with the
				// same cloudfront signing as the shared bundle url.
				const fn = createLambdaFunction(ctx, `${id}-ssr`, props.ssr)

				// Sandboxed lambdas are cut off from the app wide binds, so
				// pass the site's own router endpoint explicitly. Routers
				// without a domain don't have an endpoint.
				if (ctx.shared.has('router', 'endpoint', props.router)) {
					fn.setEnvironment(
						`ROUTER_${constantCase(props.router)}_ENDPOINT`,
						ctx.shared.entry('router', 'endpoint', props.router)
					)
				}

				const url = new aws.lambda.FunctionUrl(group, 'ssr-url', {
					functionName: fn.lambda.functionName,
					authorizationType: 'AWS_IAM',
				})

				new aws.lambda.Permission(group, 'ssr-url-permission', {
					functionName: fn.lambda.functionName,
					statementId: 'cloudfront-url',
					principal: 'cloudfront.amazonaws.com',
					sourceAccount: ctx.accountId,
					action: 'lambda:InvokeFunctionUrl',
					functionUrlAuthType: 'AWS_IAM',
				})

				new aws.lambda.Permission(group, 'ssr-invoke-permission', {
					functionName: fn.lambda.functionName,
					statementId: 'cloudfront-invoke',
					principal: 'cloudfront.amazonaws.com',
					sourceAccount: ctx.accountId,
					action: 'lambda:InvokeFunction',
					invokedViaFunctionUrl: true,
				})

				addRoutes({
					[routeKey]: {
						type: 'lambda',
						forwardHost: true,
						urlEncodedQueryString: true,
						domainName: url.functionUrl.pipe(url => url.split('/')[2]!),
					},
				})
			} else if (props.ssr) {
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
				const bucket = ctx.shared.get('asset', 'bucket')
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
						const plan = planStaticRoutes(files, props.path)

						for (const [routeFileKey, file] of Object.entries(plan.files)) {
							staticRoutes[routeFileKey] = {
								type: 's3',
								domainName: bucket.regionalDomainName,
								rewrite: { to: $interpolate`/${folder}v-${deployment.version}/${file}` },
							}
						}

						const pathPattern = props.path === '/' ? '' : props.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
						const assetRoute: Route = {
							type: 's3',
							domainName: bucket.regionalDomainName,
							rewrite: {
								regex: `^${pathPattern}/?(.*)$`,
								to: $interpolate`/${folder}v-${deployment.version}/$1`,
							},
						}

						for (const routeDirKey of plan.dirs) {
							staticRoutes[routeDirKey] = assetRoute
						}

						if (plan.catchAll) {
							staticRoutes[plan.catchAll] = assetRoute
						}

						addRoutes(staticRoutes, { dependsOn: [deployment, bucket.policy] })
					}
				})
			}
		}
	},
})
