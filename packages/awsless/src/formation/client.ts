
import { CloudFormationClient, CreateStackCommand, DeleteStackCommand, DescribeStacksCommand, GetTemplateCommand, OnFailure, TemplateStage, UpdateStackCommand, ValidateTemplateCommand, waitUntilStackCreateComplete, waitUntilStackDeleteComplete, waitUntilStackUpdateComplete } from '@aws-sdk/client-cloudformation'
import { S3Client, PutObjectCommand, ObjectCannedACL, StorageClass } from '@aws-sdk/client-s3'
import { assetBucketName, assetBucketUrl } from './bootstrap'
import { debug } from '../cli/logger'
import { style } from '../cli/style'
import { Stack } from './stack'
import { App } from './app'
import { Credentials } from '../util/credentials'
import { paramCase } from 'change-case'
import { Region } from '../schema/region'

export class StackClient {
	private maxWaitTime = 60 * 30 // 30 minutes
	private maxDelay = 30 // 30 seconds
	private assetBucketName: string

	constructor(
		private app:App,
		private account: string,
		private region: Region,
		private credentials: Credentials
	) {
		this.assetBucketName = assetBucketName(this.account, this.region)
	}

	private getClient(region:string) {
		return new CloudFormationClient({
			credentials: this.credentials,
			region,
		})
	}

	private shouldUploadTemplate(template:string) {
		const size = Buffer.byteLength(template, 'utf8')
		return size > 50000
	}

	private templateProp(stack:Stack) {
		const template = stack.toString()

		return this.shouldUploadTemplate(template) ? {
			TemplateUrl: assetBucketUrl(this.account, this.region, stack)
		} : {
			TemplateBody: template
		}
	}

	private stackName(stackName:string) {
		return paramCase(`${this.app.name}-${stackName}`)
	}

	private tags(stack:Stack) {
		const tags:{ Key:string, Value:string }[] = []
		for(const [ name, value ] of stack.tags.entries()) {
			tags.push({ Key: name, Value: value })
		}

		return tags
	}

	private async upload(stack: Stack, template: string) {
		debug('Upload the', style.info(stack.name), 'stack to awsless assets bucket')

		const client = new S3Client({
			credentials: this.credentials,
			region: stack.region,
		})

		await client.send(new PutObjectCommand({
			Bucket: this.assetBucketName,
			Key: `${ this.app.name }/${ stack.name }/cloudformation.json`,
			Body: template,
			ACL: ObjectCannedACL.private,
			StorageClass: StorageClass.STANDARD_IA,
		}))
	}

	private async create(stack:Stack, capabilities?: string[]) {
		debug('Create the', style.info(stack.name), 'stack')
		const client = this.getClient(stack.region)

		await client.send(new CreateStackCommand({
			StackName: this.stackName(stack.name),
			EnableTerminationProtection: false,
			OnFailure: OnFailure.DELETE,
			Capabilities: capabilities,
			Tags: this.tags(stack),
			...this.templateProp(stack),
		}))

		await waitUntilStackCreateComplete({
			client,
			maxWaitTime: this.maxWaitTime,
			maxDelay: this.maxDelay,
		}, {
			StackName: this.stackName(stack.name),
		})
	}

	private async update(stack:Stack, capabilities?: string[]) {
		debug('Update the', style.info(stack.name), 'stack')

		const client = this.getClient(stack.region)

		await client.send(new UpdateStackCommand({
			StackName: this.stackName(stack.name),
			Capabilities: capabilities,
			Tags: this.tags(stack),
			...this.templateProp(stack),
		}))

		await waitUntilStackUpdateComplete({
			client,
			maxWaitTime: this.maxWaitTime,
			maxDelay: this.maxDelay,
		}, {
			StackName: this.stackName(stack.name),
		})
	}

	private async validate(stack:Stack) {
		debug('Validate the', style.info(stack.name), 'stack')

		const client = this.getClient(stack.region)
		const result = await client.send(new ValidateTemplateCommand({
			...this.templateProp(stack),
		}))

		return result.Capabilities
	}

	async get(name: string, region: string) {
		debug('Get stack info for:', style.info(name))

		const client = this.getClient(region)

		let result
		try {
			result = await client.send(new DescribeStacksCommand({
				StackName: this.stackName(name),
			}))
		} catch(error) {
			if(
				error instanceof Error &&
				error.name === 'ValidationError' &&
				error.message.includes('does not exist')
			) {
				debug('Stack not found')
				return
			}

			throw error
		}

		const stack = result.Stacks?.[0]

		if(!stack) {
			debug('Stack not found')
			return
		}

		const resultTemplate = await client.send(new GetTemplateCommand({
			StackName: this.stackName(name),
			TemplateStage: TemplateStage.Original,
		}))

		const outputs: Record<string, string> = {}

		stack.Outputs?.forEach(output => {
			outputs[output.OutputKey!] = output.OutputValue!
		})

		debug('Status for:', style.info(name), 'is', style.attr(stack.StackStatus!))

		return {
			status: stack.StackStatus!,
			reason: stack.StackStatusReason,
			outputs,
			template: resultTemplate.TemplateBody!,
			updatedAt: stack.LastUpdatedTime || stack.CreationTime,
			createdAt: stack.CreationTime,
		}
	}

	async deploy(stack:Stack) {
		const template = stack.toString()
		const data = await this.get(stack.name, stack.region)

		debug('Deploy:', style.info(stack.name))

		if(data?.template === template) {
			debug('No stack changes')
			return false
		}

		if(this.shouldUploadTemplate(template)) {
			await this.upload(stack, template)
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

	async delete(name: string, region: string) {
		const data = await this.get(name, region)
		const client = this.getClient(region)

		debug('Delete the', style.info(name), 'stack')

		if(!data) {
			debug('Already deleted')
			return
		}

		await client.send(new DeleteStackCommand({
			StackName: this.stackName(name),
		}))

		await waitUntilStackDeleteComplete({
			client,
			maxWaitTime: this.maxWaitTime,
			maxDelay: this.maxDelay,
		}, {
			StackName: this.stackName(name),
		})
	}
}
