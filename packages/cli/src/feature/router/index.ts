import { days, seconds, toSeconds, years } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { DataSource, Group, Input, Output, Resource } from '@terraforge/core'
import { constantCase, kebabCase } from 'change-case'
import { ExpectedError, FileError } from '../../error.js'
import { defineFeature } from '../../feature.js'
import { RouteDeployment } from '../../formation/cloudfront-kvs.js'
import { FunctionDeployment } from '../../formation/lambda.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { formatRouteKey, registerBundleFunction, ROUTE_HEADER } from '../bundle/util.js'
import { formatFullDomainName } from '../domain/util.js'
import { compileRoutePattern } from './pattern.js'
import { assertRouteValueSize, createRouteStoreEntries, hasBundleRoutes, Route } from './route.js'
import { getViewerRequestFunctionCode } from './router-code.js'

// The bundle route key of a route pattern, shared by the deployed
// route store & the local dev router so both dispatch the same keys.
const formatPatternRouteKey = (stackName: string, pattern: string) => {
	const slug = kebabCase(pattern).slice(0, 20)

	return formatRouteKey(stackName, 'route', `${slug || 'root'}-${shortId(pattern)}`)
}

export const routerFeature = defineFeature({
	name: 'router',
	onApp(ctx) {
		const routers = Object.entries(ctx.appConfig.router ?? {})

		// Every router keeps its routes in its own store, so one router
		// can never crowd another out of the 5MB store cap.
		const routes: Record<string, Record<string, Route | Route[]>> = {}
		const routeDependencies: Record<string, Set<Resource | DataSource>> = {}
		const routeStores: Record<string, aws.cloudfront.KeyValueStore> = {}
		const routerGroups: Record<string, Group> = {}
		const distributionIds: Output<string>[] = []

		for (const [id, props] of routers) {
			const group = new Group(ctx.base, 'router', id)

			routerGroups[id] = group
			routes[id] = {}
			routeDependencies[id] = new Set()

			const name = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'router',
				resourceName: id,
			})

			// ------------------------------------------------------------
			// Route Store

			const routeStore = new aws.cloudfront.KeyValueStore(
				group,
				'routes',
				{ name },
				{
					replaceOnChanges: ['name'],
					createBeforeReplace: true,
					import: ctx.import ? name : undefined,
				}
			)

			routeStores[id] = routeStore

			// the function names are capped at 64 characters
			const cfFunction = new aws.cloudfront.Function(
				group,
				'function',
				{
					name,
					runtime: 'cloudfront-js-2.0',
					code: getViewerRequestFunctionCode({
						router: id,
						blockDirectAccess: !!props.domain,
						redirectWww: !!props.domain && props.redirectWww,
						basicAuth: props.basicAuth,
						passwordAuth: props.passwordAuth,
					}),
					publish: true,
					keyValueStoreAssociations: [routeStore.arn],
				},
				{
					import: ctx.import ? name : undefined,
				}
			)

			// ------------------------------------------------------------
			// Add routes API

			ctx.shared.add('router', 'addRoutes', id, (newRoutes, options) => {
				const routerRoutes = routes[id]!

				for (const [key, route] of Object.entries(newRoutes)) {
					if (Object.hasOwn(routerRoutes, `${id}:${key}`)) {
						throw new ExpectedError(`Duplicate route key: ${key} in the "${id}" router`)
					}

					assertRouteValueSize(`${id}:${key}`, route)
					routerRoutes[`${id}:${key}`] = route
				}

				for (const dependency of options?.dependsOn ?? []) {
					routeDependencies[id]!.add(dependency)
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
					headerBehavior: 'allExcept',
					headers: {
						items: ['host'],
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

			// ------------------------------------------------------------
			// CDN Distribution

			const distribution = new aws.cloudfront.MultitenantDistribution(group, 'distribution', {
				tags: {
					name,
				},
				comment: name,
				enabled: true,
				viewerCertificate: [{ cloudfrontDefaultCertificate: true }],
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
								functionArn: cfFunction.arn,
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
					new aws.route53.Record(
						group,
						recordId,
						{
							zoneId,
							type: 'A',
							name: recordName,
							alias: {
								name: connectionGroup.routingEndpoint,
								zoneId: 'Z2FDTNDATAQYW2',
								evaluateTargetHealth: false,
							},
						},
						{
							replaceOnChanges: ['name', 'type', 'zoneId', 'alias'],
						}
					)

					new aws.route53.Record(
						group,
						`${recordId}-ipv6`,
						{
							zoneId,
							type: 'AAAA',
							name: recordName,
							alias: {
								name: connectionGroup.routingEndpoint,
								zoneId: 'Z2FDTNDATAQYW2',
								evaluateTargetHealth: false,
							},
						},
						{
							replaceOnChanges: ['name', 'type', 'zoneId', 'alias'],
						}
					)
				}

				ctx.bind(`ROUTER_${constantCase(id)}_ENDPOINT`, domainName)
				ctx.shared.add('router', 'endpoint', id, domainName)
			}
		}

		if (routers.length > 0) {
			ctx.onReadyLast(() => {
				const bundle = ctx.shared.get('bundle', 'main')
				const bundleDependencies: (Resource | DataSource)[] = []
				let lambdaUrlHost: Input<string> | undefined

				if (routers.some(([id]) => hasBundleRoutes(routes[id]!))) {
					// The bundle url & permissions belong to the whole app, not to
					// any one router, so they get a neutral place in the state
					// where renaming a router can't delete & recreate them.
					const sharedGroup = new Group(ctx.base, 'router', 'shared')
					const deployment = new FunctionDeployment(
						sharedGroup,
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
					bundleDependencies.push(bundle.policy, bundle.alias, deployment)
				}

				for (const [id] of routers) {
					const dependencies = routeDependencies[id]!

					// Only routers that route into the bundle wait for its policy, alias & url.
					if (hasBundleRoutes(routes[id]!)) {
						for (const dependency of bundleDependencies) {
							dependencies.add(dependency)
						}
					}

					new RouteDeployment(
						routerGroups[id]!,
						'deployment',
						{
							// non-deploy commands build the graph but never apply it
							deploymentId: ctx.deploymentId ?? 'local-0',
							storeArn: routeStores[id]!.arn,
							functionVersion: bundle.lambda.version,
							routes: $resolve([routes[id]!, lambdaUrlHost], (routes, lambdaUrlHost) => {
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
							dependsOn: Array.from(dependencies),
						}
					)
				}
			})
		}
	},
	onStack(ctx) {
		for (const [id, patterns] of Object.entries(ctx.stackConfig.routes ?? {})) {
			if (!ctx.appConfig.router?.[id]) {
				throw new FileError(ctx.stackConfig.file, `Router "${id}" is not defined on the app level.`)
			}

			const addRoutes = ctx.shared.entry('router', 'addRoutes', id)
			const grouped: Record<string, Route[]> = {}

			for (const [pattern, props] of Object.entries(patterns)) {
				const compiled = compileRoutePattern(pattern)
				const routeKey = formatPatternRouteKey(ctx.stack.name, pattern)

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
	onDev(ctx) {
		// Register every route pattern on the local dev router with the
		// same route key derivation as the deployed route store.
		for (const stackConfig of ctx.stackConfigs) {
			for (const [id, patterns] of Object.entries(stackConfig.routes ?? {})) {
				for (const pattern of Object.keys(patterns)) {
					ctx.addRoute({
						routerId: id,
						pattern,
						routeKey: formatPatternRouteKey(stackConfig.name, pattern),
					})
				}
			}
		}
	},
})
