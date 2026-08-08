import { days, seconds, toSeconds, years } from '@awsless/duration'
import { DataSource, Group, Input, Output, Resource } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { formatFullDomainName } from '../domain/util.js'
import { camelCase, constantCase, kebabCase } from 'change-case'
import { RouteDeployment } from '../../formation/cloudfront-kvs.js'
import { FunctionDeployment } from '../../formation/lambda.js'
import { getViewerRequestFunctionCode } from './router-code.js'
import { ExpectedError, FileError } from '../../error.js'
import { Route } from './route.js'
import { compileRoutePattern } from './pattern.js'
import { formatRouteKey, registerBundleFunction, ROUTE_HEADER } from '../bundle/util.js'
import { shortId } from '../../util/id.js'

// The route store caps a value at 1KB.
const MAX_VALUE_SIZE = 1000

// Serialized lambda routes gain a function url host, which tops out under 64 chars.
const ORIGIN_PLACEHOLDER = 'x'.repeat(64)

const assertRouteValueSize = (key: string, route: Route | Route[]) => {
	const withOrigin = (entry: Route) => {
		return entry.type === 'lambda' && !entry.domainName ? { ...entry, domainName: ORIGIN_PLACEHOLDER } : entry
	}

	// Route lists shard over multiple entries, so only a single route can outgrow one.
	for (const entry of Array.isArray(route) ? route : [route]) {
		if (Buffer.byteLength(JSON.stringify(withOrigin(entry)), 'utf8') > MAX_VALUE_SIZE) {
			throw new ExpectedError(`The route value of the "${key}" route key is too large.`)
		}
	}
}

// Route lists that are too big for a single key value pair are
// sharded over multiple entries behind a route index.
const createRouteStoreEntries = (key: string, route: object | object[]) => {
	const value = JSON.stringify(route)

	if (!Array.isArray(route) || Buffer.byteLength(value, 'utf8') <= MAX_VALUE_SIZE) {
		return [{ key, value }]
	}

	return [
		{ key, value: JSON.stringify({ list: route.length }) },
		...route.map((entry, index) => ({
			key: `${key}#${index}`,
			value: JSON.stringify(entry),
		})),
	]
}

