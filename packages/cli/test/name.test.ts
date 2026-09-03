import { describe, expect, it } from 'vitest'
import {
	formatGlobalResourceName,
	formatLocalResourceName,
	generateGlobalAppId,
	getAppNamePrefix,
	getBundleFunctionName,
} from '../src/util/name'

describe('resource names', () => {
	it('should kebab case every part of a global resource name', () => {
		expect(formatGlobalResourceName({ appName: 'MyApp', resourceType: 'function', resourceName: 'helloWorld' })).toBe(
			'my-app--function--hello-world'
		)
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
			formatLocalResourceName({ appName: 'app', stackName: 'Shop', resourceType: 'queue', resourceName: 'orderMail' })
		).toBe('app--shop--queue--order-mail')
	})

	it('should derive the app prefix & bundle name the same way', () => {
		expect(getAppNamePrefix('MyApp')).toBe('my-app--')
		expect(getBundleFunctionName('MyApp')).toBe('my-app--function--bundle')
		expect(getBundleFunctionName('MyApp').startsWith(getAppNamePrefix('MyApp'))).toBe(true)
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
