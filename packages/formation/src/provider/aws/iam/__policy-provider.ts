import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../resource/cloud'
import { CreatePolicyCommand, DeletePolicyCommand, GetPolicyCommand, IAMClient } from '@aws-sdk/client-iam'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	PolicyName: string
	PolicyDocument: object
}

export class PolicyProvider implements CloudProvider {
	protected client: IAMClient

	constructor(props: ProviderProps) {
		this.client = new IAMClient(props)
	}

	own(id: string) {
		return id === 'aws-iam-policy'
	}

	async get({ id }: GetProps<Document>) {
		const result = await this.client.send(
			new GetPolicyCommand({
				PolicyArn: id,
			})
		)

		return result.Policy!
	}

	async create({ document }: CreateProps<Document>) {
		const result = await this.client.send(
			new CreatePolicyCommand({
				PolicyName: document.PolicyName,
				PolicyDocument: JSON.stringify(document.PolicyDocument),
			})
		)

		return result.Policy!.Arn!
	}

	async update({ id, newDocument }: UpdateProps<Document>) {
		// Calling 2 api's might become a problem if the update fails.

		await this.client.send(
			new DeletePolicyCommand({
				PolicyArn: id,
			})
		)

		const result = await this.client.send(
			new CreatePolicyCommand({
				PolicyName: newDocument.PolicyName,
				PolicyDocument: JSON.stringify(newDocument.PolicyDocument),
			})
		)

		return result.Policy!.Arn!
	}

	async delete({ id }: DeleteProps<Document>) {
		await this.client.send(
			new DeletePolicyCommand({
				PolicyArn: id,
			})
		)
	}
}
