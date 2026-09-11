import {
	CreateAccessKeyCommand,
	CreateUserCommand,
	DeleteAccessKeyCommand,
	DeleteUserCommand,
	DeleteUserPolicyCommand,
	PutUserPolicyCommand,
} from '@aws-sdk/client-iam'
import { describe, expect, it, vi } from 'vitest'
import { buildRemoteAgentPolicy, RemoteAgentIam, remoteAgentUserName } from '../src/util/remote-agent-iam'
import { sent } from './_kit'

const noSuchEntity = () => Object.assign(new Error('not found'), { name: 'NoSuchEntityException' })

const policy = buildRemoteAgentPolicy({ appName: 'app', region: 'eu-west-1', accountId: '123456789012', auth: true })

// A fake iam that answers per command type, and records every call.
const fakeClient = (handlers: Record<string, (input: any) => unknown>) => {
	const send = vi.fn(async (command: { constructor: { name: string }; input: unknown }) => {
		const handler = handlers[command.constructor.name]

		if (!handler) {
			throw new Error(`Unexpected ${command.constructor.name}`)
		}

		return handler(command.input)
	})

	return { send }
}

describe('remote agent policy', () => {
	it('grants only the config & auth lookups the dev commands make', () => {
		expect(policy).toStrictEqual({
			Version: '2012-10-17',
			Statement: [
				{
					Sid: 'ReadConfig',
					Effect: 'Allow',
					Action: ['ssm:GetParametersByPath', 'ssm:GetParameter', 'ssm:GetParameters'],
					Resource: [
						'arn:aws:ssm:eu-west-1:123456789012:parameter/.awsless/app',
						'arn:aws:ssm:eu-west-1:123456789012:parameter/.awsless/app/*',
					],
				},
				{
					Sid: 'DecryptConfig',
					Effect: 'Allow',
					Action: 'kms:Decrypt',
					Resource: 'arn:aws:kms:eu-west-1:123456789012:key/*',
					Condition: { StringEquals: { 'kms:ViaService': 'ssm.eu-west-1.amazonaws.com' } },
				},
				{
					Sid: 'ResolveAuthPools',
					Effect: 'Allow',
					Action: ['cognito-idp:ListUserPools', 'cognito-idp:ListUserPoolClients'],
					Resource: '*',
				},
			],
		})
	})

	it('leaves cognito out for apps without auth', () => {
		const without = buildRemoteAgentPolicy({ appName: 'app', region: 'eu-west-1', accountId: '1', auth: false })

		expect(without.Statement.map(statement => statement.Sid)).toStrictEqual(['ReadConfig', 'DecryptConfig'])
	})

	it('names the user after the app', () => {
		expect(remoteAgentUserName('my-app')).toBe('awsless-remote-agent-my-app')
	})
})

