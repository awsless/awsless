import { z } from 'zod'
import { definePlugin } from '../plugin.js'
import { ResourceIdSchema } from '../schema/resource-id.js'
import { Topic } from '../formation/resource/sns/topic.js'
import { formatName, sub } from '../formation/util.js'
import { TypeGen } from '../util/type-gen.js'
import { Subscription } from '../formation/resource/sns/subscription.js'

const typeGenCode = `
import { PublishOptions } from '@awsless/sns'

type Alert<Name extends string> = {
	readonly name: Name
	(
		subject:string,
		payload?: unknown,
		options?: Omit<PublishOptions, 'topic' | 'payload' | 'subject'>
	): Promise<void>
}`

export const alertPlugin = definePlugin({
	name: 'alert',
	schema: z.object({
		defaults: z
			.object({
				/** Define the alert mails in your app.
				 * @example
				 * {
				 *   alerts: {
				 *     ALERT_NAME: 'example@gmail.com'
				 *   }
				 * }
				 */
				alerts: z.record(ResourceIdSchema, z.string().email()).optional(),
			})
			.default({}),
	}),
	onTypeGen({ config }) {
		const gen = new TypeGen('@awsless/awsless', 'TopicResources')
		gen.addCode(typeGenCode)

		for (const id of Object.keys(config.defaults.alerts ?? {})) {
			const name = formatName(`${config.name}-alert-${id}`)
			gen.addType(id, `Alert<'${name}'>`)
		}

		return gen.toString()
	},
	onApp({ config, bootstrap, bind }) {
		for (const [id, email] of Object.entries(config.defaults.alerts ?? {})) {
			const topic = new Topic(`alert-${id}`, {
				name: `${config.name}-alert-${id}`,
			})

			const subscription = new Subscription(`alert-${id}`, {
				topicArn: topic.arn,
				protocol: 'email',
				endpoint: email,
			}).dependsOn(topic)

			bootstrap.add(topic, subscription)
		}

		bind(lambda => {
			lambda.addPermissions({
				actions: ['sns:Publish'],
				resources: [
					sub('arn:${AWS::Partition}:sns:${AWS::Region}:${AWS::AccountId}:${app}-${type}-*', {
						app: config.name,
						type: 'alert',
					}),
				],
			})
		})
	},
})
