import { BatchDeleteImageCommand, ECRClient, GetAuthorizationTokenCommand } from '@aws-sdk/client-ecr'
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types'
import { exec } from 'promisify-child-process'
import { CloudProvider, CreateProps, DeleteProps, GetProps, UpdateProps } from '../../../core/cloud'

type ProviderProps = {
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider
	accountId: string
	region: string
}

type Document = {
	RepositoryName: string
	ImageName: string
	Tag: string
}

export class ImageProvider implements CloudProvider {
	protected client: ECRClient
	private loggedIn = false

	constructor(private props: ProviderProps) {
		this.client = new ECRClient({
			...props,
		})
	}

	own(id: string) {
		return id === 'aws-ecr-image'
	}

	private async getCredentials() {
		const command = new GetAuthorizationTokenCommand({})
		const result = await this.client.send(command)

		const [username, password] = Buffer.from(result.authorizationData![0]!.authorizationToken ?? '', 'base64')
			.toString('utf8')
			.split(':')

		return { username, password }
	}

	private async login() {
		if (!this.loggedIn) {
			const { username, password } = await this.getCredentials()
			const repoName = `${this.props.accountId}.dkr.ecr.${this.props.region}.amazonaws.com`

			await exec(`docker logout ${repoName}`)
			await exec(`echo "${password}" | docker login --username ${username} --password-stdin ${repoName}`)

			this.loggedIn = true
		}
	}

	private async push(repository: string, tag: string) {
		await exec(
			`docker push ${this.props.accountId}.dkr.ecr.${this.props.region}.amazonaws.com/${repository}:${tag}`
		)
	}

	async get({ document }: GetProps<Document>) {
		return {
			ImageUri: `${this.props.accountId}.dkr.ecr.${this.props.region}.amazonaws.com/${document.RepositoryName}:${document.Tag}`,
		}
	}

	async create({ document }: CreateProps<Document>) {
		await this.login()
		await this.push(document.RepositoryName, document.Tag)

		return JSON.stringify([document.RepositoryName, document.ImageName, document.Tag])
	}

	async update({ oldDocument, newDocument }: UpdateProps<Document>) {
		if (oldDocument.Tag !== newDocument.Tag) {
			throw new Error(`ECR Image can't change the tag`)
		}

		await this.login()
		await this.push(newDocument.RepositoryName, newDocument.Tag)

		return JSON.stringify([newDocument.RepositoryName, newDocument.ImageName, newDocument.Tag])
	}

	async delete({ document }: DeleteProps<Document>) {
		await this.client.send(
			new BatchDeleteImageCommand({
				repositoryName: document.RepositoryName,
				imageIds: [{ imageTag: document.Tag }],
			})
		)
	}
}
