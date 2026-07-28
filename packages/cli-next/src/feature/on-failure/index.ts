import { days, toSeconds } from '@awsless/duration'
import { mebibytes } from '@awsless/size'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { formatRouteKey, registerBundleFunction } from '../bundle/util.js'
import { createPrebuildLambdaFunction } from '../function/prebuild.js'

export const onFailureFeature = defineFeature({
	name: 'on-failure',
	onBefore(ctx) {
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
		// Create a single on-failure queue to feed all failure bucket
		// notifications into the bundle

		const bundleTimeout = toSeconds(ctx.appConfig.defaults.function.timeout)
		const queue = new aws.sqs.Queue(group, 'on-failure', {
			name: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'on-failure',
				resourceName: 'failure',
			}),
			visibilityTimeoutSeconds: bundleTimeout * 6,
			redrivePolicy: deadletter.arn.pipe(deadLetterTargetArn => {
				return JSON.stringify({
					deadLetterTargetArn,
					maxReceiveCount: 3,
				})
			}),
		})

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
		ctx.shared.set('on-failure', 'resources', {
			group,
			bucket,
			queue,
		})

		const notify = ctx.appConfig.defaults.onFailure?.notify

		if (notify) {
			const topic = new aws.sns.Topic(group, 'deadletter-topic', {
				name: formatGlobalResourceName({
					appName: ctx.app.name,
					resourceType: 'on-failure',
					resourceName: 'deadletter',
				}),
			})

			for (const email of notify) {
				new aws.sns.TopicSubscription(group, email, {
					topicArn: topic.arn,
					protocol: 'email',
					endpoint: email,
				})
			}

			const role = new aws.iam.Role(group, 'deadletter-topic-role', {
				name: formatGlobalResourceName({
					appName: ctx.app.name,
					resourceType: 'on-failure',
					resourceName: 'pipe',
				}),
				description: `${ctx.app.name} on-failure deadletter notification pipe`,
				assumeRolePolicy: JSON.stringify({
					Version: '2012-10-17',
					Statement: [
						{
							Effect: 'Allow',
							Action: 'sts:AssumeRole',
							Principal: {
								Service: ['pipes.amazonaws.com'],
							},
						},
					],
				}),
				inlinePolicy: [
					{
						name: 'deadletter-topic',
						policy: topic.arn.pipe(topicArn =>
							deadletter.arn.pipe(queueArn =>
								JSON.stringify({
									Version: '2012-10-17',
									Statement: [
										{
											Effect: 'Allow',
											Action: [
												'sqs:ReceiveMessage',
												'sqs:DeleteMessage',
												'sqs:GetQueueAttributes',
												'sqs:ChangeMessageVisibility',
											],
											Resource: queueArn,
										},
										{
											Effect: 'Allow',
											Action: ['sns:Publish'],
											Resource: topicArn,
										},
									],
								})
							)
						),
					},
				],
			})

			new aws.pipes.Pipe(group, 'deadletter-topic-pipe', {
				name: formatGlobalResourceName({
					appName: ctx.app.name,
					resourceType: 'on-failure',
					resourceName: 'notify',
				}),
				roleArn: role.arn,
				source: deadletter.arn,
				target: topic.arn,
				sourceParameters: {
					sqsQueueParameters: {
						batchSize: 1,
					},
				},
				targetParameters: {
					inputTemplate: [
						`Awsless on-failure DLQ message`,
						`App: ${ctx.app.name}`,
						`Sent: <$.attributes.SentTimestamp>`,
						'',
						`Body:\n<$.body>`,
					].join('\n'),
				},
			})
		}
	},
	onApp(ctx) {
		const props = ctx.appConfig.defaults.onFailure

		if (!props) {
			return
		}

		const bundle = ctx.shared.get('bundle', 'main')
		const { group, bucket, queue } = ctx.shared.get('on-failure', 'resources')

		// The consumer runs inside the bundle like every other function.
		registerBundleFunction(ctx, formatRouteKey('base', 'on-failure', 'consumer'), props.consumer)

		// ----------------------------------------------------------------
		// The failure queue feeds a separate lambda that formats every
		// failure event & invokes the consumer inside the live bundle.
		// Keeping the bundle out of the failure path prevents a failing
		// bundle from recursively consuming its own failures.

		const distDir = dirname(fileURLToPath(import.meta.url))

		const handler = createPrebuildLambdaFunction(group, ctx, 'on-failure', 'handler', {
			bundleFile: join(distDir, '/prebuild/on-failure/bundle.zip'),
			bundleHash: join(distDir, '/prebuild/on-failure/HASH'),
			runtime: 'nodejs24.x',
			handler: 'index.default',
			memorySize: mebibytes(256),

			// The consumer invoke is synchronous, so the handler needs at
			// least the same timeout as the bundle.
			timeout: ctx.appConfig.defaults.function.timeout,

			log: {
				format: 'json',
				level: 'warn',
				system: 'warn',
				retention: days(3),
			},
		})

		handler.addPermission(
			{
				actions: ['lambda:InvokeFunction'],
				resources: [bundle.alias.arn],
			},
			{
				actions: ['s3:GetObject', 's3:DeleteObject'],
				resources: [$interpolate`${bucket.arn}/*`],
			},
			{
				actions: [
					'sqs:DeleteMessage',
					'sqs:ReceiveMessage',
					'sqs:GetQueueAttributes',
					'sqs:ChangeMessageVisibility',
				],
				resources: [queue.arn],
			}
		)

		new aws.lambda.EventSourceMapping(group, 'on-failure', {
			functionName: handler.lambda.arn,
			eventSourceArn: queue.arn,
			batchSize: 10,
		}, {
			dependsOn: [handler.policy],
		})

		const queuePolicy = new aws.sqs.QueuePolicy(group, 'bucket-notification', {
			queueUrl: queue.url,
			policy: $resolve([queue.arn, bucket.arn], (queueArn, bucketArn) => {
				return JSON.stringify({
					Version: '2012-10-17',
					Statement: [
						{
							Effect: 'Allow',
							Principal: {
								Service: 's3.amazonaws.com',
							},
							Action: 'sqs:SendMessage',
							Resource: queueArn,
							Condition: {
								ArnEquals: {
									'aws:SourceArn': bucketArn,
								},
								StringEquals: {
									'aws:SourceAccount': ctx.accountId,
								},
							},
						},
					],
				})
			}),
		})

		new aws.s3.BucketNotification(
			group,
			'notification',
			{
				bucket: bucket.bucket,
				queue: [
					{
						queueArn: queue.arn,
						events: ['s3:ObjectCreated:*'],
					},
				],
			},
			{ dependsOn: [queuePolicy] }
		)
	},
})
