import { days, seconds, toSeconds, years } from '@awsless/duration'
import { Future, Group, Resource } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { formatFullDomainName } from '../domain/util.js'
import { camelCase, constantCase } from 'change-case'
import { ImportKeys } from '../../formation/cloudfront-kvs.js'
import { getViewerRequestFunctionCode } from './router-code.js'
import { Invalidation } from '../../formation/cloudfront.js'
import { createHash } from 'node:crypto'
import { ExpectedError } from '../../error.js'

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
					name,
					{
						kvsArn: routeStore.arn,
						keys: $resolve([routes], routes => {
							return Object.entries(routes).map(([key, value]) => {
								return { key, value: JSON.stringify(value) }
							}) as any
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
					basicAuth: props.basicAuth,
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

			// ------------------------------------------------------------
			// Add Invalidation API

			ctx.shared.add('router', 'addInvalidation', id, (group, name, paths, versions, options) => {
				ctx.onReady(() => {
					new Invalidation(
						group,
						name,
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
