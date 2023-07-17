
import { CloudFormationClient, CreateStackCommand, DeleteStackCommand, DescribeStacksCommand, GetTemplateCommand, OnFailure, TemplateStage, UpdateStackCommand, ValidateTemplateCommand, waitUntilStackCreateComplete, waitUntilStackDeleteComplete, waitUntilStackUpdateComplete } from '@aws-sdk/client-cloudformation'
import { S3Client, PutObjectCommand, ObjectCannedACL, StorageClass } from '@aws-sdk/client-s3'
import { Config } from '../config'
import { CloudFormationStackArtifact } from 'aws-cdk-lib/cx-api'
import { assetBucketName, assetBucketUrl } from './bootstrap'
import { debug } from '../cli/logger'
import { style } from '../cli/style'

export class StackClient {
	private client: CloudFormationClient
	private maxWaitTime = 60 * 30 // 30 minutes
	private maxDelay = 30 // 30 seconds

	constructor(private config: Config) {
		this.client = new CloudFormationClient({
			credentials: config.credentials,
			region: config.region,
		})
	}

	shouldUploadTemplate(stack:CloudFormationStackArtifact) {
		const body = JSON.stringify(stack.template)
		const size = Buffer.byteLength(body, 'utf8')

		return size > 50000
	}

	templateProp(stack:CloudFormationStackArtifact) {
		return this.shouldUploadTemplate(stack) ? {
			TemplateUrl: assetBucketUrl(this.config, stack.stackName)
		} : {
			TemplateBody: JSON.stringify(stack.template)
		}
	}

	private async upload(stack:CloudFormationStackArtifact) {
		debug('Upload the', style.info(stack.id), 'stack to awsless assets bucket')

		const client = new S3Client({
			credentials: this.config.credentials,
			region: this.config.region,
		})

		await client.send(new PutObjectCommand({
			Bucket: assetBucketName(this.config),
			Key: `${ stack.stackName }/cloudformation.json`,
			Body: JSON.stringify(stack.template),
			ACL: ObjectCannedACL.private,
			StorageClass: StorageClass.STANDARD_IA,
		}))
	}

	private async create(stack:CloudFormationStackArtifact, capabilities?: string[]) {
		debug('Create the', style.info(stack.id), 'stack')

		await this.client.send(new CreateStackCommand({
			StackName: stack.stackName,
			EnableTerminationProtection: false,
			OnFailure: OnFailure.DELETE,
			Capabilities: capabilities,
			...this.templateProp(stack),
		}))

		await waitUntilStackCreateComplete({
			client: this.client,
			maxWaitTime: this.maxWaitTime,
			maxDelay: this.maxDelay,
		}, {
			StackName: stack.stackName,
		})
	}

	private async update(stack:CloudFormationStackArtifact, capabilities?: string[]) {
		debug('Update the', style.info(stack.id), 'stack')

		await this.client.send(new UpdateStackCommand({
			StackName: stack.stackName,
			Capabilities: capabilities,
			...this.templateProp(stack),
		}))

		await waitUntilStackUpdateComplete({
			client: this.client,
			maxWaitTime: this.maxWaitTime,
			maxDelay: this.maxDelay,
		}, {
			StackName: stack.stackName,
		})
	}

	private async validate(stack:CloudFormationStackArtifact) {
		debug('Validate the', style.info(stack.id), 'stack')

		const result = await this.client.send(new ValidateTemplateCommand({
			...this.templateProp(stack),
		}))

		return result.Capabilities
	}

	async get(name: string) {

		debug('Get stack info for:', style.info(name))

		let result
		try {
			result = await this.client.send(new DescribeStacksCommand({
				StackName: name,
			}))
		} catch(error) {
			if(
				error instanceof Error &&
				error.name === 'ValidationError' &&
				error.message.includes('does not exist')
			) {
				return
			}

			throw error
		}

		const stack = result.Stacks?.[0]

		if(!stack) {
			debug('Stack not found')
			return
		}

		const resultTemplate = await this.client.send(new GetTemplateCommand({
			StackName: name,
			TemplateStage: TemplateStage.Original,
		}))

		const outputs: Record<string, string> = {}

		stack.Outputs?.forEach(output => {
			outputs[output.OutputKey!] = output.OutputValue!
		})

		debug('Status for: ', style.info(name), 'is', stack.StackStatus!)

		return {
			status: stack.StackStatus!,
			reason: stack.StackStatusReason,
			outputs,
			template: resultTemplate.TemplateBody!,
			updatedAt: stack.LastUpdatedTime || stack.CreationTime,
			createdAt: stack.CreationTime,
		}
	}

	async deploy(stack:CloudFormationStackArtifact) {
		const data = await this.get(stack.stackName)

		debug('Deploy:', style.info(stack.stackName))

		if(data?.template === JSON.stringify(stack.template)) {
			debug('No stack changes')
			return false
		}

		if(this.shouldUploadTemplate(stack)) {
			await this.upload(stack)
		}

		const capabilities = await this.validate(stack)

		if(!data) {
			await this.create(stack, capabilities)
		} else if(data.status.includes('IN_PROGRESS')) {
			throw new Error(`Stack is in progress: ${ data.status }`)
		} else {
			await this.update(stack, capabilities)
		}

		return true
	}

	async delete(name: string) {
		const data = await this.get(name)

		debug('Delete the', style.info(name), 'stack')

		if(!data) {
			debug('Already deleted')
			return
		}

		await this.client.send(new DeleteStackCommand({
			StackName: name
		}))

		await waitUntilStackDeleteComplete({
			client: this.client,
			maxWaitTime: this.maxWaitTime,
			maxDelay: this.maxDelay,
		}, {
			StackName: name,
		})
	}
}

// get-caller-identity
