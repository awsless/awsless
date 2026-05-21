import { sendMessage, SendMessageOptions } from '@awsless/sqs'
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
			[queue]: (
				payload: unknown,
				options: Omit<SendMessageOptions, 'queue' | 'payload' | 'groupId' | 'deduplicationId'> = {}
			) => {
				return sendMessage({
					...options,
					queue: url ?? queue,
					payload,
					attributes: {
						...(options.attributes ?? {}),
						...(url ? { queueUrl: url } : {}),
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
