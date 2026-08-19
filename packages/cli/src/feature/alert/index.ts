import { randomUUID } from 'crypto'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { configRefName, isConfigRef } from '../../config/schema/config-ref.js'
import { isEmail } from '../../config/schema/email.js'
import { isPhone } from '../../config/schema/phone.js'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatGlobalResourceName } from '../../util/name.js'

const typeGenCode = `
import type { PublishOptions } from '@awsless/sns'
import type { Mock } from 'vitest'

type Alert<Name extends string> = {
	readonly name: Name
	(subject: string, payload?: unknown, options?: Omit<PublishOptions, 'subject' | 'topic' | 'payload'>): Promise<void>
}

type MockHandle = (payload: unknown) => void
type MockBuilder = (handle?: MockHandle) => void

// Calling overrides the implementation & the same value works as the
// vitest mock inside expect().
type TestMockEntry = MockBuilder & Mock<(payload: unknown) => unknown>
`

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
		const gen = new TypeFile('awsless')
		const resources = new TypeObject(1)
		const testMocks = new TypeObject(2)

		for (const alert of Object.keys(ctx.appConfig.alerts ?? {})) {
			const name = formatGlobalResourceName({
				appName: ctx.appConfig.name,
				resourceType: 'alert',
				resourceName: alert,
			})

			resources.addType(alert, `Alert<'${name}'>`)
			testMocks.addType(alert, `TestMockEntry`)
		}

		const testMock = new TypeObject(1)
		testMock.addType('alert', testMocks)

		gen.addCode(typeGenCode)
		gen.addInterface('AlertResources', resources)
		gen.addInterface('TestMock', testMock)

		await ctx.write('alert.d.ts', gen, true)
	},
	onApp(ctx) {
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
