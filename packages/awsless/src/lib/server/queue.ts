import {
	BatchItem,
	sendMessage,
	sendMessageBatch,
	SendMessageBatchOptions,
	SendMessageOptions,
} from '@awsless/sqs'
import { constantCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { bindLocalResourceName, STACK } from './util.js'

const bindQueueBaseName = bindLocalResourceName('queue')

export const getQueueName = (name: string, stack: string = STACK) => {
	return `${bindQueueBaseName(name, stack)}.fifo`
}

export const getQueueUrl = (name: string, stack: string = STACK) => {
	return process.env[`QUEUE_${constantCase(stack)}_${constantCase(name)}_URL`]
}

export interface QueueResources {}

export const Queue: QueueResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(queue => {
		const url = getQueueUrl(queue, stack)
		const name = getQueueName(queue, stack)

		const ctx: Record<string, any> = {
			[name]: (payload: unknown, options: Omit<SendMessageOptions, 'queue' | 'payload'>) => {
				return sendMessage({
					...options,
					queue: url ?? name,
					payload,
					attributes: {
						...(options.attributes ?? {}),
						...(url ? { queueUrl: url } : {}),
						queueName: name,
					},
				})
			},
		}

		const send = ctx[name]
		send.url = url

		send.batch = (items: BatchItem[], options: Omit<SendMessageBatchOptions, 'queue' | 'items'> = {}) => {
			return sendMessageBatch({
				...options,
				queue: url ?? name,
				items: items.map(item => ({
					...item,
					attributes: {
						...(item.attributes ?? {}),
						...(url ? { queueUrl: url } : {}),
						queueName: name,
					},
				})),
			})
		}

		return send
	})
})
