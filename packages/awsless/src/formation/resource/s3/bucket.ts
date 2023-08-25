import { pascalCase } from "change-case";
import { Resource } from "../../resource";
import { formatArn, formatName, getAtt, ref } from "../../util";

export type BucketProps = {
	name?: string
	accessControl?: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read' | 'bucket-owner-read' | 'bucket-owner-full-control' | 'log-delivery-write'
	versioned?: boolean
}

export class Bucket extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: BucketProps = {}) {
		super('AWS::S3::Bucket', logicalId)

		this.name = formatName(this.props.name || logicalId)

		this.tag('name', this.name)
	}

	get arn() {
		return ref(this.logicalId)
	}

	get domainName() {
		return getAtt(this.logicalId, 'DomainName')
	}

	get permissions() {
		return {
			actions: [
				's3:SendMessage',
				's3:ReceiveMessage',
				's3:GetQueueUrl',
				's3:GetQueueAttributes',
			],
			resources: [
				formatArn({
					service: 's3',
					resource: 'bucket',
					resourceName: this.name,
				})
			],
		}
	}

	properties() {
		return {
			BucketName: this.name,
			AccessControl: pascalCase(this.props.accessControl ?? 'private'),
			...( this.props.versioned ? {
				VersioningConfiguration: {
					Status: 'Enabled'
				}
			} : {})
		}
	}
}
