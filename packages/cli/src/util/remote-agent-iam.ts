import {
	CreateAccessKeyCommand,
	CreateUserCommand,
	DeleteAccessKeyCommand,
	DeleteUserCommand,
	DeleteUserPolicyCommand,
	GetUserCommand,
	GetUserPolicyCommand,
	IAMClient,
	ListAccessKeysCommand,
	PutUserPolicyCommand,
} from '@aws-sdk/client-iam'
import { isError } from './aws.js'
import { configParameterPrefix } from './ssm.js'

export const remoteAgentUserName = (appName: string) => `awsless-remote-agent-${appName}`
export const remoteAgentPolicyName = 'awsless-remote-agent'

type PolicyInput = {
	appName: string
	region: string
	accountId: string
	// Only apps with auth resources need the cognito lookups.
	auth: boolean
}

// The complete set of aws calls the dev & test commands make: reading
// the app's config parameters, and resolving the deployed userpools.
// The cognito actions are list-only, so a wildcard keeps the policy
// valid across redeployed pools.
export const buildRemoteAgentPolicy = ({ appName, region, accountId, auth }: PolicyInput) => {
	return {
		Version: '2012-10-17',
		Statement: [
			{
				Sid: 'ReadConfig',
				Effect: 'Allow',
				Action: ['ssm:GetParametersByPath', 'ssm:GetParameter', 'ssm:GetParameters'],
				// GetParametersByPath is checked against the path itself, the
				// wildcard only covers the parameters below it.
				Resource: [
					`arn:aws:ssm:${region}:${accountId}:parameter${configParameterPrefix(appName)}`,
					`arn:aws:ssm:${region}:${accountId}:parameter${configParameterPrefix(appName)}/*`,
				],
			},
			{
				Sid: 'DecryptConfig',
				Effect: 'Allow',
				Action: 'kms:Decrypt',
				Resource: `arn:aws:kms:${region}:${accountId}:key/*`,
				Condition: { StringEquals: { 'kms:ViaService': `ssm.${region}.amazonaws.com` } },
			},
			...(auth
				? [
						{
							Sid: 'ResolveAuthPools',
							Effect: 'Allow',
							Action: ['cognito-idp:ListUserPools', 'cognito-idp:ListUserPoolClients'],
							Resource: '*',
						},
					]
				: []),
		],
	}
}

export type RemoteAgentPolicy = ReturnType<typeof buildRemoteAgentPolicy>

export type AccessKey = { id: string; createdAt?: Date }

type Client = Pick<IAMClient, 'send'>

// The iam side of the remote agent credentials, kept apart from the
// commands so the flows test against a fake client.
export class RemoteAgentIam {
	constructor(
		private readonly client: Client,
		private readonly appName: string
	) {}

	get userName() {
		return remoteAgentUserName(this.appName)
	}

	async ensureUser(): Promise<'created' | 'existing'> {
		try {
			await this.client.send(new GetUserCommand({ UserName: this.userName }))
			return 'existing'
		} catch (error) {
			if (!isError(error, 'NoSuchEntityException')) {
				throw error
			}
		}

		await this.client.send(
			new CreateUserCommand({
				UserName: this.userName,
				Tags: [
					{ Key: 'awsless:app', Value: this.appName },
					{ Key: 'awsless:purpose', Value: 'remote-agent' },
				],
			})
		)

		return 'created'
	}

	async ensurePolicy(policy: RemoteAgentPolicy): Promise<'created' | 'updated' | 'unchanged'> {
		const document = JSON.stringify(policy)
		let current: string | undefined

		try {
			const result = await this.client.send(
				new GetUserPolicyCommand({ UserName: this.userName, PolicyName: remoteAgentPolicyName })
			)

			// IAM hands the document back url encoded.
			current = result.PolicyDocument
				? JSON.stringify(JSON.parse(decodeURIComponent(result.PolicyDocument)))
				: undefined
		} catch (error) {
			if (!isError(error, 'NoSuchEntityException')) {
				throw error
			}
		}

		if (current === document) {
			return 'unchanged'
		}

		await this.client.send(
			new PutUserPolicyCommand({
				UserName: this.userName,
				PolicyName: remoteAgentPolicyName,
				PolicyDocument: document,
			})
		)

		return current === undefined ? 'created' : 'updated'
	}

	async listKeys(): Promise<AccessKey[]> {
		try {
			const result = await this.client.send(new ListAccessKeysCommand({ UserName: this.userName }))

			return (result.AccessKeyMetadata ?? [])
				.filter(key => key.AccessKeyId)
				.map(key => ({ id: key.AccessKeyId!, createdAt: key.CreateDate }))
		} catch (error) {
			if (isError(error, 'NoSuchEntityException')) {
				return []
			}

			throw error
		}
	}

	async createKey(): Promise<{ id: string; secret: string }> {
		const result = await this.client.send(new CreateAccessKeyCommand({ UserName: this.userName }))
		const key = result.AccessKey

		if (!key?.AccessKeyId || !key.SecretAccessKey) {
			throw new Error('IAM returned an access key without an id or secret.')
		}

		return { id: key.AccessKeyId, secret: key.SecretAccessKey }
	}

	async deleteKey(id: string) {
		await this.client.send(new DeleteAccessKeyCommand({ UserName: this.userName, AccessKeyId: id }))
	}

	// Removes the keys, the policy & the user. A missing user is not an
	// error, so the command is safe to repeat.
	async deleteUser(): Promise<boolean> {
		try {
			await this.client.send(new GetUserCommand({ UserName: this.userName }))
		} catch (error) {
			if (isError(error, 'NoSuchEntityException')) {
				return false
			}

			throw error
		}

		for (const key of await this.listKeys()) {
			await this.deleteKey(key.id)
		}

		try {
			await this.client.send(
				new DeleteUserPolicyCommand({ UserName: this.userName, PolicyName: remoteAgentPolicyName })
			)
		} catch (error) {
			if (!isError(error, 'NoSuchEntityException')) {
				throw error
			}
		}

		await this.client.send(new DeleteUserCommand({ UserName: this.userName }))

		return true
	}
}
