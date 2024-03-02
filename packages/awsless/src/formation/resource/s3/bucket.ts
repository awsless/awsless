import { pascalCase } from 'change-case'
import { Resource } from '../../resource.js'
import { formatArn, formatName, getAtt } from '../../util.js'

export type BucketProps = {
	name?: string
	accessControl?:
		| 'private'
		| 'public-read'
		| 'public-read-write'
		| 'authenticated-read'
		| 'bucket-owner-read'
		| 'bucket-owner-full-control'
		| 'log-delivery-write'
	versioning?: boolean
	website?: {
		indexDocument?: string
		errorDocument?: string
	}
}

export class Bucket extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: BucketProps = {}) {
		super('AWS::S3::Bucket', logicalId)

		this.name = formatName(this.props.name || logicalId)

		this.tag('name', this.name)
	}

	get arn() {
		return getAtt(this.logicalId, 'Arn')
	}

	get domainName() {
		return getAtt(this.logicalId, 'DomainName')
	}

	get dealStackDomainName() {
		return getAtt(this.logicalId, 'DualStackDomainName')
	}

	get regionalDomainName() {
		return getAtt(this.logicalId, 'RegionalDomainName')
	}

	get url() {
		return getAtt(this.logicalId, 'WebsiteURL')
	}

	get permissions() {
		return {
			actions: ['s3:SendMessage', 's3:ReceiveMessage', 's3:GetQueueUrl', 's3:GetQueueAttributes'],
			resources: [
				formatArn({
					service: 's3',
					resource: 'bucket',
					resourceName: this.name,
				}),
			],
		}
	}

	protected properties() {
		return {
			BucketName: this.name,
			AccessControl: pascalCase(this.props.accessControl ?? 'private'),
			...(this.props.versioning
				? {
						VersioningConfiguration: {
							Status: 'Enabled',
						},
				  }
				: {}),
			...(this.props.website
				? {
						WebsiteConfiguration: {
							...this.attr('IndexDocument', this.props.website.indexDocument),
							...this.attr('ErrorDocument', this.props.website.errorDocument),
						},
				  }
				: {}),
		}
	}
}
