import { defineFeature } from '../../feature.js'
import { formatLocalResourceName } from '../../util/name.js'
import { createLambdaFunction } from '../function/util.js'
import { Node, aws } from '@awsless/formation'

export const logSubscriptionFeature = defineFeature({
	name: 'log-subscription',
	onApp(ctx) {
		if (!ctx.appConfig.logSubscription) {
			return
		}

		const group = new Node(ctx.base, 'log-subscription', 'main')

		const { lambda, policy } = createLambdaFunction(
			group,
			ctx,
			'log-subscription',
			'main',
			ctx.appConfig.logSubscription
		)

		new aws.lambda.Permission(group, 'log-subscription-permission', {
			action: 'lambda:InvokeFunction',
			principal: 'logs.amazonaws.com',
			functionArn: lambda.arn,
			sourceArn: `arn:aws:logs:${ctx.appConfig.region}:${ctx.accountId}:log-group:/aws/lambda/app-kennedy--*`,
		})

		ctx.shared.set('log-subscription-destination-arn', lambda.arn)

		for (const stack of ctx.stackConfigs) {
			for (const id of stack.topics ?? []) {
				policy.addStatement({
					actions: ['sns:Publish'],
					resources: [ctx.shared.get<aws.ARN>(`topic-${id}-arn`)],
				})
			}

			for (const [id, props] of Object.entries(stack.tables ?? {})) {
				const tableName = formatLocalResourceName({
					appName: ctx.app.name,
					stackName: stack.name,
					resourceType: 'table',
					resourceName: id,
				})

				policy.addStatement({
					actions: [
						'dynamodb:DescribeTable',
						'dynamodb:PutItem',
						'dynamodb:GetItem',
						'dynamodb:UpdateItem',
						'dynamodb:DeleteItem',
						'dynamodb:TransactWrite',
						'dynamodb:BatchWriteItem',
						'dynamodb:BatchGetItem',
						'dynamodb:ConditionCheckItem',
						'dynamodb:Query',
						'dynamodb:Scan',
					],
					resources: [`arn:aws:dynamodb:${ctx.appConfig.region}:${ctx.accountId}:table/${tableName}`],
				})

				const indexes = Object.keys(props.indexes ?? {})

				if (indexes.length) {
					policy.addStatement({
						actions: ['dynamodb:Query'],
						resources: indexes.map(
							indexName =>
								`arn:aws:dynamodb:${ctx.appConfig.region}:${ctx.accountId}:table/${tableName}/index/${indexName}` as aws.ARN
						),
					})
				}
			}
		}
	},
})
