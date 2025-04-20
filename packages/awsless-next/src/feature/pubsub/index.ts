import { $, Group } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { createAsyncLambdaFunction, createLambdaFunction } from '../function/util.js'
import { constantCase } from 'change-case'
import { formatFullDomainName } from '../domain/util.js'

export const pubsubFeature = defineFeature({
	name: 'pubsub',
	onApp(ctx) {
		for (const [id, props] of Object.entries(ctx.appConfig.defaults.pubsub ?? {})) {
			const group = new Group(ctx.base, 'pubsub', id)

			const { lambda } = createLambdaFunction(group, ctx, 'pubsub-authorizer', id, props.auth)

			// lambda.addEnvironment('PUBSUB_POLICY', JSON.stringify(props.policy))
			// lambda.addEnvironment('AWS_ACCOUNT_ID', ctx.accountId)

			const name = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'pubsub',
				resourceName: id,
			})

			const authorizer = new $.aws.iot.Authorizer(group, 'authorizer', {
				name,
				authorizerFunctionArn: lambda.arn,
				status: 'ACTIVE',
				signingDisabled: true,
			})

			new $.aws.lambda.Permission(group, 'permission', {
				functionName: lambda.functionName,
				action: 'lambda:InvokeFunction',
				principal: 'iot.amazonaws.com',
				sourceArn: authorizer.arn,
			})

			ctx.bind(`PUBSUB_${constantCase(id)}_AUTHORIZER`, name)

			const endpoint = $.aws.iot.getEndpoint({
				endpointType: 'iot:Data-ATS',
			})

			if (props.domain) {
				const domainName = formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)

				new $.aws.iot.DomainConfiguration(group, 'domain', {
					name,
					domainName,
					serverCertificateArns: [ctx.shared.entry('domain', `certificate-arn`, props.domain)],
					authorizerConfig: {
						defaultAuthorizerName: authorizer.name,
					},
					// validationCertificate: ctx.shared.get(`global-certificate-${props.domain}-arn`),
				})

				new $.aws.route53.Record(group, 'record', {
					zoneId: ctx.shared.entry('domain', `zone-id`, props.domain),
					name: domainName,
					type: 'CNAME',
					records: [endpoint.endpointAddress],
				})

				ctx.bind(`PUBSUB_${constantCase(id)}_ENDPOINT`, domainName)
			} else {
				ctx.bind(`PUBSUB_${constantCase(id)}_ENDPOINT`, endpoint.endpointAddress)
			}
		}

		ctx.addGlobalPermission({
			actions: [`iot:Publish`],
			resources: [
				//
				`arn:aws:iot:${ctx.appConfig.region}:${ctx.accountId}:topic/*`,
				`arn:aws:iot:${ctx.appConfig.region}:${ctx.accountId}:topic/${ctx.app.name}/pubsub/*`,
			],
		})
	},
	onStack(ctx) {
		// We still need to find a way to namespace the listeners you can listen to.
		// You only need to be able to listen to events from the spesific instance.

		for (const [id, props] of Object.entries(ctx.stackConfig.pubsub ?? {})) {
			const group = new Group(ctx.stack, 'pubsub', id)

			const { lambda } = createAsyncLambdaFunction(group, ctx, `pubsub`, id, props.consumer)

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'pubsub',
				resourceName: id,
			})

			const topic = new $.aws.iot.TopicRule(group, 'rule', {
				name: name.replaceAll('-', '_'),
				enabled: true,
				sql: props.sql,
				sqlVersion: props.sqlVersion,
				lambda: [{ functionArn: lambda.arn }],
			})

			new $.aws.lambda.Permission(group, 'permission', {
				action: 'lambda:InvokeFunction',
				principal: 'iot.amazonaws.com',
				functionName: lambda.functionName,
				sourceArn: topic.arn,
			})
		}
	},
})
