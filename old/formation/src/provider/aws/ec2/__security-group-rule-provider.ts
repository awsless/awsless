import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, UpdateProps } from '../../../core/cloud'
import {
	AuthorizeSecurityGroupEgressCommand,
	AuthorizeSecurityGroupIngressCommand,
	EC2Client,
	ModifySecurityGroupRulesCommand,
	RevokeSecurityGroupEgressCommand,
	RevokeSecurityGroupIngressCommand,
} from '@aws-sdk/client-ec2'
import { Protocol } from './port'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	SecurityGroupId: string
	Type: 'egress' | 'ingress'
	Description: string

	IpProtocol: Protocol
	FromPort?: number
	ToPort?: number

	CidrIp?: string
	CidrIpv6?: string
}

export class SecurityGroupRuleProvider implements CloudProvider {
	protected client: EC2Client

	constructor(props: ProviderProps) {
		this.client = new EC2Client(props)
	}

	own(id: string) {
		return id === 'aws-ec2-security-group-rule'
	}

	async get() {
		return {}
	}

	async create({ document }: CreateProps<Document>) {
		const input = {
			GroupId: document.SecurityGroupId,
			IpProtocol: document.IpProtocol,
			FromPort: document.FromPort,
			ToPort: document.ToPort,
			CidrIp: document.CidrIp ?? document.CidrIpv6,
			Description: document.Description,
		}

		if (document.Type === 'egress') {
			const result = await this.client.send(new AuthorizeSecurityGroupEgressCommand(input))
			return result.SecurityGroupRules!.at(0)!.SecurityGroupRuleId!
		}

		const result = await this.client.send(new AuthorizeSecurityGroupIngressCommand(input))
		return result.SecurityGroupRules!.at(0)!.SecurityGroupRuleId!
	}

	async update({ id, oldDocument, newDocument }: UpdateProps<Document>) {
		if (oldDocument.SecurityGroupId !== newDocument.SecurityGroupId) {
			throw new Error(`SecurityGroupRule can't change the security group id`)
		}

		await this.client.send(
			new ModifySecurityGroupRulesCommand({
				GroupId: oldDocument.SecurityGroupId,
				SecurityGroupRules: [
					{
						SecurityGroupRuleId: id,
						SecurityGroupRule: {
							IpProtocol: newDocument.IpProtocol,
							FromPort: newDocument.FromPort,
							ToPort: newDocument.ToPort,
							CidrIpv4: newDocument.CidrIp,
							CidrIpv6: newDocument.CidrIpv6,
							Description: newDocument.Description,
						},
					},
				],
			})
		)

		return id
	}

	async delete({ id, document }: DeleteProps<Document>) {
		const input = {
			GroupId: document.SecurityGroupId,
			SecurityGroupRuleIds: [id],
		}

		if (document.Type === 'egress') {
			await this.client.send(new RevokeSecurityGroupEgressCommand(input))
		}

		await this.client.send(new RevokeSecurityGroupIngressCommand(input))
	}
}
