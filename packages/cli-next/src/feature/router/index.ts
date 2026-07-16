import { days, seconds, toSeconds, years } from '@awsless/duration'
import { DataSource, Group, Input, Resource } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { createDnsValidatedCertificate, formatFullDomainName } from '../domain/util.js'
import { NsCheck } from '../../formation/ns-check.js'
import { camelCase, constantCase } from 'change-case'
import { RouteDeployment } from '../../formation/cloudfront-kvs.js'
import { getViewerRequestFunctionCode } from './router-code.js'
import { ExpectedError } from '../../error.js'
import { FunctionDeployment } from '../../formation/lambda.js'
import { Route } from './route.js'

export const routerFeature = defineFeature({
	name: 'router',
	onApp(ctx) {
		const deploymentDomain = ctx.appConfig.defaults.deploymentDomain
		const routers = Object.entries(ctx.appConfig.defaults.router ?? {})

		if (deploymentDomain) {
			// the deployment url wildcard can only point at one distribution
			if (routers.length > 1) {
				throw new ExpectedError(`A deploymentDomain currently only supports apps with a single router.`)
			}

			// deployment urls must never live on a user facing domain
			for (const domainProps of Object.values(ctx.appConfig.defaults.domains ?? {})) {
				const domain = domainProps.domain

				if (
					deploymentDomain === domain ||
					deploymentDomain.endsWith(`.${domain}`) ||
					domain.endsWith(`.${deploymentDomain}`)
				) {
					throw new ExpectedError(
						`The "${deploymentDomain}" deploymentDomain can't overlap with the configured "${domain}" domain.`
					)
				}
			}
		}

		for (const [id, props] of routers) {
			const group = new Group(ctx.base, 'router', id)
			const placeholderOrigin = ctx.shared
				.get('bundle', 'bucket-name')
				.pipe(bucket => `${bucket}.s3.${ctx.appConfig.region}.amazonaws.com`)

			const name = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'router',
				resourceName: id,
			})

			// ------------------------------------------------------------
			// Deployment URL Domain

			let deploymentCertificateArn: Input<string> | undefined
			let deploymentZone: aws.route53.Zone | undefined

			if (deploymentDomain) {
				const zone = new aws.route53.Zone(ctx.zones, 'deployment-zone', {
					name: deploymentDomain,
					forceDestroy: true,
				})
				const nsCheck = new NsCheck(group, 'deployment-check', {
					zoneId: zone.id,
				})

				ctx.registerDomainZone(zone)
				deploymentZone = zone

				const provider = ctx.appConfig.region !== 'us-east-1' ? ('global-aws' as const) : undefined
				const validation = createDnsValidatedCertificate(group, 'deployment-cert', {
					recordIdPrefix: 'deployment-cert',
					zoneId: zone.id,
					domainName: deploymentDomain,
					subjectAlternativeNames: [`*.${deploymentDomain}`],
					provider,
					dependsOn: [nsCheck],
				})

				deploymentCertificateArn = validation.certificateArn
			}

			// ------------------------------------------------------------
			// Route Store

			const routeStore = new aws.cloudfront.KeyValueStore(group, 'routes', {
				name,
				comment: 'Store for routes',
			})
			const productionCode = getViewerRequestFunctionCode({
				basicAuth: props.basicAuth,
				passwordAuth: props.passwordAuth,
			})
			const previewCode = getViewerRequestFunctionCode({
				basicAuth: props.basicAuth,
				passwordAuth: props.passwordAuth,
				deployUrls: !!deploymentDomain,
			})
			// the function names are capped at 64 characters
			const productionFunction = new aws.cloudfront.Function(group, 'production-function', {
				name: `${name.slice(0, 52)}--production`,
				runtime: 'cloudfront-js-2.0',
				code: productionCode,
				publish: true,
				keyValueStoreAssociations: [routeStore.arn],
			})
			const previewFunction = new aws.cloudfront.Function(group, 'preview-function', {
				name: `${name.slice(0, 55)}--preview`,
				runtime: 'cloudfront-js-2.0',
				code: previewCode,
				publish: true,
				keyValueStoreAssociations: [routeStore.arn],
			})

			// ------------------------------------------------------------
			// Add routes API

			const routeKeys = new Set<string>()
			const routes: Record<string, Route> = {}
			const routeDependencies = new Set<Resource | DataSource>()
			let lambdaUrlHost: Input<string> | undefined

			ctx.shared.add('router', 'addRoutes', id, (newRoutes, options) => {
				for (const [key, route] of Object.entries(newRoutes)) {
					if (routeKeys.has(key)) {
						throw new ExpectedError(`Duplicate route key: ${key} in the "${id}" router`)
					}

					routeKeys.add(key)
					routes[key] = route
				}

				for (const dependency of options?.dependsOn ?? []) {
					routeDependencies.add(dependency)
				}

				if (Object.values(newRoutes).some(route => route.type === 'lambda')) {
					if (!lambdaUrlHost) {
						const bundle = ctx.shared.get('bundle', 'main')
						const deployment = new FunctionDeployment(group, 'function-deployment', {
							functionName: bundle.lambda.functionName,
							functionVersion: bundle.lambda.version,
							id,
							sourceArns: [distribution.id, previewDistribution.id].map(distributionId =>
								distributionId.pipe(id => `arn:aws:cloudfront::${ctx.accountId}:distribution/${id}`)
							),
						})

						lambdaUrlHost = deployment.url.pipe(url => url.split('/')[2]!)
						routeDependencies.add(bundle.policy)
						routeDependencies.add(bundle.alias)
						routeDependencies.add(deployment)
					}
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
						domainName: placeholderOrigin,
						customOriginConfig: [
							{
								httpPort: 80,
								httpsPort: 443,
								originProtocolPolicy: 'https-only',
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

			const previewDistribution = new aws.cloudfront.Distribution(group, 'preview', {
				tags: {
					name: `${name}-preview`,
				},
				comment: `${name} preview`,
				enabled: true,
				waitForDeployment: true,
				aliases: deploymentDomain ? [`*.${deploymentDomain}`] : undefined,
				origin: [
					{
						originId: 'default',
						domainName: placeholderOrigin,
						customOriginConfig: {
							httpPort: 80,
							httpsPort: 443,
							originProtocolPolicy: 'https-only',
							originReadTimeout: 20,
							originSslProtocols: ['TLSv1.2'],
						},
					},
				],
				customErrorResponse: Object.entries(props.errors ?? {}).map(([errorCode, item]) => {
					if (typeof item === 'string') {
						return {
							errorCode: Number(errorCode),
							responseCode: Number(errorCode),
							responsePagePath: item,
						}
					}

					return {
						errorCode: Number(errorCode),
						errorCachingMinTtl: item.minTTL ? toSeconds(item.minTTL) : undefined,
						responseCode: item.statusCode ?? Number(errorCode),
						responsePagePath: item.path,
					}
				}),
				restrictions: {
					geoRestriction: {
						restrictionType: props.geoRestrictions.length > 0 ? 'blacklist' : 'none',
						locations: props.geoRestrictions,
					},
				},
				viewerCertificate: deploymentCertificateArn
					? {
							acmCertificateArn: deploymentCertificateArn,
							sslSupportMethod: 'sni-only',
							minimumProtocolVersion: 'TLSv1.2_2021',
						}
					: {
							cloudfrontDefaultCertificate: true,
						},
				defaultCacheBehavior: {
					compress: true,
					targetOriginId: 'default',
					functionAssociation: [
						{
							eventType: 'viewer-request',
							functionArn: previewFunction.arn,
						},
					],
					originRequestPolicyId: originRequest.id,
					cachePolicyId: cache.id,
					responseHeadersPolicyId: responseHeaders.id,
					viewerProtocolPolicy: 'redirect-to-https',
					allowedMethods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'OPTIONS', 'DELETE'],
					cachedMethods: ['GET', 'HEAD'],
				},
				webAclId: waf?.arn,
			})

			ctx.shared.add('router', 'id', id, distribution.id)
			ctx.shared.add('router', 'preview-id', id, previewDistribution.id)

			if (deploymentDomain && deploymentZone) {
				new aws.route53.Record(group, `deploy-url-record`, {
					zoneId: deploymentZone.id,
					type: 'A',
					name: `*.${deploymentDomain}`,
					alias: {
						name: previewDistribution.domainName,
						zoneId: 'Z2FDTNDATAQYW2',
						evaluateTargetHealth: false,
					},
				})
			}

			// if (waf) {
			// 	new aws.wafv2.WebAclAssociation(group, 'association', {
			// 		'webAclArn': waf.arn,
			// 		'resourceArn':
			// 	})
			// }

			ctx.onReadyLast(() => {
				const bundle = ctx.shared.get('bundle', 'main')

				new RouteDeployment(
					group,
					'deployment',
					{
						// non-deploy commands build the graph but never apply it
						deploymentId: ctx.deploymentId ?? 0,
						storeArn: routeStore.arn,
						functionVersion: bundle.lambda.version,
						routes: $resolve([routes, lambdaUrlHost], (routes, lambdaUrlHost) => {
							return Object.entries(routes).map(([key, route]) => ({
								key,
								value: JSON.stringify(
									route.type === 'lambda' ? { ...route, domainName: lambdaUrlHost } : route
								),
							}))
						}),
					},
					{
						dependsOn: Array.from(routeDependencies),
					}
				)
			})

			// ------------------------------------------------------------
			// Link to Route53

			if (props.domain) {
				const domainName = formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)
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
					domain: [{ domain: domainName }],
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

				ctx.bind(`ROUTER_${constantCase(id)}_ENDPOINT`, domainName)
			}
		}
	},
})
