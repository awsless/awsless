import { defineFeature } from '../../feature.js'
import { createAsyncLambdaFunction } from '../function/util.js'
import { createPrebuildLambdaFunction } from '../function/prebuild.js'
import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { join } from 'path'
import { mebibytes } from '@awsless/size'
import { days, seconds } from '@awsless/duration'

export const onErrorLogFeature = defineFeature({
	name: 'on-error-log',
	onApp(ctx) {
		const group = new Group(ctx.base, 'on-error-log', 'main')

		// ------------------------------------------------
		// Create the subscriber lambda (prebuild)

		const prebuild = createPrebuildLambdaFunction(group, ctx, 'on-error-log', 'subscriber', {
			bundleFile: join(__dirname, '/prebuild/on-error-log/bundle.zip'),
			bundleHash: join(__dirname, '/prebuild/on-error-log/HASH'),
			memorySize: mebibytes(256),
			timeout: seconds(10),
			handler: 'index.default',
			runtime: 'nodejs24.x',
			log: {
				format: 'json',
				level: 'warn',
				retention: days(3),
				system: 'warn',
			},
		})

		const onFailure = ctx.shared.get('on-failure', 'bucket-arn')
		new aws.lambda.FunctionEventInvokeConfig(
			group,
			'on-error-log',
			{
				functionName: prebuild.lambda.arn,
				maximumRetryAttempts: 2,
				destinationConfig: {
					onFailure: {
						destination: onFailure,
					},
				},
			},
			{
				dependsOn: [prebuild.policy],
			}
		)

		prebuild.addPermission({
			actions: ['s3:PutObject', 's3:ListBucket'],
			resources: [onFailure, $interpolate`${onFailure}/*`],
			conditions: {
				StringEquals: {
					// This will protect anyone from taking our bucket name,
					// and us sending our failed items to the wrong s3 bucket
					's3:ResourceAccount': ctx.accountId,
				},
			},
		})

		ctx.shared.set('on-error-log', 'subscriber-arn', prebuild.lambda.arn)

		// ------------------------------------------------
		// Grant CloudWatch Logs permission to invoke the subscriber

		new aws.lambda.Permission(group, 'permission', {
			action: 'lambda:InvokeFunction',
			principal: 'logs.amazonaws.com',
			functionName: prebuild.lambda.functionName,
			sourceArn: `arn:aws:logs:${ctx.appConfig.region}:${ctx.accountId}:log-group:/aws/*/${ctx.app.name}--*`,
		})

		// ------------------------------------------------
		// Create the consumer lambda (customer's handler)

		if (ctx.appConfig.defaults.onErrorLog) {
			const consumer = createAsyncLambdaFunction(
				group,
				ctx,
				'on-error-log',
				'consumer',
				ctx.appConfig.defaults.onErrorLog
			)

			prebuild.setEnvironment('CONSUMER', consumer.name)
		}
	},
})