describe('remote agent iam', () => {
	it('creates a missing user & policy, then a key', async () => {
		const client = fakeClient({
			GetUserCommand: () => {
				throw noSuchEntity()
			},
			CreateUserCommand: () => ({}),
			GetUserPolicyCommand: () => {
				throw noSuchEntity()
			},
			PutUserPolicyCommand: () => ({}),
			ListAccessKeysCommand: () => ({ AccessKeyMetadata: [] }),
			CreateAccessKeyCommand: () => ({ AccessKey: { AccessKeyId: 'AKIA1', SecretAccessKey: 'secret' } }),
		})
		const iam = new RemoteAgentIam(client as any, 'app')

		expect(await iam.ensureUser()).toBe('created')
		expect(await iam.ensurePolicy(policy)).toBe('created')
		expect(await iam.listKeys()).toStrictEqual([])
		expect(await iam.createKey()).toStrictEqual({ id: 'AKIA1', secret: 'secret' })

		const [created] = sent(client.send, CreateUserCommand)
		expect(created!.input.UserName).toBe('awsless-remote-agent-app')
		expect(created!.input.Tags).toContainEqual({ Key: 'awsless:app', Value: 'app' })

		const [put] = sent(client.send, PutUserPolicyCommand)
		expect(JSON.parse(put!.input.PolicyDocument!)).toStrictEqual(policy)
		expect(sent(client.send, CreateAccessKeyCommand)).toHaveLength(1)
	})

	it('leaves an existing user with a matching policy untouched', async () => {
		const client = fakeClient({
			GetUserCommand: () => ({ User: {} }),
			GetUserPolicyCommand: () => ({ PolicyDocument: encodeURIComponent(JSON.stringify(policy)) }),
		})
		const iam = new RemoteAgentIam(client as any, 'app')

		expect(await iam.ensureUser()).toBe('existing')
		expect(await iam.ensurePolicy(policy)).toBe('unchanged')
		expect(sent(client.send, CreateUserCommand)).toHaveLength(0)
		expect(sent(client.send, PutUserPolicyCommand)).toHaveLength(0)
	})

	it('rewrites a drifted policy', async () => {
		const stale = buildRemoteAgentPolicy({ appName: 'app', region: 'us-east-1', accountId: '1', auth: false })
		const client = fakeClient({
			GetUserPolicyCommand: () => ({ PolicyDocument: encodeURIComponent(JSON.stringify(stale)) }),
			PutUserPolicyCommand: () => ({}),
		})
		const iam = new RemoteAgentIam(client as any, 'app')

		expect(await iam.ensurePolicy(policy)).toBe('updated')
	})

	it('reports existing keys so create can refuse & rotate can replace them', async () => {
		const date = new Date('2026-01-01T00:00:00Z')
		const client = fakeClient({
			ListAccessKeysCommand: () => ({ AccessKeyMetadata: [{ AccessKeyId: 'AKIAOLD', CreateDate: date }] }),
			CreateAccessKeyCommand: () => ({ AccessKey: { AccessKeyId: 'AKIANEW', SecretAccessKey: 'secret' } }),
			DeleteAccessKeyCommand: () => ({}),
		})
		const iam = new RemoteAgentIam(client as any, 'app')

		expect(await iam.listKeys()).toStrictEqual([{ id: 'AKIAOLD', createdAt: date }])

		// The rotation order: the new key first, then the old one goes.
		await iam.createKey()
		await iam.deleteKey('AKIAOLD')

		const calls = client.send.mock.calls.map(([command]) => (command as object).constructor.name)
		expect(calls.indexOf('CreateAccessKeyCommand')).toBeLessThan(calls.indexOf('DeleteAccessKeyCommand'))
		expect(sent(client.send, DeleteAccessKeyCommand)[0]!.input.AccessKeyId).toBe('AKIAOLD')
	})

	it('deletes keys, policy & user, and tolerates a missing user', async () => {
		const client = fakeClient({
			GetUserCommand: () => ({ User: {} }),
			ListAccessKeysCommand: () => ({ AccessKeyMetadata: [{ AccessKeyId: 'AKIA1' }, { AccessKeyId: 'AKIA2' }] }),
			DeleteAccessKeyCommand: () => ({}),
			DeleteUserPolicyCommand: () => ({}),
			DeleteUserCommand: () => ({}),
		})
		const iam = new RemoteAgentIam(client as any, 'app')

		expect(await iam.deleteUser()).toBe(true)
		expect(sent(client.send, DeleteAccessKeyCommand)).toHaveLength(2)
		expect(sent(client.send, DeleteUserPolicyCommand)).toHaveLength(1)
		expect(sent(client.send, DeleteUserCommand)).toHaveLength(1)

		const missing = fakeClient({
			GetUserCommand: () => {
				throw noSuchEntity()
			},
		})

		expect(await new RemoteAgentIam(missing as any, 'app').deleteUser()).toBe(false)
		expect(sent(missing.send, DeleteUserCommand)).toHaveLength(0)
	})
})
