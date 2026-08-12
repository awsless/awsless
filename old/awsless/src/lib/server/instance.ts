import { getCachedQueueUrl, sendMessage, SendMessageOptions } from '@awsless/sqs'
import { constantCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { bindLocalResourceName, STACK } from './util.js'

export const getInstanceQueueName = bindLocalResourceName('instance')

export const getInstanceQueueUrl = (name: string, stack: string = STACK) => {
	return process.env[`INSTANCE_${constantCase(stack)}_${constantCase(name)}_URL`]
}

export interface InstanceResources {}

export const Instance: InstanceResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		const url = getInstanceQueueUrl(name, stack)
		const queue = getInstanceQueueName(name, stack)

		const ctx: Record<string, any> = {
			[queue]: async (
				payload: unknown,
				options: Omit<SendMessageOptions, 'queue' | 'payload' | 'groupId' | 'deduplicationId'> = {}
			) => {
				// Without a stack dependency the producer never receives the queue's
				// URL env var, so fall back to resolving it from the name at runtime.
				const resolved = url ?? (await getCachedQueueUrl(queue))

				return sendMessage({
					...options,
					queue: resolved,
					payload,
					attributes: {
						...(options.attributes ?? {}),
						queueUrl: resolved,
						queueName: queue,
					},
				})
			},
		}

		const send = ctx[queue]
		send.url = url

		return send
	})
})
