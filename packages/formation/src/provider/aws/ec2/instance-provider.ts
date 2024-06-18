import {
	DescribeInstancesCommand,
	EC2Client,
	EC2ServiceException,
	RunInstancesCommand,
	TerminateInstancesCommand,
	waitUntilInstanceRunning,
	waitUntilInstanceTerminated,
} from '@aws-sdk/client-ec2'
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../core/cloud'
import { ResourceNotFound } from '../../../core/error'
import { ARN } from '../types'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	region: string
}

type Document = {
	LaunchTemplate: {
		LaunchTemplateId: string
		Version: string
	}
	KeyName?: string
	SubnetId?: string
	SecurityGroupIds?: string[]
	IamInstanceProfile?: ARN
	Tags?: { Key: string; Value: string }[]
}

type Extra = {
	waitForTermination: boolean
}

export class InstanceProvider implements CloudProvider {
	protected client: EC2Client

	constructor(props: ProviderProps) {
		this.client = new EC2Client(props)
	}

	own(id: string) {
		return id === 'aws-ec2-instance'
	}

	async get({ id }: GetProps<Document>) {
		const result = await this.client.send(
			new DescribeInstancesCommand({
				InstanceIds: [id],
			})
		)

		return result.Reservations!.at(0)!.Instances!.at(0)
	}

	async create({ document }: CreateProps<Document>) {
		return this.runInstance(document)
	}

	async update({ id, newDocument, extra }: UpdateProps<Document, Extra>) {
		await this.terminateInstance(id, true, extra.waitForTermination)
		return this.runInstance(newDocument)
	}

	async delete({ id, extra }: DeleteProps<Document, Extra>) {
		await this.terminateInstance(id, false, extra.waitForTermination)
	}

	async runInstance(document: Document) {
		const result = await this.client.send(
			new RunInstancesCommand({
				...document,
				MinCount: 1,
				MaxCount: 1,
				IamInstanceProfile: {
					Arn: document.IamInstanceProfile,
				},
				TagSpecifications: [
					{
						ResourceType: 'instance',
						Tags: document.Tags,
					},
				],
			})
		)

		const id = result.Instances!.at(0)!.InstanceId!

		await waitUntilInstanceRunning(
			{
				client: this.client,
				maxWaitTime: 5 * 60,
				maxDelay: 15,
				minDelay: 3,
			},
			{
				InstanceIds: [id],
			}
		)

		return id
	}

	async terminateInstance(id: string, skipOnNotFound = false, waitForTermination = true) {
		try {
			await this.client.send(
				new TerminateInstancesCommand({
					InstanceIds: [id],
				})
			)
		} catch (error) {
			if (error instanceof EC2ServiceException) {
				if (error.message.includes('not exist')) {
					if (skipOnNotFound) {
						return
					}

					throw new ResourceNotFound(error.message)
				}
			}

			throw error
		}

		if (waitForTermination) {
			await waitUntilInstanceTerminated(
				{
					client: this.client,
					maxWaitTime: 5 * 60,
					maxDelay: 15,
					minDelay: 3,
				},
				{
					InstanceIds: [id],
				}
			)
		}
	}
}
