import { sendMessage, sendMessageBatch, SendMessageOptions, SendMessageBatchOptions, BatchItem } from "@awsless/sqs"
import { STACK, getLocalResourceName } from "./resource"
import { createProxy } from "./util"
import { constantCase } from "change-case"

export const getQueueName = getLocalResourceName

export const getQueueUrl = (name: string, stack:string = STACK) => {
	return process.env[`QUEUE_${ constantCase(stack) }_${ constantCase(name) }_URL`]!
}

export interface QueueResources {}

export const Queue:QueueResources = createProxy((stack) => {
	return createProxy((queue) => {
		const url = getQueueUrl(queue, stack)

		const send = (payload:unknown, options:Omit<SendMessageOptions, 'queue' | 'payload'> = {}) => {
			return sendMessage({
				...options,
				queue: url,
				payload,
			})
		}

		send.url = url
		send.name = getQueueName(queue, stack)
		send.batch = (items:BatchItem[], options:Omit<SendMessageBatchOptions, 'queue' | 'items'> = {}) => {
			return sendMessageBatch({
				...options,
				queue: url,
				items,
			})
		}

		return send
	})
})
