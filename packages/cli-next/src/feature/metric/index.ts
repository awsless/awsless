import { Group, Output } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'
import { registerBundleFunction, formatRouteKey } from '../bundle/util.js'
import { kebabCase, constantCase } from 'change-case'
import { toSeconds } from '@awsless/duration'

const typeGenCode = `
import { type PutDataProps, putData, batchPutData } from '@awsless/cloudwatch'
import { type Duration } from '@awsless/duration'
import { type Size } from '@awsless/size'

type PutResponse = ReturnType<typeof putData>
type Batch = typeof batchPutData

type MetricBase<NS extends string, N extends string> = {
	readonly namespace: NS
	readonly name: N
}

type NumberMetric = {
	readonly unit: 'number'
	put(value: number | number[], options?: PutDataProps): PutResponse
}

type DurationMetric = {
	readonly unit: 'duration'
	put(value: Duration | Duration[], options?: PutDataProps): PutResponse
}

type SizeMetric = {
	readonly unit: 'size'
	put(value: Size | Size[], options?: PutDataProps): PutResponse
}
`

export const metricFeature = defineFeature({
	name: 'metric',
	async onTypeGen(ctx) {
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)

		for (const stack of ctx.stackConfigs ?? []) {
			const namespace = `awsless/${kebabCase(ctx.appConfig.name)}/${kebabCase(stack.name)}`
			const stackResources = new TypeObject(2)

			for (const [id, metric] of Object.entries(stack.metrics ?? {})) {
				const name = kebabCase(id)
				const types = {
					number: 'NumberMetric',
					duration: 'DurationMetric',
					size: 'SizeMetric',
				}

				stackResources.addType(id, `MetricBase<'${namespace}', '${name}'> & ${types[metric.type]}`)
			}

			resources.addType(stack.name, stackResources)
		}

		resources.addType('batch', 'Batch')

		gen.addCode(typeGenCode)
		gen.addInterface('MetricResources', resources)

		await ctx.write('metric.d.ts', gen, true)
	},
	onStack(ctx) {
		const bundle = ctx.shared.get('bundle', 'main')
		const namespace = `awsless/${kebabCase(ctx.app.name)}/${kebabCase(ctx.stack.name)}`

		// --------------------------------------------
		// Add function permissions to PutMetricData
		// Sadly we can't be specific about the metric
		// because metric's don't have a ARN.

		ctx.addGlobalPermission({
			actions: ['cloudwatch:PutMetricData'],
			resources: ['*'],
			conditions: {
				StringEquals: {
					// Luckily we can limit access to only the namespace.
					'cloudwatch:namespace': namespace,
				},
			},
		})

		for (const [id, props] of Object.entries(ctx.stackConfig.metrics ?? {})) {
			const group = new Group(ctx.stack, 'metric', id)

			ctx.addEnv(`METRIC_${constantCase(ctx.stack.name)}_${constantCase(id)}`, props.type)

			for (const alarmId in props.alarms ?? []) {
				const alarmGroup = new Group(group, 'alarm', alarmId)
				const alarmName = kebabCase(`${id}-${alarmId}`)
				const alarmProps = props.alarms![alarmId]!

				let alarmAction: Output<string>
				let invokesBundle = false

				if (Array.isArray(alarmProps.trigger)) {
					// ----------------------------------------
					// create email sns trigger

					const topic = new aws.sns.Topic(alarmGroup, 'alarm-trigger', {
						name: formatLocalResourceName({
							appName: ctx.app.name,
							stackName: ctx.stack.name,
							resourceType: 'metric',
							resourceName: alarmName,
						}),
					})

					alarmAction = topic.arn

					for (const email of alarmProps.trigger) {
						new aws.sns.TopicSubscription(alarmGroup, email, {
							topicArn: topic.arn,
							protocol: 'email',
							endpoint: email,
						})
					}
				} else {
					// ----------------------------------------
					// add lambda function trigger to the bundle

					const trigger = alarmProps.trigger
					const routeKey = formatRouteKey(ctx.stack.name, 'metric', alarmName)

					registerBundleFunction(ctx, routeKey, trigger)

					invokesBundle = true
					alarmAction = bundle.alias.arn
				}

				// ----------------------------------------

				const alarm = new aws.cloudwatch.MetricAlarm(alarmGroup, 'alarm', {
					namespace,
					metricName: kebabCase(id),
					alarmName: formatLocalResourceName({
						appName: ctx.app.name,
						stackName: ctx.stack.name,
						resourceType: 'metric',
						resourceName: alarmName,
					}),
					alarmDescription: alarmProps.description,
					statistic: alarmProps.where.stat,
					threshold: alarmProps.where.value,
					period: toSeconds(alarmProps.period),
					evaluationPeriods: alarmProps.minDataPoints,
					comparisonOperator: alarmProps.where.op,
					alarmActions: [alarmAction],
				})

				if (invokesBundle) {
					new aws.lambda.Permission(alarmGroup, 'permission', {
						action: 'lambda:InvokeFunction',
						principal: 'lambda.alarms.cloudwatch.amazonaws.com',
						functionName: bundle.lambda.functionName,
						qualifier: bundle.alias.name,
						sourceAccount: ctx.accountId,
						sourceArn: alarm.arn,
					})
				}
			}
		}
	},
})
