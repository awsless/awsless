import { defineFeature } from '../../feature.js'
import { createLambdaFunction } from '../function/util.js'
import { Node, aws } from '@awsless/formation'

export const onLogFeature = defineFeature({
	name: 'on-log',
	onApp(ctx) {
		if (!ctx.appConfig.defaults.onLog) {
			return
		}

		const group = new Node(ctx.base, 'on-log', 'main')

		const { lambda } = createLambdaFunction(
			//
			group,
			ctx,
			'on-log',
			'consumer',
			ctx.appConfig.defaults.onLog.consumer
		)

		new aws.lambda.Permission(group, 'permission', {
			action: 'lambda:InvokeFunction',
			principal: 'logs.amazonaws.com',
			functionArn: lambda.arn,
			sourceArn: `arn:aws:logs:${ctx.appConfig.region}:${ctx.accountId}:log-group:/aws/lambda/${ctx.app.name}--*`,
		})

		ctx.shared.set('on-log-consumer-arn', lambda.arn)
	},
})
