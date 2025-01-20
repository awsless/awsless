import { PublishOptions, publish } from '@awsless/sns'
import { createProxy } from '../proxy.js'
import { bindGlobalResourceName } from './util.js'

export const getAlertName = bindGlobalResourceName('alert')

export interface AlertResources {}

export const Alert: AlertResources = /*@__PURE__*/ createProxy(name => {
	const topic = getAlertName(name)

	const ctx: Record<string, any> = {
		[topic]: async (
			subject: string,
			payload?: string,
			options: Omit<PublishOptions, 'subject' | 'topic' | 'payload'> = {}
		) => {
			await publish({
				...options,
				topic,
				subject,
				payload,
			})
		},
	}

	const call = ctx[topic]

	return call
})
