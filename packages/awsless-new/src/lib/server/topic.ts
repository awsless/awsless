import { publish, PublishOptions } from '@awsless/sns'
import { createProxy } from '../proxy.js'
import { bindGlobalResourceName } from './util.js'

export const getTopicName = bindGlobalResourceName('topic')

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
