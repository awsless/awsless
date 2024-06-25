import { aws, Node } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { formatLocalResourceName } from '../../util/name.js'
import { createAsyncLambdaFunction, createLambdaFunction, LambdaFunctionProps } from '../function/util.js'

export const pubsubFeature = defineFeature({
	name: 'pubsub',
	onApp(ctx) {
		for (const [id, props] of Object.entries(ctx.appConfig.defaults.realtime ?? {})) {
			const group = new Node(ctx.base, 'pubsub', id)

			const functionProps: LambdaFunctionProps =
				typeof props.auth === 'string' ? { file: '' } : props.auth.authorizer

			const { lambda } = createLambdaFunction(group, ctx, 'pubsub-auth', id, functionProps)
			lambda.addEnvironment('PUBSUB_POLICY', JSON.stringify(props.policy))
			lambda.addEnvironment('AWS_ACCOUNT_ID', ctx.accountId)

			const authorizer = new aws.iot.Authorizer(group, 'auth', {
				name: 'test',
				functionArn: lambda.arn,
				enableSigning: false,
			})

			const permission = new aws.lambda.Permission(group, 'permission', {
				functionArn: lambda.arn,
				principal: 'iot.amazonaws.com',
				sourceArn: authorizer.arn,
				action: 'lambda:InvokeFunction',
			})

			// 			aws lambda add-permission \
			//   --function-name  $arn \
			//   --principal iot.amazonaws.com \
			//   --statement-id Id-1234 \
			//   --action "lambda:InvokeFunction" \
			//   --source-arn $auth_arn
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

			const name = formatLocalResourceName(ctx.app.name, ctx.stack.name, 'pubsub', id)
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
