import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { isEmail } from '../../config/schema/email.js'
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

			const topic = new aws.sns.Topic(group, 'topic', {
				name,
			})

			for (const endpoint of endpoints) {
				new aws.sns.TopicSubscription(group, endpoint, {
					topicArn: topic.arn,
					protocol: isEmail(endpoint) ? 'email' : 'sms',
					endpoint,
				})
			}
		}

		ctx.addGlobalPermission({
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
