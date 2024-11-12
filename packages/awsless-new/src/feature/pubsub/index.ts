import { aws, Node } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { createAsyncLambdaFunction, createLambdaFunction } from '../function/util.js'
import { constantCase } from 'change-case'
import { formatFullDomainName } from '../domain/util.js'
import { FunctionProps } from '../function/schema.js'

export const pubsubFeature = defineFeature({
	name: 'pubsub',
	onApp(ctx) {
		for (const [id, props] of Object.entries(ctx.appConfig.defaults.pubsub ?? {})) {
			const group = new Node(ctx.base, 'pubsub', id)

			const functionProps: FunctionProps = typeof props.auth === 'string' ? { file: '' } : props.auth.authorizer

			const { lambda } = createLambdaFunction(group, ctx, 'pubsub-authorizer', id, functionProps)
			lambda.addEnvironment('PUBSUB_POLICY', JSON.stringify(props.policy))
			lambda.addEnvironment('AWS_ACCOUNT_ID', ctx.accountId)

			const name = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'pubsub',
				resourceName: id,
			})

			const authorizer = new aws.iot.Authorizer(group, 'authorizer', {
				name,
				functionArn: lambda.arn,
			})

			new aws.lambda.Permission(group, 'permission', {
				functionArn: lambda.arn,
				principal: 'iot.amazonaws.com',
				sourceArn: authorizer.arn,
				action: 'lambda:InvokeFunction',
			})

			ctx.bind(`PUBSUB_${constantCase(id)}_AUTHORIZER`, name)

			const endpoint = new aws.iot.Endpoint(group, 'endpoint', {
				type: 'data-ats',
			})

			if (props.domain) {
				const domainName = formatFullDomainName(ctx.appConfig, props.domain, props.subDomain)

				new aws.iot.DomainConfiguration(group, 'domain', {
					name,
					domainName,
					certificates: [ctx.shared.get(`local-certificate-${props.domain}-arn`)],
					authorizer: {
						name,
					},
					// validationCertificate: ctx.shared.get(`global-certificate-${props.domain}-arn`),
				})

				new aws.route53.RecordSet(group, 'record', {
					hostedZoneId: ctx.shared.get(`hosted-zone-${props.domain}-id`),
					name: domainName,
					type: 'CNAME',
					records: [endpoint.address],
				})

				ctx.bind(`PUBSUB_${constantCase(id)}_ENDPOINT`, domainName)
			} else {
				ctx.bind(`PUBSUB_${constantCase(id)}_ENDPOINT`, endpoint.address)
			}
		}

		ctx.onPolicy(policy => {
			policy.addStatement({
				actions: [`iot:Publish`],
				resources: [`arn:aws:iot:${ctx.appConfig.region}:${ctx.accountId}:topic/*`],
				// resources: [`arn:aws:iot:${ctx.appConfig.region}:${ctx.accountId}:topic/${ctx.app.name}/*`],
			})
		})
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.pubsub ?? {})) {
			const group = new Node(ctx.stack, 'pubsub', id)

			const { lambda } = createAsyncLambdaFunction(group, ctx, `pubsub`, id, props.consumer)

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'pubsub',
				resourceName: id,
			})

			const topic = new aws.iot.TopicRule(group, 'rule', {
				name: name.replaceAll('-', '_'),
				sql: props.sql,
				sqlVersion: props.sqlVersion,
				actions: [{ lambda: { functionArn: lambda.arn } }],
			})

			new aws.lambda.Permission(group, 'permission', {
				action: 'lambda:InvokeFunction',
				principal: 'iot.amazonaws.com',
				functionArn: lambda.arn,
				sourceArn: topic.arn,
			})
		}
	},
})
