import { publish, PublishOptions } from '@awsless/sns'
import { getGlobalResourceName } from './resource.js'
import { createProxy } from './util.js'

export const getTopicName = getGlobalResourceName

export interface TopicResources {}

export const Topic: TopicResources = /*@__PURE__*/ createProxy(name => {
	const topic = getTopicName(name)

	const ctx: Record<string, any> = {
		[topic]: async (payload: unknown, options: Omit<PublishOptions, 'topic' | 'payload'> = {}) => {
			await publish({
				...options,
				topic,
				payload,
			})
		},
	}

	const call = ctx[topic]

	return call
})
