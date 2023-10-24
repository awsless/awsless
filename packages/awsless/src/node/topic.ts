import { publish, PublishOptions } from '@awsless/sns'
import { getGlobalResourceName } from './resource.js'
import { createProxy } from './util.js'

export const getTopicName = getGlobalResourceName

export interface TopicResources {}

export const Topic:TopicResources = /*@__PURE__*/ createProxy((topic) => {
	const name = getTopicName(topic)

	const ctx: Record<string, any> = {
		[ name ]: (payload:unknown, options:Omit<PublishOptions, 'topic' | 'payload'> = {}) => {
			return publish({
				...options,
				topic: name,
				payload,
			})
		}
	}

	const call = ctx[name]

	return call
})
