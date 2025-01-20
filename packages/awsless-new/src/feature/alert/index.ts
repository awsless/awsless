import { aws, Node } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatGlobalResourceName } from '../../util/name.js'

const typeGenCode = `
import type { PublishOptions } from '@awsless/sns'

type Publish<Name extends string> = {
	readonly name: Name
	(payload: string, options?: Omit<PublishOptions, 'topic' | 'payload'>): Promise<void>
}
`

export const alertFeature = defineFeature({
	name: 'alert',
	async onTypeGen(ctx) {
		const gen = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const alert of Object.keys(ctx.appConfig.defaults.alerts ?? {})) {
			const name = formatGlobalResourceName({
				appName: ctx.appConfig.name,
				resourceType: 'alert',
				resourceName: alert,
			})

			resources.addType(alert, `Publish<'${name}'>`)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('AlertResources', resources)

		await ctx.write('alert.d.ts', gen, true)
	},
	onApp(ctx) {
		for (const [id, emails] of Object.entries(ctx.appConfig.defaults.alerts ?? {})) {
			const group = new Node(ctx.base, 'topic', id)
			const name = formatGlobalResourceName({
				appName: ctx.appConfig.name,
				resourceType: 'alert',
				resourceName: id,
			})

			const topic = new aws.sns.Topic(group, 'topic', {
				name,
			})

			for (const email of emails) {
				new aws.sns.Subscription(group, id, {
					topicArn: topic.arn,
					protocol: 'email',
					endpoint: email,
				})
			}
		}

		ctx.onAppPolicy(policy => {
			// Give access to all app functions
			policy.addStatement({
				actions: ['sns:Publish'],
				resources: [
					`arn:aws:sns:${ctx.appConfig.region}:${ctx.accountId}:${formatGlobalResourceName({
						appName: ctx.app.name,
						resourceType: 'alert',
						resourceName: '*',
					})}`,
				],
			})
		})
	},
})
