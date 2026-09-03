import {
	GetSMSSandboxAccountStatusCommand,
	ListSMSSandboxPhoneNumbersCommand,
	ListSubscriptionsByTopicCommand,
	SNSClient,
} from '@aws-sdk/client-sns'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyAlertEndpoints } from '../src/cli/ui/complex/verify-alert-endpoints'
import { AppConfig } from '../src/config/app'
import { credentials, sent } from './_kit'

const mocks = vi.hoisted(() => ({ warnings: [] as string[] }))

vi.mock('@awsless/clui', async importOriginal => {
	const mod = await importOriginal<typeof import('@awsless/clui')>()

	return { ...mod, log: { ...mod.log, warning: (message: string) => mocks.warnings.push(message) } }
})

const mockSns = (props: { sandbox?: boolean; verified?: string[]; pending?: string[]; confirmed?: string[] }) => {
	return vi.spyOn(SNSClient.prototype, 'send').mockImplementation(async (command: any) => {
		if (command instanceof GetSMSSandboxAccountStatusCommand) {
			return { IsInSandbox: props.sandbox ?? false }
		}

		if (command instanceof ListSMSSandboxPhoneNumbersCommand) {
			return { PhoneNumbers: (props.verified ?? []).map(PhoneNumber => ({ PhoneNumber, Status: 'Verified' })) }
		}

		if (command instanceof ListSubscriptionsByTopicCommand) {
			return {
				Subscriptions: [
					...(props.pending ?? []).map(Endpoint => ({
						Protocol: 'email',
						Endpoint,
						SubscriptionArn: 'PendingConfirmation',
					})),
					...(props.confirmed ?? []).map(Endpoint => ({
						Protocol: 'email',
						Endpoint,
						SubscriptionArn: 'arn:aws:sns:us-east-1:123456789012:app--alert--ops:1',
					})),
				],
			}
		}

		throw new Error(`Unexpected SNS command: ${command.constructor.name}`)
	})
}

const verify = (alerts: Record<string, string[]>, configValues: Record<string, string> = {}) => {
	return verifyAlertEndpoints({
		credentials,
		accountId: '123456789012',
		configValues,
		appConfig: { name: 'app', region: 'us-east-1', profile: 'test', alerts } as unknown as AppConfig,
	})
}

describe('alert endpoint verification', () => {
	process.env.SKIP_PROMPT = '1'

	afterEach(() => {
		vi.restoreAllMocks()
		mocks.warnings.length = 0
	})

	it('should not touch sns without alerts', async () => {
		const send = mockSns({})

		await verify({})

		expect(send).not.toHaveBeenCalled()
	})

	it('should warn about unverified numbers while the account is sandboxed', async () => {
		mockSns({ sandbox: true, verified: ['+15550000001'] })

		await verify({ ops: ['+15550000001', '+15550000002'] })

		expect(mocks.warnings).toHaveLength(1)
		expect(mocks.warnings[0]).toContain('+15550000002')
	})

	it('should skip the number checks outside the sandbox', async () => {
		const send = mockSns({ sandbox: false })

		await verify({ ops: ['+15550000002'] })

		expect(sent(send, ListSMSSandboxPhoneNumbersCommand)).toHaveLength(0)
		expect(mocks.warnings).toEqual([])
	})

	it('should warn about email subscriptions still waiting for confirmation', async () => {
		const send = mockSns({ pending: ['pending@example.com'], confirmed: ['ok@example.com'] })

		await verify({ ops: ['ok@example.com', 'pending@example.com', 'unknown@example.com'] })

		expect(sent(send, ListSubscriptionsByTopicCommand)[0]?.input.TopicArn).toBe(
			'arn:aws:sns:us-east-1:123456789012:app--alert--ops'
		)
		expect(mocks.warnings).toHaveLength(1)
		expect(mocks.warnings[0]).toContain('pending@example.com')
	})

	it('should resolve config references & ignore the unset ones', async () => {
		mockSns({ sandbox: true, verified: [] })

		await verify({ ops: ['config:on-call', 'config:missing', 'config:blank'] }, { 'on-call': '+15550000009', blank: ' ' })

		expect(mocks.warnings).toHaveLength(1)
		expect(mocks.warnings[0]).toContain('+15550000009')
	})
})