export const routerFeature = defineFeature({
	name: 'router',
	onApp(ctx) {
		const routers = Object.entries(ctx.appConfig.defaults.router ?? {})

		// All routers share one route store and one deployment; the
		// shared resources live in the first router.
		const defaultRouter = routers[0]?.[0]
		const routes: Record<string, Route | Route[]> = {}
		const routeDependencies = new Set<Resource | DataSource>()
		const distributionIds: Output<string>[] = []
		let hasLambdaRoutes = false
		let routeStore: aws.cloudfront.KeyValueStore | undefined

		for (const [id, props] of routers) {
			const group = new Group(ctx.base, 'router', id)

			const name = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'router',
				resourceName: id,
			})

			// ------------------------------------------------------------
			// Route Store

			if (id === defaultRouter) {
				routeStore = new aws.cloudfront.KeyValueStore(
					group,
					'routes',
					{
						name: formatGlobalResourceName({
							appName: ctx.app.name,
							resourceType: 'router',
							resourceName: 'store',
						}),
						comment: 'Store for routes',
					},
					{
						replaceOnChanges: ['name'],
						createBeforeReplace: true,
					}
				)
			}

			// the function names are capped at 64 characters
			const productionFunction = new aws.cloudfront.Function(group, 'production-function', {
				name: `${name.slice(0, 52)}--production`,
				runtime: 'cloudfront-js-2.0',
				code: getViewerRequestFunctionCode({
					router: id,
					blockDirectAccess: !!props.domain,
					redirectWww: !!props.domain && props.redirectWww,
					basicAuth: props.basicAuth,
					passwordAuth: props.passwordAuth,
				}),
				publish: true,
				keyValueStoreAssociations: [routeStore!.arn],
			})

			// ------------------------------------------------------------
			// Add routes API

			ctx.shared.add('router', 'addRoutes', id, (newRoutes, options) => {
				for (const [key, route] of Object.entries(newRoutes)) {
					if (Object.hasOwn(routes, `${id}:${key}`)) {
						throw new ExpectedError(`Duplicate route key: ${key} in the "${id}" router`)
					}

					assertRouteValueSize(`${id}:${key}`, route)
					routes[`${id}:${key}`] = route
				}

				for (const dependency of options?.dependsOn ?? []) {
					routeDependencies.add(dependency)
				}

				if (
					Object.values(newRoutes)
						.flat()
						.some(route => route.type === 'lambda' && !route.domainName)
				) {
					hasLambdaRoutes = true
				}
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
								// host dependent SSR responses must be cached
								// per deployment url host
								'x-forwarded-host',
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
								functionArn: productionFunction.arn,
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

			if (id === defaultRouter) {
				ctx.onReadyLast(() => {
					const bundle = ctx.shared.get('bundle', 'main')
					let lambdaUrlHost: Input<string> | undefined

					if (hasLambdaRoutes) {
						const deployment = new FunctionDeployment(
							group,
							'function-deployment',
							{
								functionName: bundle.lambda.functionName,
								id: ctx.deploymentId ?? 'local-0',
								sourceArns: distributionIds.map(distributionId =>
									distributionId.pipe(id => `arn:aws:cloudfront::${ctx.accountId}:distribution/${id}`)
								),
							},
							{
								dependsOn: [bundle.deployment],
							}
						)

						lambdaUrlHost = deployment.url.pipe(url => url.split('/')[2]!)
						routeDependencies.add(bundle.policy)
						routeDependencies.add(bundle.alias)
						routeDependencies.add(deployment)
					}

					new RouteDeployment(
						group,
						'deployment',
						{
							// non-deploy commands build the graph but never apply it
							deploymentId: ctx.deploymentId ?? 'local-0',
							storeArn: routeStore!.arn,
							functionVersion: bundle.lambda.version,
							routes: $resolve([routes, lambdaUrlHost], (routes, lambdaUrlHost) => {
								const withOrigin = (route: Route) => {
									return route.type === 'lambda' && !route.domainName
										? { ...route, domainName: lambdaUrlHost }
										: route
								}

								return Object.entries(routes).flatMap(([key, route]) =>
									createRouteStoreEntries(
										key,
										Array.isArray(route) ? route.map(withOrigin) : withOrigin(route)
									)
								)
							}),
						},
						{
							dependsOn: Array.from(routeDependencies),
						}
					)
				})
			}

			ctx.shared.add('router', 'id', id, distribution.id)
			distributionIds.push(distribution.id)

			// ------------------------------------------------------------
			// Link to Route53

			if (props.domain) {
				const domainName = formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)
				const wwwDomainName = props.redirectWww ? `www.${domainName}` : undefined
				const certificateArn = ctx.shared.entry('domain', `global-certificate-arn`, props.domain)
				const zoneId = ctx.shared.entry('domain', 'zone-id', props.domain)

				const connectionGroup = new aws.cloudfront.ConnectionGroup(group, 'connection-group', {
					name,
					ipv6Enabled: true,
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

				for (const [recordId, recordName] of [
					['record', domainName],
					...(wwwDomainName ? [['www-record', wwwDomainName]] : []),
				] as const) {
					new aws.route53.Record(group, recordId, {
						zoneId,
						type: 'A',
						name: recordName,
						alias: {
							name: connectionGroup.routingEndpoint,
							zoneId: 'Z2FDTNDATAQYW2',
							evaluateTargetHealth: false,
						},
					})

					new aws.route53.Record(group, `${recordId}-ipv6`, {
						zoneId,
						type: 'AAAA',
						name: recordName,
						alias: {
							name: connectionGroup.routingEndpoint,
							zoneId: 'Z2FDTNDATAQYW2',
							evaluateTargetHealth: false,
						},
					})
				}

				ctx.bind(`ROUTER_${constantCase(id)}_ENDPOINT`, domainName)
				ctx.shared.add('router', 'endpoint', id, domainName)
			}
		}
	},
	onStack(ctx) {
		for (const [id, patterns] of Object.entries(ctx.stackConfig.routes ?? {})) {
			if (!ctx.appConfig.defaults.router?.[id]) {
				throw new FileError(ctx.stackConfig.file, `Router "${id}" is not defined on the app level.`)
			}

			const addRoutes = ctx.shared.entry('router', 'addRoutes', id)
			const grouped: Record<string, Route[]> = {}

			for (const [pattern, props] of Object.entries(patterns)) {
				const compiled = compileRoutePattern(pattern)
				const slug = kebabCase(pattern).slice(0, 20)
				const routeKey = formatRouteKey(ctx.stack.name, 'route', `${slug || 'root'}-${shortId(pattern)}`)

				registerBundleFunction(ctx, routeKey, props)

				grouped[compiled.key] ??= []
				grouped[compiled.key]!.push({
					type: 'lambda',
					forwardHost: true,
					urlEncodedQueryString: true,
					match: compiled.match,
					params: compiled.params,
					requestHeaders: {
						[ROUTE_HEADER]: routeKey,
					},
				})
			}

			// Patterns that share a route key match in order of definition,
			// with the basic wildcard route last.
			const merged: Record<string, Route | Route[]> = {}

			for (const [key, list] of Object.entries(grouped)) {
				if (list.length === 1) {
					merged[key] = list[0]!
				} else {
					merged[key] = [...list.filter(route => route.match), ...list.filter(route => !route.match)]
				}
			}

			addRoutes(merged)
		}
	},
})
