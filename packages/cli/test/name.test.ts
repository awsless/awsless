import { describe, expect, it } from 'vitest'
import {
	formatGlobalResourceName,
	formatLocalResourceName,
	generateGlobalAppId,
	getAppNamePrefix,
	getEventFunctionName,
	limitResourceNameLength,
} from '../src/util/name'

describe('resource names', () => {
	it('should kebab case every part of a global resource name', () => {
		expect(
			formatGlobalResourceName({ appName: 'MyApp', resourceType: 'function', resourceName: 'helloWorld' })
		).toBe('my-app--function--hello-world')
	})

	it('should place the prefix & postfix around the name with a custom separator', () => {
		expect(
			formatGlobalResourceName({
				appName: 'app',
				resourceType: 'store',
				resourceName: 'assets',
				prefix: 'awsless',
				postfix: 'abc123',
				seperator: '-',
			})
		).toBe('awsless-app-store-assets-abc123')
	})

	it('should keep parts that kebab casing would erase', () => {
		expect(formatGlobalResourceName({ appName: 'app', resourceType: 'table', resourceName: '___' })).toBe(
			'app--table--___'
		)
	})

	it('should include the stack in a local resource name', () => {
		expect(
			formatLocalResourceName({
				appName: 'app',
				stackName: 'Shop',
				resourceType: 'queue',
				resourceName: 'orderMail',
			})
		).toBe('app--shop--queue--order-mail')
	})

	it('should derive the app prefix & event function name the same way', () => {
		expect(getAppNamePrefix('MyApp')).toBe('my-app--')
		expect(getEventFunctionName('MyApp')).toBe('my-app--bundle--event')
		expect(getEventFunctionName('MyApp').startsWith(getAppNamePrefix('MyApp'))).toBe(true)
	})

	it('should leave a name that fits the limit untouched', () => {
		const props = { shortPrefix: 'app-cache', maxLength: 40 }

		expect(limitResourceNameLength({ ...props, name: 'app-stack-cache-session' })).toBe('app-stack-cache-session')
		expect(limitResourceNameLength({ ...props, name: 'a'.repeat(40) })).toBe('a'.repeat(40))
	})

	it('should swap a name over the limit for the short prefix and a stable id', () => {
		const props = { shortPrefix: 'jacksclub-cache', maxLength: 40 }
		const name = 'jacksclub-casino-live-bet-cache-leaderboards'
		const short = limitResourceNameLength({ ...props, name })

		expect(short).toMatch(/^jacksclub-cache-[0-9a-f]{10}$/)
		expect(limitResourceNameLength({ ...props, name })).toBe(short)
		expect(limitResourceNameLength({ ...props, name: `${name}-2` })).not.toBe(short)
	})

	it('should cut a short prefix that is itself too long', () => {
		const short = limitResourceNameLength({
			name: 'a'.repeat(60),
			shortPrefix: `${'a'.repeat(28)}-cache`,
			maxLength: 40,
		})

		expect(short).toMatch(/^a{28}-[0-9a-f]{10}$/)
	})

	it('should generate a stable short app id per account, region & name', () => {
		const props = { accountId: '123456789012', region: 'us-east-1', appName: 'app' }
		const id = generateGlobalAppId(props)

		expect(id).toMatch(/^[0-9a-f]{8}$/)
		expect(generateGlobalAppId(props)).toBe(id)
		expect(generateGlobalAppId({ ...props, region: 'eu-west-1' })).not.toBe(id)
		expect(generateGlobalAppId({ ...props, accountId: '210987654321' })).not.toBe(id)
		expect(generateGlobalAppId({ ...props, appName: 'other' })).not.toBe(id)
	})
})
