import { pascalCase } from 'change-case'
import { ARN } from '../types'
import { Input, unwrap } from '../../../resource/output'
import { Duration } from '@awsless/duration'
import { Resource } from '../../../resource/resource'
import { BucketObject, BucketObjectProps } from './bucket-object'

export type BucketProps = {
	name?: Input<string>
	accessControl?: Input<
		| 'private'
		| 'public-read'
		| 'public-read-write'
		| 'authenticated-read'
		| 'bucket-owner-read'
		| 'bucket-owner-full-control'
		| 'log-delivery-write'
	>
	versioning?: Input<boolean>
	forceDelete?: Input<boolean>
	website?: Input<{
		indexDocument?: Input<string>
		errorDocument?: Input<string>
	}>
	cors?: Input<
		Input<{
			maxAge?: Input<Duration>
			exposeHeaders?: Input<Input<string>[]>
			headers?: Input<Input<string>[]>
			origins: Input<Input<string>[]>
			methods: Input<Array<Input<'GET' | 'PUT' | 'HEAD' | 'POST' | 'DELETE'>>>
		}>[]
	>
}

export class Bucket extends Resource {
	cloudProviderId = 'aws-s3-bucket'

	constructor(id: string, private props: BucketProps = {}) {
		super('AWS::S3::Bucket', id, props)
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

	get dealStackDomainName() {
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
				this.arn.apply(arn => `${arn}/*`),
				// `arn:aws:s3:::${this.name}`,
				// `arn:aws:s3:::${this.name}/*`,
			],
		}
	}

	addObject(id: string, props: Omit<BucketObjectProps, 'bucket'>) {
		const object = new BucketObject(id, {
			...props,
			bucket: this.name,
		})

		this.add(object)

		return object
	}

	toState() {
		return {
			extra: {
				forceDelete: this.props.forceDelete,
			},
			document: {
				BucketName: unwrap(this.props.name, this.identifier),
				AccessControl: pascalCase(unwrap(this.props.accessControl, 'private')),
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
				...(this.props.cors
					? {
							CorsConfiguration: {
								CorsRules: unwrap(this.props.cors, [])
									.map(rule => unwrap(rule))
									.map(rule => ({
										MaxAge: rule.maxAge,
										AllowedHeaders: rule.headers,
										AllowedMethods: rule.headers,
										AllowedOrigins: rule.headers,
										ExposedHeaders: rule.headers,
									})),
							},
					  }
					: {}),
			},
		}
	}
}
