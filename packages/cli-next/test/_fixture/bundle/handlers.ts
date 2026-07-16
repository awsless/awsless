import { getCurrentRoute, getStack, invokeRoute } from 'awsless'
import { getValue } from './shared'

export const echo = (event: unknown) => ({ stack: process.env.STACK, event })

export const nested = async () => {
	const inner = await invokeRoute('stack-1:function:echo', { from: 'nested' })

	return { stack: process.env.STACK, inner }
}

export const parallel = async () => {
	return Promise.all([
		invokeRoute('stack-1:function:dependent', {}),
		invokeRoute('stack-2:function:dependent', {}),
	])
}

export const special = () => {
	return invokeRoute('stack-1:function:echo', {
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

export const nestedError = () => invokeRoute('stack-1:function:error', {})

export const site = (event: unknown) => event

export const queue = (event: unknown) => ({
	stack: process.env.STACK,
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
