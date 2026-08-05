import { APP, getCurrentRoute, getStack, internalInvoke } from 'awsless'
import { getValue } from './shared'

export const echo = (event: unknown) => ({ stack: getStack(), event })

export const app = () => APP

export const nested = async () => {
	const inner = await internalInvoke('stack-1:function:echo', { from: 'nested' })

	return { stack: getStack(), inner }
}

export const parallel = async () => {
	return Promise.all([
		internalInvoke('stack-1:function:dependent', {}),
		internalInvoke('stack-2:function:dependent', {}),
	])
}

export const special = () => {
	return internalInvoke('stack-1:function:echo', {
		bigint: 123n,
		date: new Date('2026-01-02T03:04:05.000Z'),
	})
}

export const errorResponse = () => ({
	__error__: {
		type: 'test',
		message: 'Expected failure',
	},
})

export const nestedError = () => internalInvoke('stack-1:function:error', {})

export const site = (event: unknown) => event

export const queue = (event: unknown) => ({
	stack: getStack(),
	throwExpectedErrors: process.env.THROW_EXPECTED_ERRORS,
	event,
})

export const topic = queue

export const badTopic = () => {
	throw new Error('solo subscriber')
}

export const dependent = () => ({
	stack: getStack(),
	route: getCurrentRoute(),
	value: getValue(),
})
