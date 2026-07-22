import { days, seconds, toSeconds, years } from '@awsless/duration'
import { Future, Group, Input, Resource } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { formatFullDomainName } from '../domain/util.js'
import { camelCase, constantCase, kebabCase } from 'change-case'
import { ImportKeys } from '../../formation/cloudfront-kvs.js'
import { getViewerRequestFunctionCode } from './router-code.js'
import { Invalidation } from '../../formation/cloudfront.js'
import { createHash } from 'node:crypto'
import { ExpectedError, FileError } from '../../error.js'
import { createLambdaFunction } from '../function/util.js'
import { shortId } from '../../util/id.js'
import { compileRoutePattern } from './pattern.js'
import { createRouteStoreEntries, Route } from './route.js'

export const routerFeature = defineFeature({
	name: 'router',
	onApp(ctx) {
		for (const [id, props] of Object.entries(ctx.appConfig.defaults.router ?? {})) {
			const group = new Group(ctx.base, 'router', id)

			const name = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'router',
				resourceName: id,
			})

			// ------------------------------------------------------------
			// Route Store

			const routeStore = new aws.cloudfront.KeyValueStore(group, 'routes', {
				name,
				comment: 'Store for routes',
			})

			// ------------------------------------------------------------
			// Add routes API

			const routeKeys: string[] = []
			const importedRoutes: Resource[] = []

			ctx.shared.add('router', 'addRoutes', id, (group, name, routes, options) => {
				for (const key of Object.keys(routes)) {
					if (routeKeys.includes(key)) {
						throw new ExpectedError(`Duplicate route key: ${key} in the "${id}" router`)
					}

					routeKeys.push(key)
				}

				const importKeys = new ImportKeys(
					group,
					[id, name].join('-'),
					{
						kvsArn: routeStore.arn,
						keys: $resolve([routes], routes => {
							return createRouteStoreEntries(routes) as any
						}),
					},
					{
						dependsOn: options?.dependsOn,
					}
				)

				importedRoutes.push(importKeys)
			})

			// ------------------------------------------------------------
			// Cache Policy

			const cache = new aws.cloudfront.CachePolicy(group, 'cache', {
				name,
				minTtl: toSeconds(seconds(0)),
				maxTtl: toSeconds(days(365)),
				defaultTtl: toSeconds(days(0)),
				parametersInCacheKeyAndForwardedToOrigin: {
					enableAcceptEncodingBrotli: true,
					enableAcceptEncodingGzip: true,
					cookiesConfig: {
						cookieBehavior: props.cache?.cookies ? 'whitelist' : 'none',
						cookies: {
							items: props.cache?.cookies,
						},
					},
					headersConfig: {
						headerBehavior: 'whitelist',
						headers: {
							items: [
								//
								...(props.cache?.headers ?? []),
								'x-origin',
							],
						},
					},
					queryStringsConfig: {
						queryStringBehavior: props.cache?.queries ? 'whitelist' : 'none',
						queryStrings: {
							items: props.cache?.queries,
						},
					},
				},
			})

			// ------------------------------------------------------------
			// Origin Request Policy

			const originRequest = new aws.cloudfront.OriginRequestPolicy(group, 'request', {
				name,
				headersConfig: {
					headerBehavior: camelCase('all-except'),
					headers: {
						items: [
							'host',

							// 'authorization'
						],
					},
				},
				cookiesConfig: {
					cookieBehavior: 'all',
				},
				queryStringsConfig: {
					queryStringBehavior: 'all',
				},
			})

			// ------------------------------------------------------------
			// Response Headers Policy

			const responseHeaders = new aws.cloudfront.ResponseHeadersPolicy(group, 'response', {
				name,
				corsConfig: {
					originOverride: props.cors?.override ?? true,
					accessControlMaxAgeSec: toSeconds(props.cors?.maxAge ?? years(1)),
					accessControlAllowHeaders: { items: props.cors?.headers ?? ['*'] },
					accessControlAllowMethods: { items: props.cors?.methods ?? ['ALL'] },
					accessControlAllowOrigins: { items: props.cors?.origins ?? ['*'] },
					accessControlExposeHeaders: { items: props.cors?.exposeHeaders ?? ['*'] },
					accessControlAllowCredentials: props.cors?.credentials ?? false,
				},
				removeHeadersConfig: {
					items: [{ header: 'server' }],
				},
				securityHeadersConfig: {
					contentTypeOptions: {
						override: true,
					},
					frameOptions: {
						override: true,
						frameOption: 'SAMEORIGIN',
					},
					referrerPolicy: {
						override: true,
						referrerPolicy: 'same-origin',
					},
					strictTransportSecurity: {
						override: true,
						preload: true,
						accessControlMaxAgeSec: toSeconds(years(1)),
						includeSubdomains: true,
					},
					xssProtection: {
						override: true,
						modeBlock: true,
						protection: true,
					},
				},
			})

			// ------------------------------------------------------------
			// Viewer Request CloudFront Function

			const viewerRequest = new aws.cloudfront.Function(group, 'viewer-request', {
				name,
				runtime: `cloudfront-js-2.0`,
				comment: `Viewer Request - ${name}`,
				publish: true,
				keyValueStoreAssociations: [routeStore.arn],
				code: getViewerRequestFunctionCode({
					blockDirectAccess: !!props.domain,
					redirectWww: !!props.domain && props.redirectWww,
					basicAuth: props.basicAuth,
					passwordAuth: props.passwordAuth,
				}),
			})

			const wafSettingsConfig = props.waf

			const wafRules: aws.wafv2.WebAclInput['rule'] = []

			if (wafSettingsConfig?.rateLimiter) {
				wafRules.push({
					name: 'rateLimiter',
					priority: 3,
					statement: {
						rateBasedStatement: {
							limit: wafSettingsConfig.rateLimiter.limit,
							aggregateKeyType: 'IP',
							evaluationWindowSec: toSeconds(wafSettingsConfig.rateLimiter.window),
						},
					},
					action: {
						block: {},
					},
					visibilityConfig: {
						sampledRequestsEnabled: true,
						cloudwatchMetricsEnabled: wafSettingsConfig.rateLimiter.visibility,
						metricName: `${name}-wafv2-rateLimiter`,
					},
				})
			}

			if (wafSettingsConfig?.botProtection) {
				wafRules.push({
					name: 'AWSManagedRulesBotControlRuleGroup',
					priority: 2,
					statement: {
						managedRuleGroupStatement: {
							name: 'AWSManagedRulesBotControlRuleSet',
							vendorName: 'AWS',
							managedRuleGroupConfigs: [
								{
									awsManagedRulesBotControlRuleSet: {
										inspectionLevel: wafSettingsConfig.botProtection.inspectionLevel,
									},
								},
							],
						},
					},
					overrideAction: {
						none: {},
					},
					visibilityConfig: {
						sampledRequestsEnabled: true,
						cloudwatchMetricsEnabled: wafSettingsConfig.botProtection.visibility,
						metricName: `${name}-wafv2-BotControlRuleSetMetric`,
					},
				})
			}

			if (wafSettingsConfig?.ddosProtection) {
				wafRules.push({
					name: 'AWSManagedRulesAntiDDoSRuleGroup',
					priority: 1,
					statement: {
						managedRuleGroupStatement: {
							name: 'AWSManagedRulesAntiDDoSRuleSet',
							vendorName: 'AWS',
							managedRuleGroupConfigs: [
								{
									awsManagedRulesAntiDdosRuleSet: {
										clientSideActionConfig: {
											challenge: {
												usageOfAction: 'ENABLED',
												sensitivity: wafSettingsConfig.ddosProtection.sensitivity.challenge,
												exemptUriRegularExpression: [
													{
														regexString: wafSettingsConfig.ddosProtection.exemptUriRegex,
													},
												],
											},
										},
										sensitivityToBlock: wafSettingsConfig.ddosProtection.sensitivity.block,
									},
								},
							],
						},
					},
					overrideAction: {
						none: {},
					},
					visibilityConfig: {
						sampledRequestsEnabled: true,
						cloudwatchMetricsEnabled: wafSettingsConfig.ddosProtection.visibility,
						metricName: `${name}-wafv2-AntiDDoSRuleSetMetric`,
					},
				})
			}

			let waf: aws.wafv2.WebAcl | undefined

			if (wafRules.length && wafSettingsConfig) {
				waf = new aws.wafv2.WebAcl(group, 'waf', {
					name: `${name}-wafv2`,
					scope: 'CLOUDFRONT',
					defaultAction: {
						allow: {},
					},
					description: 'AWS Managed Rules Rule Set',
					rule: wafRules,
					captchaConfig: {
						immunityTimeProperty: {
							immunityTime: toSeconds(wafSettingsConfig.captchaImmunityTime),
						},
					},
					challengeConfig: {
						immunityTimeProperty: {
							immunityTime: toSeconds(wafSettingsConfig.challengeImmunityTime),
						},
					},
					visibilityConfig: {
						sampledRequestsEnabled: false,
						cloudwatchMetricsEnabled: false,
						metricName: `${name}-wafv2-AWSManagedRulesWebACL`,
					},
				})
			}

			// ctx.onDeleteResource(() => {
			// 	aws.wafv2.WebAcl
			// })

			// ------------------------------------------------------------
			// CDN Distribution

			// const certificateArn = props.domain
			// 	? ctx.shared.entry('domain', `global-certificate-arn`, props.domain)
			// 	: undefined

			const distribution = new aws.cloudfront.MultitenantDistribution(group, 'distribution', {
				tags: {
					name,
				},
				comment: name,
				enabled: true,
				viewerCertificate: [{ cloudfrontDefaultCertificate: true }],

				// viewerCertificate: certificateArn
				// 	? [
				// 			{
				// 				sslSupportMethod: 'sni-only',
				// 				minimumProtocolVersion: 'TLSv1.2_2021',
				// 				acmCertificateArn: certificateArn,
				// 			},
				// 		]
				// 	: [
				// 			{
				// 				cloudfrontDefaultCertificate: true,
				// 			},
				// 		],

				origin: [
					{
						id: 'default',
						domainName: 'placeholder.awsless.dev',
						customOriginConfig: [
							{
								httpPort: 80,
								httpsPort: 443,
								originProtocolPolicy: 'http-only',
								originReadTimeout: 20,
								originSslProtocols: ['TLSv1.2'],
								// originKeepaliveTimeout: 30,
							},
						],
					},
				],
				customErrorResponse: Object.entries(props.errors ?? {}).map(([errorCode, item]) => {
					if (typeof item === 'string') {
						return {
							errorCode: Number(errorCode),
							responseCode: errorCode,
							responsePagePath: item,
						}
					}

					return {
						errorCode: Number(errorCode),
						errorCachingMinTtl: item.minTTL ? toSeconds(item.minTTL) : undefined,
						responseCode: item.statusCode?.toString() ?? errorCode,
						responsePagePath: item.path,
					}
				}),

				restrictions: [
					{
						geoRestriction: [
							{
								restrictionType: props.geoRestrictions.length > 0 ? 'blacklist' : 'none',
								items: props.geoRestrictions,
							},
						],
					},
				],
				defaultCacheBehavior: [
					{
						compress: true,
						targetOriginId: 'default',
						functionAssociation: [
							{
								eventType: 'viewer-request',
								functionArn: viewerRequest.arn,
							},
						],
						originRequestPolicyId: originRequest.id,
						cachePolicyId: cache.id,
						responseHeadersPolicyId: responseHeaders.id,
						viewerProtocolPolicy: 'redirect-to-https',
						allowedMethods: [
							{
								items: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'OPTIONS', 'DELETE'],
								cachedMethods: ['GET', 'HEAD'],
							},
						],
					},
				],
				webAclId: waf?.arn,
			})

			ctx.shared.add('router', 'id', id, distribution.id)

			// if (waf) {
			// 	new aws.wafv2.WebAclAssociation(group, 'association', {
			// 		'webAclArn': waf.arn,
			// 		'resourceArn':
			// 	})
			// }

			// ------------------------------------------------------------
			// Add Invalidation API

			ctx.shared.add('router', 'addInvalidation', id, (group, name, paths, versions, options) => {
				ctx.onReady(() => {
					new Invalidation(
						group,
						[id, name].join('-'),
						{
							distributionId: distribution.id,
							paths,
							version: new Future(resolve => {
								$combine(...versions).then(versions => {
									const combined = versions
										.filter(v => !!v)
										.sort()
										.join(',')

									const version = createHash('sha1').update(combined).digest('hex')

									resolve(version)
								})
							}),
						},
						{
							dependsOn: [...(options?.dependsOn ?? []), ...importedRoutes],
						}
					)
				})
			})

			// ------------------------------------------------------------
			// Link to Route53

			if (props.domain) {
				const domainName = formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)
				const wwwDomainName = props.redirectWww ? `www.${domainName}` : undefined
				const certificateArn = ctx.shared.entry('domain', `global-certificate-arn`, props.domain)
				const zoneId = ctx.shared.entry('domain', 'zone-id', props.domain)

				const connectionGroup = new aws.cloudfront.ConnectionGroup(group, 'connection-group', {
					name,
				})

				new aws.cloudfront.DistributionTenant(group, `tenant`, {
					name,
					enabled: true,
					distributionId: distribution.id,
					connectionGroupId: connectionGroup.id,
					domain: [
						//
						{ domain: domainName },
						...(wwwDomainName ? [{ domain: wwwDomainName }] : []),
					],
					customizations: [{ certificate: [{ arn: certificateArn }] }],
				})

				new aws.route53.Record(group, `record`, {
					zoneId,
					type: 'A',
					name: domainName,
					alias: {
						name: connectionGroup.routingEndpoint,
						zoneId: 'Z2FDTNDATAQYW2',
						evaluateTargetHealth: false,
					},
				})

				if (wwwDomainName) {
					new aws.route53.Record(group, `www-record`, {
						zoneId,
						type: 'A',
						name: wwwDomainName,
						alias: {
							name: connectionGroup.routingEndpoint,
							zoneId: 'Z2FDTNDATAQYW2',
							evaluateTargetHealth: false,
						},
					})
				}

				ctx.bind(`ROUTER_${constantCase(id)}_ENDPOINT`, domainName)
			}
		}
	},
	onStack(ctx) {
		for (const [id, routes] of Object.entries(ctx.stackConfig.routes ?? {})) {
			if (!ctx.appConfig.defaults.router?.[id]) {
				throw new FileError(ctx.stackConfig.file, `Router "${id}" is not defined on the app level.`)
			}

			const group = new Group(ctx.stack, 'routes', id)
			const addRoutes = ctx.shared.entry('router', 'addRoutes', id)
			const addInvalidation = ctx.shared.entry('router', 'addInvalidation', id)

			const grouped: Record<string, Route[]> = {}
			const invalidationPaths = new Set<string>()
			const versions: Array<Input<string> | Input<string | undefined>> = []

			for (const [pattern, props] of Object.entries(routes)) {
				const compiled = compileRoutePattern(pattern)
				const slug = pattern
					.replace(/[^a-zA-Z0-9]+/g, '-')
					.replace(/^-+|-+$/g, '')
					.slice(0, 20)

				const entryId = kebabCase(`${slug || 'root'}-${shortId(pattern)}`)
				const routeGroup = new Group(group, 'route', entryId)

				// ------------------------------------------------------
				// The lambda function that will handle the route

				const result = createLambdaFunction(routeGroup, ctx, 'route', entryId, props)

				versions.push(result.code.sourceHash)

				ctx.onBind((name, value) => {
					result.setEnvironment(name, value)
				})

				// ------------------------------------------------------
				// Give the router access to the function url.
				// The wildcard source arn is needed because requests
				// from a multi-tenant distribution are signed on
				// behalf of the distribution tenant.

				new aws.lambda.Permission(routeGroup, 'permission', {
					principal: 'cloudfront.amazonaws.com',
					action: 'lambda:InvokeFunctionUrl',
					functionName: result.lambda.functionName,
					functionUrlAuthType: 'AWS_IAM',
					sourceArn: `arn:aws:cloudfront::${ctx.accountId}:*`,
				})

				new aws.lambda.Permission(routeGroup, 'invoke-permission', {
					principal: 'cloudfront.amazonaws.com',
					action: 'lambda:InvokeFunction',
					functionName: result.lambda.functionName,
					sourceArn: `arn:aws:cloudfront::${ctx.accountId}:*`,
				})

				const url = new aws.lambda.FunctionUrl(routeGroup, 'url', {
					functionName: result.lambda.functionName,
					authorizationType: 'AWS_IAM',
				})

				grouped[compiled.key] ??= []
				grouped[compiled.key]!.push({
					type: 'lambda',
					domainName: url.functionUrl.pipe(url => url.split('/')[2]!),
					forwardHost: true,
					urlEncodedQueryString: true,
					match: compiled.match,
					params: compiled.params,
				})

				invalidationPaths.add(compiled.key)
			}

			// ------------------------------------------------------
			// Add the routes to the router, where patterns that share
			// the same route key are matched in order of definition,
			// with the basic wildcard route last.

			const merged: Record<string, Route | Route[]> = {}

			for (const [key, list] of Object.entries(grouped)) {
				if (list.length === 1) {
					merged[key] = list[0]!
				} else {
					merged[key] = [...list.filter(route => route.match), ...list.filter(route => !route.match)]
				}
			}

			addRoutes(group, 'routes', merged)
			addInvalidation(group, 'invalidate', [...invalidationPaths], versions)
		}
	},
})
