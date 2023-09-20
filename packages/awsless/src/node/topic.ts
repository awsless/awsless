import { publish, PublishOptions } from '@awsless/sns'
import { getGlobalResourceName } from "./resource"
import { createProxy } from "./util"

export const getTopicName = getGlobalResourceName

export interface TopicResources {}

export const Topic:TopicResources = createProxy((topic) => {
	const name = getTopicName(topic)
	const call = (payload:unknown, options:Omit<PublishOptions, 'topic' | 'payload'> = {}) => {
		return publish({
			...options,
			topic: name,
			payload,
		})
	}

	call.name = name

	return call
})
