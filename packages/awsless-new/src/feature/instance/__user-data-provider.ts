import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '@awsless/formation'

type Document = any

export class UserDataProvider implements CloudProvider {
	own(id: string) {
		return id === 'awsless-instance-user-data'
	}

	async get({ id }: GetProps<Document>) {
		// return this.props.cloudProvider.get(props)

		const result = await this.client.send(
			new DescribeInstancesCommand({
				InstanceIds: [id],
			})
		)

		return result.Reservations!.at(0)!.Instances!.at(0)
	}

	async create({ document }: CreateProps<Document>) {
		// return this.props.cloudProvider.create(props)

		return this.runInstance(document)
	}

	async update({ id, newDocument }: UpdateProps<Document>) {
		// await this.props.cloudProvider.delete({
		// 	...props,
		// 	document: props.oldDocument,
		// 	assets: props.oldAssets,
		// })

		// return this.props.cloudProvider.create({
		// 	...props,
		// 	document: props.newDocument,
		// 	assets: props.newAssets,
		// 	token: v5(props.token, 'e8da7f02-a6a7-4037-b14e-80b0a04a03c1'),
		// })

		await this.terminateInstance(id)

		return this.runInstance(newDocument)
	}

	async delete({ id }: DeleteProps<Document>) {
		// return this.props.cloudProvider.delete(props)

		await this.terminateInstance(id)
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
				maxDelay: 10,
			},
			{
				InstanceIds: [id],
			}
		)

		return id
	}

	async terminateInstance(id: string) {
		await this.client.send(
			new TerminateInstancesCommand({
				InstanceIds: [id],
			})
		)

		await waitUntilInstanceTerminated(
			{
				client: this.client,
				maxWaitTime: 5 * 60,
				maxDelay: 10,
			},
			{
				InstanceIds: [id],
			}
		)
	}
}
