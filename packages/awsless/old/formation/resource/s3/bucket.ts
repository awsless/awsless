import { Resource } from "../../resource";
import { Stack } from "../../stack";
import { formatName, ref } from "../../util";

export type BucketProps = {
	name?: string
	acl?: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read' | 'bucket-owner-read' | 'bucket-owner-full-control' | 'log-delivery-write'
}

export class Bucket extends Resource {
	readonly name: string

	constructor(readonly logicalId: string, private props: BucketProps = {}) {
		super('s3', 'bucket', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	get arn() {
		return ref(`${ this.logicalId }Bucket`)
	}

	get permissions() {
		return {
			action: [
				's3:SendMessage',
				's3:ReceiveMessage',
				's3:GetQueueUrl',
				's3:GetQueueAttributes',
			],
			resource: [ this.arn ],
		}
	}

	template(stack: Stack) {
		return {
			[ `${ this.logicalId }Bucket` ]: {
				Type: 'AWS::S3::Bucket',
				Properties: {
					BucketName: stack.formatResourceName(this.name),
					AccessControl: this.props.acl ?? 'private',
				}
			}
		}
	}
}
