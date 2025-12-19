import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { constantCase } from 'change-case'
import { defineFeature } from '../../../feature.js'
import { formatGlobalResourceName } from '../../../util/name.js'
import { formatFullDomainName } from '../../domain/util.js'
import { createLambdaFunction } from '../../function/util.js'
import { shortId } from '../../../util/id.js'

export const pubsubFeature = defineFeature({
	name: 'pubsub',
	onApp(ctx) {
		for (const [id, props] of Object.entries(ctx.appConfig.defaults?.pubsub ?? {})) {
			const group = new Group(ctx.base, 'pubsub', id)
			const shortName = `${ctx.app.name}--${id}`
			const name = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'pubsub',
				resourceName: id,
			})

			// ------------------------------------------------------
			// Create Auth Lambda Function

			const authGroup = new Group(group, 'auth', 'lambda')
			const { lambda: authLambda } = createLambdaFunction(authGroup, ctx, 'pubsub', `${id}-auth`, {
				...props.auth,
				description: `PubSub ${id} authorizer`,
			})

			// ------------------------------------------------------

			let loggingRole: aws.iam.Role | undefined
			if (props.logLevel) {
				loggingRole = new aws.iam.Role(group, 'logging-role', {
					name: shortId(`${name}-logging-role`),
					assumeRolePolicy: JSON.stringify({
						Version: '2012-10-17',
						Statement: [
							{
								Effect: 'Allow',
								Principal: {
									Service: 'appsync.amazonaws.com',
								},
								Action: 'sts:AssumeRole',
							},
						],
					}),
				})

				new aws.iam.RolePolicyAttachment(group, 'logs-policy', {
					role: loggingRole.name,
					policyArn: 'arn:aws:iam::aws:policy/service-role/AWSAppSyncPushToCloudWatchLogs',
				})
			}

			// ------------------------------------------------------

			const api = new aws.appsync.Api(group, 'api', {
				name: shortName,
				eventConfig: [
					{
						connectionAuthMode: [{ authType: 'AWS_IAM' }, { authType: 'AWS_LAMBDA' }],
						authProvider: [
							{
								authType: 'AWS_LAMBDA',
								lambdaAuthorizerConfig: [
									{
										authorizerUri: authLambda.arn,
										authorizerResultTtlInSeconds: 300,
									},
								],
							},
							{
								authType: 'AWS_IAM',
							},
						],
						defaultPublishAuthMode: [
							{
								authType: 'AWS_IAM',
							},
						],
						defaultSubscribeAuthMode: [
							{
								authType: 'AWS_LAMBDA',
							},
							{
								authType: 'AWS_IAM',
							},
						],
						logConfig: props.logLevel
							? [
									{
										logLevel: props.logLevel.toUpperCase(),
										cloudwatchLogsRoleArn: loggingRole!.arn,
									},
								]
							: undefined,
					},
				],
			})

			// ------------------------------------------------------
			// Create channel namespaces

			const namespaces = props.namespaces ?? ['default']
			for (const namespace of namespaces) {
				new aws.appsync.ChannelNamespace(group, `namespace-${namespace}`, {
					name: namespace,
					apiId: api.apiId,
				})
			}

			// ------------------------------------------------------
			// Grant AppSync permission to invoke auth lambda

			new aws.lambda.Permission(group, 'auth-permission', {
				action: 'lambda:InvokeFunction',
				principal: 'appsync.amazonaws.com',
				functionName: authLambda.functionName,
				sourceArn: api.apiArn,
			})

			// ------------------------------------------------------
			// Handle domain mapping

			if (props.domain) {
				const domainName = formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)
				const zoneId = ctx.shared.entry('domain', `zone-id`, props.domain)
				const certificateArn = ctx.shared.entry('domain', `certificate-arn`, props.domain)

				const apiDomain = new aws.appsync.DomainName(group, 'domain', {
					domainName,
					certificateArn,
				})

				new aws.appsync.DomainNameApiAssociation(group, 'domain-association', {
					apiId: api.apiArn,
					domainName: apiDomain.domainName,
				})

				new aws.route53.Record(group, 'record', {
					zoneId,
					type: 'CNAME',
					name: domainName,
					records: [apiDomain.appsyncDomainName],
					ttl: 300,
				})

				ctx.bind(`PUBSUB_${constantCase(id)}_ENDPOINT`, `${domainName}/event`)
				ctx.bind(`PUBSUB_${constantCase(id)}_REALTIME_ENDPOINT`, `${domainName}/event/realtime`)
			} else {
				ctx.bind(
					`PUBSUB_${constantCase(id)}_ENDPOINT`,
					api.dns.pipe((dns: any) => dns.HTTP)
				)
				ctx.bind(
					`PUBSUB_${constantCase(id)}_REALTIME_ENDPOINT`,
					api.dns.pipe((dns: any) => dns.REALTIME)
				)
			}
		}
	},

	// Note: The onStack method would handle channel namespaces and subscriptions
	// but is commented out for now as it needs to be refactored for AppSync Event API

	// onStack(ctx) {
	// 	// Channel namespaces and event handlers would be configured here
	// 	// This would include:
	// 	// 1. Creating channel namespaces with their own auth modes (overriding defaults)
	// 	// 2. Setting up event handlers (Lambda functions) for specific channels
	// 	// 3. Configuring event filtering and routing rules
	// },
})
