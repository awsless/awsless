import { formatGlobalResourceName } from '../../util/name.js'
import { defineFeature } from '../../feature.js'
import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { createLambdaFunction } from '../function/util.js'
import { createPrebuildLambdaFunction } from '../function/prebuild.js'
import { join } from 'node:path'
import { mebibytes } from '@awsless/size'
import { days, toSeconds } from '@awsless/duration'

export const onFailureFeature = defineFeature({
	name: 'on-failure',
	onApp(ctx) {
		const group = new Group(ctx.base, 'on-failure', 'main')

		// ----------------------------------------------------------------
		// Create a deadletter as last resort to all failing on-failure
		// tasks

		const deadletter = new aws.sqs.Queue(group, 'deadletter', {
			name: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'on-failure',
				resourceName: 'deadletter',
			}),
			messageRetentionSeconds: toSeconds(days(14)),
		})

		// ----------------------------------------------------------------
		// Create a single on-failure queue to capture all failed queue
		// jobs

		const queue = new aws.sqs.Queue(group, 'on-failure', {
			name: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'on-failure',
				resourceName: 'failure',
			}),
			redrivePolicy: deadletter.arn.pipe(deadLetterTargetArn => {
				return JSON.stringify({
					deadLetterTargetArn,
					maxReceiveCount: 3,
				})
			}),
		})

		ctx.shared.set('on-failure', 'queue-arn', queue.arn)

		// ----------------------------------------------------------------
		// Create a s3 bucket to capture all lambda failures

		/*
			Async lambda's errors will saved like:
			aws/lambda/async/<function-name>/YYYY/MM/DD/YYYY-MM-DDTHH.MM.SS-<UUID>

			DynamoDB Stream error:
			aws/lambda/<UUID>/<shard-id>/YYYY/MM/DD/YYYY-MM-DDTHH.MM.SS-<UUID>
		*/

		const bucket = new aws.s3.Bucket(group, 'bucket', {
			bucket: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'on-failure',
				resourceName: 'failure',
				postfix: ctx.appId,
			}),
			lifecycleRule: [
				{
					id: 'ttl',
					enabled: true,
					expiration: {
						days: 14,
					},
				},
			],
		})

		ctx.shared.set('on-failure', 'bucket-arn', bucket.arn)

		// ----------------------------------------------------------------

		const props = ctx.appConfig.defaults.onFailure

		if (props) {
			// ------------------------------------------------
			// Create the consumer lambda

			const consumer = createLambdaFunction(group, ctx, 'on-failure', 'consumer', props)

			// Deny calling other functions to stop circular loop problems
			consumer.addPermission({
				effect: 'deny',
				actions: [
					//
					'lambda:InvokeFunction',
					'lambda:InvokeAsync',
					'sqs:SendMessage',
					'sns:Publish',
				],
				resources: ['*'],
			})

			// ------------------------------------------------
			// Create the normalizer lambda

			const prebuild = createPrebuildLambdaFunction(group, ctx, 'on-failure', 'normalizer', {
				bundleFile: join(__dirname, '/prebuild/on-failure/bundle.zip'),
				bundleHash: join(__dirname, '/prebuild/on-failure/HASH'),
				memorySize: mebibytes(256),
				timeout: props.timeout,
				handler: 'index.default',
				runtime: 'nodejs24.x',
				log: {
					format: 'json',
					level: 'warn',
					retention: days(3),
					system: 'warn',
				},
			})

			prebuild.setEnvironment('CONSUMER', consumer.name)

			prebuild.addPermission({
				actions: ['lambda:InvokeFunction'],
				resources: [consumer.lambda.arn],
			})

			prebuild.addPermission({
				actions: ['s3:GetObject', 's3:DeleteObject'],
				resources: [bucket.arn, $interpolate`${bucket.arn}/*`],
			})

			// ------------------------------------------------
			// Send any on-failure processing failures to the
			// deadletter

			prebuild.addPermission({
				actions: ['sqs:SendMessage'],
				resources: [deadletter.arn],
			})

			new aws.lambda.FunctionEventInvokeConfig(
				group,
				'on-failure',
				{
					functionName: prebuild.lambda.arn,
					maximumRetryAttempts: 2,
					destinationConfig: {
						onFailure: {
							destination: deadletter.arn,
						},
					},
				},
				{
					dependsOn: [prebuild.policy],
				}
			)

			// ------------------------------------------------
			// Link prebuild lambda to on-failure queue.

			prebuild.addPermission({
				actions: [
					'sqs:SendMessage',
					'sqs:DeleteMessage',
					'sqs:ReceiveMessage',
					'sqs:GetQueueUrl',
					'sqs:GetQueueAttributes',
				],
				resources: [queue.arn],
			})

			new aws.lambda.EventSourceMapping(
				group,
				'on-failure',
				{
					functionName: prebuild.lambda.functionName,
					eventSourceArn: queue.arn,
					batchSize: 10,
				},
				{
					dependsOn: [prebuild.policy],
				}
			)

			// ------------------------------------------------
			// Link lambda to bucket notifications

			new aws.lambda.Permission(group, 'permission', {
				action: 'lambda:InvokeFunction',
				principal: 's3.amazonaws.com',
				functionName: prebuild.lambda.functionName,
				sourceArn: bucket.arn,
			})

			new aws.s3.BucketNotification(group, 'notification', {
				bucket: bucket.bucket,
				lambdaFunction: [
					{
						lambdaFunctionArn: prebuild.lambda.arn,
						events: ['s3:ObjectCreated:*'],
					},
				],
			})
		}
	},
})
