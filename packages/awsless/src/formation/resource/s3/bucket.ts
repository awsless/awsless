import { pascalCase } from 'change-case'
import { Resource } from '../../resource.js'
import { formatName, sub } from '../../util.js'
import { Duration } from '../../property/duration.js'

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
	cors?: {
		maxAge?: Duration
		exposeHeaders?: string[]
		headers?: string[]
		origins: string[]
		methods: Array<'GET' | 'PUT' | 'HEAD' | 'POST' | 'DELETE'>
	}[]
}

export class Bucket extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: BucketProps = {}) {
		super('AWS::S3::Bucket', logicalId)

		this.name = formatName(this.props.name || logicalId)

		this.tag('name', this.name)
	}

	get arn() {
		return this.getAtt('Arn')
	}

	get domainName() {
		return this.getAtt('DomainName')
	}

	get dealStackDomainName() {
		return this.getAtt('DualStackDomainName')
	}

	get regionalDomainName() {
		return this.getAtt('RegionalDomainName')
	}

	get url() {
		return this.getAtt('WebsiteURL')
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
				sub('arn:${AWS::Partition}:s3:::${bucket}', {
					bucket: this.name,
				}),
				sub('arn:${AWS::Partition}:s3:::${bucket}/*', {
					bucket: this.name,
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
			...(this.props.cors
				? {
						CorsConfiguration: {
							CorsRules: this.props.cors.map(rule => ({
								...this.attr('MaxAge', rule.maxAge),
								...this.attr('AllowedHeaders', rule.headers),
								...this.attr('AllowedMethods', rule.methods),
								...this.attr('AllowedOrigins', rule.origins),
								...this.attr('ExposedHeaders', rule.exposeHeaders),
							})),
						},
				  }
				: {}),
		}
	}
}
