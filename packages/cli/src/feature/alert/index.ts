import { randomUUID } from 'crypto'
import { toMilliSeconds, toSeconds } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { Group, Input } from '@terraforge/core'
import { configRefName, isConfigRef } from '../../config/schema/config-ref.js'
import { isEmail } from '../../config/schema/email.js'
import { isPhone } from '../../config/schema/phone.js'
import { ExpectedError } from '../../error.js'
import { defineFeature } from '../../feature.js'
import { plainTestMockTypes, writeResourceTypes } from '../../type-gen/snippets.js'
import { formatGlobalResourceName } from '../../util/name.js'

const typeGenCode = `
import type { PublishOptions } from '@awsless/sns'
import type { Mock } from 'vitest'

type Alert<Name extends string> = {
	readonly name: Name
	(subject: string, payload?: unknown, options?: Omit<PublishOptions, 'subject' | 'topic' | 'payload'>): Promise<void>
}

${plainTestMockTypes()}`

export const alertFeature = defineFeature({
	name: 'alert',
	async onDev(ctx) {
		const ids = Object.keys(ctx.appConfig.alerts ?? {})

		if (ids.length === 0) {
			return
		}

		const { captures, alerts } = await ctx.useSns()

		const names = new Map(
			ids.map(id => [
				formatGlobalResourceName({
					appName: ctx.appConfig.name,
					resourceType: 'alert',
					resourceName: id,
				}),
				id,
			])
		)

		// Alert publishes are notifications for the team, not app events:
		// they stay out of the bundle & land on the dashboard's alert
		// feed instead, like the captured email outbox.
		captures.push(input => {
			const id = names.get(input.TopicArn?.split(':').at(-1) ?? '')

			if (!id) {
				return false
			}

			alerts.unshift({
				id: randomUUID(),
				date: Date.now(),
				alert: id,
				subject: input.Subject,
				message: input.Message,
			})

			// Alerts also land on the homepage problems feed - firing one
			// means something needs attention.
			ctx.emitEvent('problems', {
				date: Date.now(),
				kind: 'alert',
				title: input.Subject ?? id,
				detail: id,
			})

			return true
		})

		for (const [name, id] of names) {
			ctx.registerResource({ kind: 'alert', id, detail: name })
		}
	},
	async onTypeGen(ctx) {
		await writeResourceTypes(ctx, {
			kind: 'alert',
			interfaceName: 'AlertResources',
			code: typeGenCode,
			app(add) {
				for (const alert of Object.keys(ctx.appConfig.alerts ?? {})) {
					const name = formatGlobalResourceName({
						appName: ctx.appConfig.name,
						resourceType: 'alert',
						resourceName: alert,
					})

					add(alert, `Alert<'${name}'>`, `TestMockEntry`)
				}
			},
		})
	},
	onApp(ctx) {
		const topics = new Map<string, Input<string>>()

		for (const [id, endpoints] of Object.entries(ctx.appConfig.alerts ?? {})) {
			const group = new Group(ctx.base, 'alert', id)
			const name = formatGlobalResourceName({
				appName: ctx.appConfig.name,
				resourceType: 'alert',
				resourceName: id,
			})

			const topic = new aws.sns.Topic(
				group,
				'topic',
				{
					name,
				},
				{
					import: ctx.import ? `arn:aws:sns:${ctx.appConfig.region}:${ctx.accountId}:${name}` : undefined,
				}
			)

			topics.set(id, topic.arn)

			for (const endpoint of endpoints) {
				// Private endpoints reference a remote config value & are
				// silently skipped while that value is unset or empty.
				if (isConfigRef(endpoint)) {
					const name = configRefName(endpoint)
					const value = ctx.configValues?.[name]?.trim()

					// Registering the name puts unset endpoints in the missing-config warning.
					ctx.registerConfig(name)

					if (!value) {
						continue
					}

					if (!isEmail(value) && !isPhone(value)) {
						ctx.addWarning({
							message: `The config value "${name}" must be an email address or a phone number.`,
						})
						continue
					}

					new aws.sns.TopicSubscription(group, endpoint.replace(':', '-'), {
						topicArn: topic.arn,
						protocol: isEmail(value) ? 'email' : 'sms',
						endpoint: value,
					})

					continue
				}

				new aws.sns.TopicSubscription(group, endpoint, {
					topicArn: topic.arn,
					protocol: isEmail(endpoint) ? 'email' : 'sms',
					endpoint,
				})
			}
		}

		// ------------------------------------------------------
		// The alarms on the shared bundle lambda.

		const alarms = ctx.appConfig.alarms

		if (alarms) {
			const topic = topics.get(alarms.alert)

			if (!topic) {
				throw new ExpectedError(`The alarms' alert "${alarms.alert}" isn't defined in the app's alerts.`)
			}

			const bundle = ctx.shared.get('bundle', 'main')
			const group = new Group(ctx.base, 'alarm', 'bundle')

			const alarm = (
				id: string,
				props: { description: string; metricName: string; statistic: string; threshold: number }
			) => {
				new aws.cloudwatch.MetricAlarm(group, id, {
					alarmName: formatGlobalResourceName({
						appName: ctx.app.name,
						resourceType: 'alarm',
						resourceName: id,
					}),
					alarmDescription: props.description,
					namespace: 'AWS/Lambda',
					metricName: props.metricName,
					dimensions: { FunctionName: bundle.lambda.functionName },
					statistic: props.statistic,
					period: 60,
					evaluationPeriods: 1,
					threshold: props.threshold,
					comparisonOperator: 'GreaterThanOrEqualToThreshold',
					// A minute without invocations or without throttles is a good one.
					treatMissingData: 'notBreaching',
					alarmActions: [topic],
					okActions: [topic],
				})
			}

			const hasStreams = ctx.stackConfigs.some(stack =>
				Object.values(stack.tables ?? {}).some(table => !!table.stream)
			)

			if (alarms.streamAge && hasStreams) {
				alarm('stream-age', {
					description: `A table stream's oldest unhandled record is ${toSeconds(alarms.streamAge)} seconds old or more.`,
					metricName: 'IteratorAge',
					statistic: 'Maximum',
					threshold: toMilliSeconds(alarms.streamAge),
				})
			}

			if (alarms.throttles) {
				alarm('throttles', {
					description: `The bundle lambda was throttled ${alarms.throttles} times or more in a minute.`,
					metricName: 'Throttles',
					statistic: 'Sum',
					threshold: alarms.throttles,
				})
			}
		}

		ctx.addPermission({
			actions: ['sns:Publish'],
			resources: [
				`arn:aws:sns:${ctx.appConfig.region}:${ctx.accountId}:${formatGlobalResourceName({
					appName: ctx.app.name,
					resourceType: 'alert',
					resourceName: '*',
				})}`,
			],
		})
	},
})
