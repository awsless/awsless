import { stringify } from '@awsless/json'
import { publish, PublishOptions } from '@awsless/sns'
import { GenericSchema, InferInput, parse } from '@awsless/validate'
import { createProxy } from '../proxy.js'
import { bindGlobalResourceName } from './util.js'

export const getTopicName = bindGlobalResourceName('topic')

type PublishTopicOptions = Omit<PublishOptions, 'topic' | 'payload'>

// The validated publish function, carrying its name & schema so
// h.subscribe derives the typed consumer from it.
export type TopicDefinition<S extends GenericSchema = GenericSchema> = {
	(payload: InferInput<S>, options?: PublishTopicOptions): Promise<void>
	readonly name: string
	readonly schema: S
}

export interface TopicResources {}

// Publishing only happens through a defined topic, so every message is
// validated at the source & the subscriber shares the same contract.
export const Topic: TopicResources = /*@__PURE__*/ createProxy(name => {
	const topic = getTopicName(name)

	return {
		name: topic,
		define<S extends GenericSchema>(schema: S): TopicDefinition<S> {
			const publisher = async (payload: InferInput<S>, options: PublishTopicOptions = {}) => {
				// Publish the raw input: the subscriber runs the same schema, so
				// a transforming schema must only apply once, on the consuming side.
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
