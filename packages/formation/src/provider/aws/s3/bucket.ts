import { ARN } from '../types'
import { Input, unwrap } from '../../../core/output'
import { Duration } from '@awsless/duration'
import { Resource } from '../../../core/resource'
import { BucketObject, BucketObjectProps } from './bucket-object'
import { Node } from '../../../core/node'

export type NotifictionEvent =
	| 's3:TestEvent'
	| 's3:ObjectCreated:*'
	| 's3:ObjectCreated:Put'
	| 's3:ObjectCreated:Post'
	| 's3:ObjectCreated:Copy'
	| 's3:ObjectCreated:CompleteMultipartUpload'
	| 's3:ObjectRemoved:*'
	| 's3:ObjectRemoved:Delete'
	| 's3:ObjectRemoved:DeleteMarkerCreated'
	| 's3:ObjectRestore:*'
	| 's3:ObjectRestore:Post'
	| 's3:ObjectRestore:Completed'
	| 's3:ObjectRestore:Delete'
	| 's3:ReducedRedundancyLostObject'
	| 's3:Replication:*'
	| 's3:Replication:OperationFailedReplication'
	| 's3:Replication:OperationMissedThreshold'
	| 's3:Replication:OperationReplicatedAfterThreshold'
	| 's3:Replication:OperationNotTracked'
	| 's3:LifecycleExpiration:*'
	| 's3:LifecycleExpiration:Delete'
	| 's3:LifecycleExpiration:DeleteMarkerCreated'
	| 's3:LifecycleTransition'
	| 's3:IntelligentTiering'
	| 's3:ObjectTagging:*'
	| 's3:ObjectTagging:Put'
	| 's3:ObjectTagging:Delete'
	| 's3:ObjectAcl:Put'

export type BucketProps = {
	name?: Input<string>
	// accessControl?: Input<
	// 	| 'private'
	// 	| 'public-read'
	// 	| 'public-read-write'
	// 	| 'authenticated-read'
	// 	| 'bucket-owner-read'
	// 	| 'bucket-owner-full-control'
	// 	| 'log-delivery-write'
	// >
	versioning?: Input<boolean>
	forceDelete?: Input<boolean>
	website?: Input<{
		indexDocument?: Input<string>
		errorDocument?: Input<string>
	}>
	lambdaConfigs?: Input<
		Input<{
			event: Input<NotifictionEvent>
			function: Input<ARN>
		}>[]
	>
	cors?: Input<
		Input<{
			maxAge?: Input<Duration>
			origins: Input<Input<string>[]>
			methods: Input<Array<Input<'GET' | 'PUT' | 'HEAD' | 'POST' | 'DELETE'>>>
			headers?: Input<Input<string>[]>
			exposeHeaders?: Input<Input<string>[]>
		}>[]
	>
}

export class Bucket extends Resource {
	cloudProviderId = 'aws-s3-bucket'

	constructor(readonly parent: Node, id: string, private props: BucketProps = {}) {
		super(parent, 'AWS::S3::Bucket', id, props)
	}

	get name() {
		return this.output<string>(v => v.BucketName)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get domainName() {
		return this.output<string>(v => v.DomainName)
	}

	get dualStackDomainName() {
		return this.output<string>(v => v.DualStackDomainName)
	}

	get regionalDomainName() {
		return this.output<string>(v => v.RegionalDomainName)
	}

	get url() {
		return this.output<string>(v => v.WebsiteURL)
	}

	get permissions() {
		return {
			actions: [
				's3:ListBucket',
				's3:GetObject',
				's3:PutObject',
				's3:DeleteObject',
				's3:GetObjectAttributes',
			],
			resources: [
				this.arn,
				this.arn.apply<ARN>(arn => `${arn}/*`),
				// `arn:aws:s3:::${this.name}`,
				// `arn:aws:s3:::${this.name}/*`,
			],
		}
	}

	addObject(id: string, props: Omit<BucketObjectProps, 'bucket'>) {
		return new BucketObject(this, id, {
			...props,
			bucket: this.name,
		})
	}

	toState() {
		return {
			extra: {
				forceDelete: this.props.forceDelete,
			},
			document: {
				BucketName: unwrap(this.props.name, this.identifier),
				// AccessControl: pascalCase(unwrap(this.props.accessControl, 'private')),
				...(unwrap(this.props.versioning, false)
					? {
							VersioningConfiguration: {
								Status: 'Enabled',
							},
					  }
					: {}),
				...(this.props.website
					? {
							WebsiteConfiguration: {
								IndexDocument: unwrap(this.props.website).indexDocument,
								ErrorDocument: unwrap(this.props.website).errorDocument,
							},
					  }
					: {}),
				...(this.props.lambdaConfigs
					? {
							NotificationConfiguration: {
								LambdaConfigurations: unwrap(this.props.lambdaConfigs, [])
									.map(config => unwrap(config))
									.map(config => ({
										Event: config.event,
										Function: config.function,
									})),
							},
					  }
					: {}),
				...(this.props.cors
					? {
							CorsConfiguration: {
								CorsRules: unwrap(this.props.cors, [])
									.map(rule => unwrap(rule))
									.map(rule => ({
										MaxAge: rule.maxAge,
										AllowedHeaders: rule.headers,
										AllowedMethods: rule.methods,
										AllowedOrigins: rule.origins,
										ExposedHeaders: rule.exposeHeaders,
									})),
							},
					  }
					: {}),
			},
		}
	}
}
