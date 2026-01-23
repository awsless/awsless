import { defineFeature } from '../../feature.js'
import { createLambdaFunction } from '../function/util.js'
import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'

export const onLogFeature = defineFeature({
	name: 'on-log',
	onApp(ctx) {
		if (!ctx.appConfig.defaults.onLog) {
			return
		}

		const group = new Group(ctx.base, 'on-log', 'main')

		const result = createLambdaFunction(
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
			functionName: result.lambda.functionName,
			// sourceArn: `arn:aws:logs:${ctx.appConfig.region}:${ctx.accountId}:log-group:/aws/*/${ctx.app.name}--*`,
			sourceArn: `arn:aws:logs:${ctx.appConfig.region}:${ctx.accountId}:log-group:/aws/lambda/${ctx.app.name}--*`,
		})

		ctx.shared.set('on-log', 'consumer-arn', result.lambda.arn)

		// Deny calling other functions to stop circular loop problems
		result.addPermission({
			effect: 'deny',
			actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync', 'sqs:SendMessage', 'sns:Publish'],
			resources: ['*'],
		})
	},
})
