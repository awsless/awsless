import { Duration } from '../../property/duration.js';
import { Resource } from '../../resource.js';
import { formatName, getAtt, sub } from '../../util.js';

type Type = 'viewer-request' | 'viewer-response' | 'origin-request' | 'origin-response'

export class Distribution extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: {
		name?: string
		certificateArn?: string
		priceClass?: '100' | '200' | 'All'
		httpVersion?: 'http1.1' | 'http2' | 'http2and3' | 'http3'
		viewerProtocol?: 'allow-all' | 'https-only' | 'redirect-to-https'
		allowMethod?: (
			[ 'GET', 'HEAD' ] |
			[ 'GET', 'HEAD', 'OPTIONS' ] |
			[ 'GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE' ]
		)

		cachePolicyId?: string
		originRequestPolicyId?: string
		targetOriginId: string
		responseHeadersPolicyId?: string

		aliases?: string[]
		origins?: Origin[]
		originGroups?: OriginGroup[]
		compress?: boolean
		associations?: {
			type: Type
			functionArn: string
		}[]
		lambdaAssociations?: {
			type: Type
			functionArn: string
			includeBody?: boolean
		}[]
		customErrorResponses?: {
			errorCode: string
			cacheMinTTL?: Duration
			responseCode?: number
			responsePath?: string
		}[]

		// forward?: {
		// 	cookies?: string[]
		// 	headers?: string[]
		// 	queries?: string[]
		// }
	}) {
		super('AWS::CloudFront::Distribution', logicalId)
		this.name = formatName(this.props.name || logicalId)
		this.tag('name', this.name)
	}

	get id() {
		return getAtt(this.logicalId, 'Id')
	}

	get arn() {
		return sub('arn:${AWS::Partition}:cloudfront::${AWS::AccountId}:distribution/${id}', {
			id: this.id
		})
	}

	get domainName() {
		return getAtt(this.logicalId, 'DomainName')
	}

	properties() {
		return {
			DistributionConfig: {
				Enabled: true,
				Aliases: this.props.aliases ?? [],
				PriceClass: 'PriceClass_' + ( this.props.priceClass ?? 'All' ),
				HttpVersion: this.props.httpVersion ?? 'http2and3',
				ViewerCertificate: this.props.certificateArn ? {
					SslSupportMethod: 'sni-only',
					AcmCertificateArn: this.props.certificateArn,
				} : {},
				Origins: this.props.origins?.map(origin => origin.toJSON()) ?? [],
				OriginGroups: {
					Quantity: this.props.originGroups?.length ?? 0,
					Items: this.props.originGroups?.map(originGroup => originGroup.toJSON()) ?? [],
				},

				CustomErrorResponses: this.props.customErrorResponses?.map(item => ({
					ErrorCode: item.errorCode,
					...this.attr('ErrorCachingMinTTL', item.cacheMinTTL?.toSeconds()),
					...this.attr('ResponseCode', item.responseCode),
					...this.attr('ResponsePagePath', item.responsePath),
				})) ?? [],

				DefaultCacheBehavior: {
					TargetOriginId: this.props.targetOriginId,
					ViewerProtocolPolicy: this.props.viewerProtocol ?? 'redirect-to-https',
					AllowedMethods: this.props.allowMethod ?? [ 'GET', 'HEAD', 'OPTIONS' ],
					Compress: this.props.compress ?? false,
					FunctionAssociations: this.props.associations?.map(association => ({
						EventType: association.type,
						FunctionARN: association.functionArn,
					})) ?? [],
					LambdaFunctionAssociations: this.props.lambdaAssociations?.map(association => ({
						EventType: association.type,
						IncludeBody: association.includeBody ?? false,
						FunctionARN: association.functionArn,
					})) ?? [],
					...this.attr('CachePolicyId', this.props.cachePolicyId),
					...this.attr('OriginRequestPolicyId', this.props.originRequestPolicyId),
					...this.attr('ResponseHeadersPolicyId', this.props.responseHeadersPolicyId),
				},
			}
		}
	}
}

export class Origin {
	constructor(private props: {
		id: string
		domainName: string
		path?: string
		protocol?: 'http-only' | 'https-only' | 'match-viewer'
		headers?: Record<string, string>
		originAccessControlId?: string
		originAccessIdentityId?: string
	}) {}

	toJSON() {
		return {
			Id: this.props.id,
			DomainName: this.props.domainName,
			OriginCustomHeaders: Object.entries(this.props.headers ?? {}).map(([name, value]) => ({
				HeaderName: name,
				HeaderValue: value,
			})),
			...(this.props.path ? {
				OriginPath: this.props.path,
			} : {}),
			...(this.props.protocol ? {
				CustomOriginConfig: {
					OriginProtocolPolicy: this.props.protocol,
				},
			} : {}),
			...(this.props.originAccessIdentityId ? {
				S3OriginConfig: {
					OriginAccessIdentity: sub('origin-access-identity/cloudfront/${id}', {
						id: this.props.originAccessIdentityId,
					}),
				},
			} : {}),
			...(this.props.originAccessControlId ? {
				OriginAccessControlId: this.props.originAccessControlId,
				S3OriginConfig: {
					OriginAccessIdentity: '',
				},
			} : {}),
		}
	}
}

export class OriginGroup {
	constructor(private props: {
		id: string
		members: string[]
		statusCodes: number[]
	}) {}

	toJSON() {
		return {
			Id: this.props.id,
			Members: {
				Quantity: this.props.members.length,
				Items: this.props.members.map(member => ({
					OriginId: member
				})),
			},
			FailoverCriteria: {
				StatusCodes: {
					Quantity: this.props.statusCodes.length,
					Items: this.props.statusCodes,
				}
			}
		}
	}
}
