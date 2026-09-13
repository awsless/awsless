import { GetHostedZoneCommand, Route53Client } from '@aws-sdk/client-route-53'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNameServersProvider } from '../src/formation/ns-check'
import { credentials } from './_kit'

const nameServers = ['ns-1.awsdns-00.com', 'ns-2.awsdns-00.org']

const mockAws = (props: { resolved?: string[]; status?: number }) => {
	vi.spyOn(Route53Client.prototype, 'send').mockImplementation(async (command: any) => {
		if (command instanceof GetHostedZoneCommand) {
			return {
				HostedZone: { Name: 'example.com.' },
				DelegationSet: { NameServers: nameServers },
			}
		}

		throw new Error(`Unexpected Route53 command: ${command.constructor.name}`)
	})

	vi.stubGlobal('fetch', async (url: string) => ({
		json: async () => ({
			Status: props.status ?? 0,
			Answer: [
				// A non NS record must be ignored.
				{ type: 1, data: '203.0.113.1' },
				...(props.resolved ?? []).map(data => ({ type: 2, data: `${data}.` })),
			],
			url,
		}),
	}))
}

const check = () => {
	return createNameServersProvider({ credentials, region: 'us-east-1' }).createResource({
		type: 'check',
		state: { zoneId: 'Z123' },
	} as never)
}

describe('nameserver check', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
	})

	it('should pass when the public nameservers match the zone in any order', async () => {
		mockAws({ resolved: [...nameServers].reverse() })

		await expect(check()).resolves.toMatchObject({ state: {} })
	})

	it('should fail when the domain points at other nameservers', async () => {
		mockAws({ resolved: ['ns-9.other.net', 'ns-8.other.net'] })

		await expect(check()).rejects.toThrow(`Expected nameservers don't match`)
	})

	it('should fail when fewer nameservers resolve than the zone has', async () => {
		mockAws({ resolved: [nameServers[0]!] })

		await expect(check()).rejects.toThrow(`Expected nameservers don't match`)
	})

	it('should explain a failed dns lookup with the expected nameservers', async () => {
		mockAws({ status: 2 })

		await expect(check()).rejects.toThrow(/Failed to load the nameservers[\s\S]*ns-1\.awsdns-00\.com/)
	})
})
