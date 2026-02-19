import { Input, Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { glob } from 'glob'
import { dirname, join } from 'path'
import { defineFeature } from '../../feature.js'
import { formatLocalResourceName } from '../../util/name.js'
import { createLambdaFunction } from '../function/util.js'
import { getCacheControl, getContentType } from './util.js'
import { constantCase } from 'change-case'
import { generateCacheKey } from '../../util/cache.js'
import { directories } from '../../util/path.js'
import { getCredentials } from '../../util/aws.js'
import { Route } from '../router/route.js'
import { ExpectedError } from '../../error.js'

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

			const routerId = ctx.shared.entry('router', 'id', props.router)
			const addInvalidation = ctx.shared.entry('router', 'addInvalidation', props.router)
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
							// stdout: 'inherit',
							// stderr: 'inherit',
						})

						await instance.exited

						if (instance.exitCode !== null && instance.exitCode > 0) {
							// const error = instance.stderr
							// throw new ExpectedError(await instance.stderr?.text() ?? '')
							console.log(instance.stderr)
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

			const versions: Array<Input<string> | Input<string | undefined>> = []

			// ------------------------------------------------------------
			// Server Side Rendering

			// let functionUrl: aws.lambda.FunctionUrl | undefined

			if (props.ssr) {
				const result = createLambdaFunction(group, ctx, `site`, id, props.ssr)

				versions.push(result.code.sourceHash)

				ctx.onBind((name, value) => {
					result.setEnvironment(name, value)
				})

				new aws.lambda.Permission(group, 'ssr-permission', {
					principal: 'cloudfront.amazonaws.com',
					action: 'lambda:InvokeFunctionUrl',
					functionName: result.lambda.functionName,
					functionUrlAuthType: 'AWS_IAM',
					sourceArn: `arn:aws:cloudfront::${ctx.accountId}:distribution/*`,
				})

				const functionUrl = new aws.lambda.FunctionUrl(group, 'url', {
					functionName: result.lambda.functionName,
					authorizationType: 'AWS_IAM',
				})

				addRoutes(group, 'ssr', {
					[routeKey]: {
						type: 'lambda',
						domainName: functionUrl.functionUrl.pipe(url => url.split('/')[2]!),
						forwardHost: true,
						urlEncodedQueryString: true,
					},
				})

				// routes[routeKey] = {
				// 	type: 'lambda',
				// 	domainName: functionUrl.functionUrl.pipe(url => url.split('/')[2]!),
				// 	forwardHost: true,
				// 	urlEncodedQueryString: true,
				// }
			}

			// ------------------------------------------------------------
			// Static Assets

			if (props.static) {
				const bucket = new aws.s3.Bucket(group, 'bucket', {
					bucket: formatLocalResourceName({
						appName: ctx.app.name,
						stackName: ctx.stack.name,
						resourceType: 'site',
						resourceName: id,
						postfix: ctx.appId,
					}),
					forceDestroy: true,
					website: {
						indexDocument: 'index.html',
						errorDocument: props.ssr ? undefined : 'error.html',
					},
					corsRule: [
						{
							allowedOrigins: ['*'],
							allowedHeaders: ['*'],
							allowedMethods: ['GET', 'HEAD'],
							exposeHeaders: ['content-type', 'cache-control'],
						},
					],
				})

				new aws.s3.BucketPolicy(
					group,
					`policy`,
					{
						bucket: bucket.bucket,
						policy: $resolve([bucket.arn, routerId], (arn, id) => {
							return JSON.stringify({
								Version: '2012-10-17',
								Statement: [
									{
										Effect: 'Allow',
										Action: 's3:GetObject',
										Resource: `${arn}/*`,
										Principal: {
											Service: 'cloudfront.amazonaws.com',
										},
										Condition: {
											StringEquals: {
												'AWS:SourceArn': `arn:aws:cloudfront::${ctx.accountId}:distribution/${id}`,
											},
										},
									},
								],
							})
						}),
					},
					{
						dependsOn: [bucket],
					}
				)

				ctx.addStackPermission({
					actions: [
						's3:ListBucket',
						's3:ListBucketV2',
						's3:HeadObject',
						's3:GetObject',
						's3:PutObject',
						's3:DeleteObject',
						's3:CopyObject',
						's3:GetObjectAttributes',
					],
					resources: [
						//
						bucket.arn,
						bucket.arn.pipe(arn => `${arn}/*`),
					],
				})

				// ------------------------------------------------------------
				// Get all static files

				ctx.onReady(() => {
					if (typeof props.static === 'string' && bucket) {
						const files = glob.sync('**', {
							cwd: props.static,
							nodir: true,
						})

						const staticRoutes: Record<string, Route> = {}

						for (const file of files) {
							const prefixedFile = join('/', file)
							const object = new aws.s3.BucketObject(group, prefixedFile, {
								bucket: bucket.bucket,
								key: prefixedFile,
								cacheControl: getCacheControl(file),
								contentType: getContentType(file),
								source: join(props.static, file),
								sourceHash: $hash(join(props.static, file)),
							})

							versions.push(object.key)
							versions.push(object.sourceHash)

							const strippedHtmlFile = file.endsWith('index.html')
								? file.slice(0, -11)
								: file.endsWith('.html')
									? file.slice(0, -5)
									: file

							const urlFriendlyFile = strippedHtmlFile.endsWith('/')
								? strippedHtmlFile.slice(0, -1)
								: strippedHtmlFile

							const routeFileKey = join(props.path, urlFriendlyFile)

							staticRoutes[routeFileKey] = {
								type: 's3',
								domainName: bucket.bucketRegionalDomainName,
								rewrite: prefixedFile !== routeFileKey ? { to: prefixedFile } : undefined,
							}
						}

						addRoutes(group, 'static', staticRoutes)
					}
				})
			}

			addInvalidation(group, 'invalidate', [routeKey], versions)
			// addRoutes(group, routes)
		}
	},
})
