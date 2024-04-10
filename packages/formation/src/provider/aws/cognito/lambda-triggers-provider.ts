import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../core/cloud'
import {
	DescribeUserPoolCommand,
	UpdateUserPoolCommand,
	CognitoIdentityProviderClient,
	UpdateUserPoolCommandInput,
} from '@aws-sdk/client-cognito-identity-provider'
import { sha256 } from '../../../core/hash'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	UserPoolId: string
	LambdaConfig: {
		PreAuthentication?: string
		PostAuthentication?: string
		PostConfirmation?: string
		PreSignUp?: string
		PreTokenGeneration?: string
		CustomMessage?: string
		UserMigration?: string

		DefineAuthChallenge?: string
		CreateAuthChallenge?: string
		VerifyAuthChallengeResponse?: string
	}
}

export class LambdaTriggersProvider implements CloudProvider {
	protected client: CognitoIdentityProviderClient

	constructor(props: ProviderProps) {
		this.client = new CognitoIdentityProviderClient(props)
	}

	own(id: string) {
		return id === 'aws-cognito-lambda-triggers'
	}

	async updateUserPool(document: Document) {
		const result = await this.client.send(
			new DescribeUserPoolCommand({
				UserPoolId: document.UserPoolId,
			})
		)

		delete result.UserPool?.AdminCreateUserConfig?.UnusedAccountValidityDays

		await this.client.send(
			new UpdateUserPoolCommand({
				...result.UserPool,
				...document,
			})
		)
	}
	async get({ document }: GetProps<Document>) {
		const result = await this.client.send(
			new DescribeUserPoolCommand({
				UserPoolId: document.UserPoolId,
			})
		)

		return result.UserPool?.LambdaConfig ?? {}
	}

	async create({ document }: CreateProps<Document>) {
		await this.updateUserPool(document)
		return document.UserPoolId
	}

	async update({ oldDocument, newDocument }: UpdateProps<Document>) {
		if (oldDocument.UserPoolId !== newDocument.UserPoolId) {
			throw new Error(`LambdaTriggers can't change the user pool id`)
		}

		await this.updateUserPool(newDocument)

		return newDocument.UserPoolId
	}

	async delete({ document }: DeleteProps<Document>) {
		await this.client.send(
			new UpdateUserPoolCommand({
				UserPoolId: document.UserPoolId,
				LambdaConfig: {},
			})
		)
	}
}
