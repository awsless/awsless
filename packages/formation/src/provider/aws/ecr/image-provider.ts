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

	private get url() {
		return `${this.props.accountId}.dkr.ecr.${this.props.region}.amazonaws.com`
	}

	private async login() {
		if (!this.loggedIn) {
			const { username, password } = await this.getCredentials()

			await exec(`docker logout ${this.url}`)
			await exec(`echo "${password}" | docker login --username ${username} --password-stdin ${this.url}`)

			this.loggedIn = true
		}
	}

	private async tag(repository: string, name: string, tag: string) {
		await exec(`docker tag ${name}:${tag} ${this.url}/${repository}:${name}`)
	}

	private async rm(repository: string, name: string) {
		await exec(`docker image -f rm ${this.url}/${repository}:${name} 2> /dev/null || true`)
	}

	private async push(repository: string, name: string) {
		await exec(`docker push ${this.url}/${repository}:${name}`)
	}

	private async publish(document: Document) {
		const repo = document.RepositoryName
		const name = document.ImageName
		const tag = document.Tag

		await this.login()
		await this.tag(repo, name, tag)
		await this.push(repo, name)
		await this.rm(repo, name)

		return JSON.stringify([repo, name, tag])
	}

	async get({ document }: GetProps<Document>) {
		return {
			ImageUri: `${this.url}/${document.RepositoryName}:${document.ImageName}`,
		}
	}

	async create({ document }: CreateProps<Document>) {
		return this.publish(document)
	}

	async update({ oldDocument, newDocument }: UpdateProps<Document>) {
		if (oldDocument.ImageName !== newDocument.ImageName) {
			throw new Error(`ECR Image can't change the tag`)
		}

		return this.publish(newDocument)
	}

	async delete({ document }: DeleteProps<Document>) {
		await this.client.send(
			new BatchDeleteImageCommand({
				repositoryName: document.RepositoryName,
				imageIds: [{ imageTag: document.ImageName }],
			})
		)
	}
}
