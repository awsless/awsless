import { stringify } from '@awsless/json'
import { publish, PublishOptions } from '@awsless/sns'
import { GenericSchema, InferInput, parse } from '@awsless/validate'
import { createProxy } from '../proxy.js'
import { bindGlobalResourceName } from './util.js'

export const getTopicName = bindGlobalResourceName('topic')

type PublishTopicOptions = Omit<PublishOptions, 'topic' | 'payload'>

// A defined topic: the validated publish function, carrying its name &
// schema so h.subscribe derives the typed consumer from it.
export type TopicDefinition<S extends GenericSchema = GenericSchema> = {
	(payload: InferInput<S>, options?: PublishTopicOptions): Promise<void>
	readonly name: string
	readonly schema: S
}

export interface TopicResources {}

// The payload schema lives with the topic: publishing only happens
// through a defined topic, so every message is validated at the source
// & the subscriber shares the exact same contract.
//
//   export const taskCreated = Topic.createTask.define(v.object({ ... }))
//   await taskCreated({ ... })
//   export default h.subscribe(taskCreated, tasks => { ... })
export const Topic: TopicResources = /*@__PURE__*/ createProxy(name => {
	const topic = getTopicName(name)

	return {
		name: topic,
		define<S extends GenericSchema>(schema: S): TopicDefinition<S> {
			const publisher = async (payload: InferInput<S>, options: PublishTopicOptions = {}) => {
				// Validate at the source, but publish the raw input: the
				// subscriber runs the same schema over the wire value, so a
				// transforming schema must only apply once - on the
				// consuming side. Publishing the transformed output would
				// feed it back through the schema's input checks.
				parse(schema, payload)

				await publish({
					...options,
					topic,
					payload: stringify(payload),
				})
			}

			Object.defineProperty(publisher, 'name', { value: topic })
			Object.defineProperty(publisher, 'schema', { value: schema })

			return publisher as TopicDefinition<S>
		},
	}
})
