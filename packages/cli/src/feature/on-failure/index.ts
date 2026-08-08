import { days, toSeconds } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { createLambdaFunctionFromZip, registerFunctionBuild } from '../function/util.js'

export const onFailureFeature = defineFeature({
	name: 'on-failure',
	onBefore(ctx) {
		const props = ctx.appConfig.defaults.onFailure

		if (!props) {
			return
		}

		const group = new Group(ctx.base, 'on-failure', 'main')

		// ----------------------------------------------------------------
		// Create a deadletter as last resort to all failing on-failure tasks

		const deadletter = new aws.sqs.Queue(group, 'deadletter', {
			name: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'on-failure',
				resourceName: 'deadletter',
			}),
			messageRetentionSeconds: toSeconds(days(14)),
		})

		// ----------------------------------------------------------------

		const handlerTimeout = toSeconds(props.consumer.timeout ?? ctx.appConfig.defaults.function.timeout)
		const queue = new aws.sqs.Queue(group, 'on-failure', {
			name: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'on-failure',
				resourceName: 'failure',
			}),
			visibilityTimeoutSeconds: handlerTimeout * 2,
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

		ctx.shared.set('on-failure', 'resources', {
			group,
			bucket,
			queue,
		})

		const notify = props.notify

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

		const { group, bucket, queue } = ctx.shared.get('on-failure', 'resources')

		const name = formatGlobalResourceName({
			appName: ctx.app.name,
			resourceType: 'on-failure',
			resourceName: 'handler',
		})

		const consumer = props.consumer

		const build = registerFunctionBuild(ctx, name, {
			code: consumer.code,
			handler: consumer.handler,
			wrapper: join(dirname(fileURLToPath(import.meta.url)), '/handlers/on-failure.js'),
		})

		const handler = createLambdaFunctionFromZip(group, ctx, 'on-failure', 'handler', {
			zipFile: build.zipFile,
			sourceHash: build.sourceHash,
			runtime: 'nodejs24.x',
			handler: 'index.default',
			memorySize: consumer.memorySize ?? ctx.appConfig.defaults.function.memorySize,
			timeout: consumer.timeout ?? ctx.appConfig.defaults.function.timeout,
			architecture: consumer.architecture ?? ctx.appConfig.defaults.function.architecture,
			vpc: consumer.vpc,
			log: {
				format: consumer.log?.format ?? 'json',
				level: consumer.log?.level ?? 'warn',
				system: consumer.log?.system ?? 'warn',
				retention: consumer.log?.retention ?? days(3),
			},
		})

		// The consumer runs with the same env & permissions it had
		// inside the bundle.
		ctx.onEnv(build.addEnv)
		ctx.onBind(build.addEnv)
		ctx.onPermission(statement => handler.addPermission(statement))

		// Deny calling other functions to stop circular loop problems,
		// while sns:Publish stays open so the consumer can alert.
		handler.addPermission({
			effect: 'deny',
			actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync', 'sqs:SendMessage'],
			resources: ['*'],
		})

		handler.addPermission(
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

		new aws.lambda.EventSourceMapping(
			group,
			'on-failure',
			{
				functionName: handler.lambda.arn,
				eventSourceArn: queue.arn,
				batchSize: 10,
			},
			{
				dependsOn: [handler.policy],
			}
		)

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

		// The bucket arn is only shared after the handler exists, so the
		// handler itself never receives an async on-failure destination &
		// can't feed its own failures back into the bucket it consumes.
		ctx.shared.set('on-failure', 'bucket-arn', bucket.arn)
	},
})
