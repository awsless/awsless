import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../resource/cloud'
import {
	CreateSecurityGroupCommand,
	DeleteSecurityGroupCommand,
	DescribeSecurityGroupsCommand,
	EC2Client,
} from '@aws-sdk/client-ec2'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	VpcId: string
	GroupName: string
	GroupDescription: string
}

export class SecurityGroupProvider implements CloudProvider {
	protected client: EC2Client

	constructor(props: ProviderProps) {
		this.client = new EC2Client(props)
	}

	own(id: string) {
		return id === 'aws-ec2-security-group'
	}

	async get({ id }: GetProps<Document>) {
		const result = await this.client.send(
			new DescribeSecurityGroupsCommand({
				GroupIds: [id],
			})
		)

		return result.SecurityGroups?.at(0)
	}

	async create({ document }: CreateProps<Document>) {
		const result = await this.client.send(
			new CreateSecurityGroupCommand({
				VpcId: document.VpcId,
				GroupName: document.GroupName,
				Description: document.GroupDescription,
			})
		)

		return result.GroupId!
	}

	async update({ id }: UpdateProps<Document>) {
		throw new Error(`SecurityGroup can't be updated`)
		return id
	}

	async delete({ id }: DeleteProps<Document>) {
		await this.client.send(
			new DeleteSecurityGroupCommand({
				GroupId: id,
			})
		)
	}
}
