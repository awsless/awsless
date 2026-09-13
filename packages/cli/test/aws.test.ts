import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAwsCache, getAccountId, getCredentials } from '../src/util/aws'

describe('aws session cache', () => {
	beforeEach(() => {
		// Runtime credentials skip the keychain & the prompt.
		process.env.AWS_ACCESS_KEY_ID = 'test'
		process.env.AWS_SECRET_ACCESS_KEY = 'test'
		clearAwsCache()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should hand out the same credentials per profile', async () => {
		const first = await getCredentials('default')
		const second = await getCredentials('default')
		const other = await getCredentials('other')

		expect(second).toBe(first)
		expect(other).not.toBe(first)
	})

	it('should look the account up once per credentials & region', async () => {
		const send = vi.spyOn(STSClient.prototype, 'send').mockImplementation(async () => ({ Account: '123456789012' }))
		const credentials = await getCredentials('default')

		await expect(getAccountId(credentials, 'us-east-1')).resolves.toBe('123456789012')
		await expect(getAccountId(credentials, 'us-east-1')).resolves.toBe('123456789012')
		await expect(getAccountId(await getCredentials('default'), 'us-east-1')).resolves.toBe('123456789012')

		expect(send).toHaveBeenCalledTimes(1)
		expect(send.mock.calls[0]?.[0]).toBeInstanceOf(GetCallerIdentityCommand)

		await getAccountId(credentials, 'eu-west-1')

		expect(send).toHaveBeenCalledTimes(2)
	})

	it('should retry the account lookup after a failure', async () => {
		const send = vi
			.spyOn(STSClient.prototype, 'send')
			.mockRejectedValueOnce(new Error('Network down') as never)
			.mockResolvedValue({ Account: '123456789012' } as never)
		const credentials = await getCredentials('default')

		await expect(getAccountId(credentials, 'us-east-1')).rejects.toThrow('Network down')
		await expect(getAccountId(credentials, 'us-east-1')).resolves.toBe('123456789012')

		expect(send).toHaveBeenCalledTimes(2)
	})
})
