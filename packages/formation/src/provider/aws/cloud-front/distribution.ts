import { Duration, toSeconds } from '@awsless/duration'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { Input, unwrap } from '../../../resource/output.js'
import { ARN } from '../types.js'

type Type = 'viewer-request' | 'viewer-response' | 'origin-request' | 'origin-response'

type Origin = {
	id: Input<string>
	domainName: Input<string>
	path?: Input<string>
	protocol?: Input<'http-only' | 'https-only' | 'match-viewer'>
	headers?: Input<Record<string, Input<string>>>
	originAccessControlId?: Input<string>
	originAccessIdentityId?: Input<string>
}

type OriginGroup = {
	id: Input<string>
	members: Input<Input<string>[]>
	statusCodes: Input<Input<number>[]>
}

export class Distribution extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			name: Input<string>
			certificateArn?: Input<ARN>
			priceClass?: Input<'100' | '200' | 'All'>
			httpVersion?: Input<'http1.1' | 'http2' | 'http2and3' | 'http3'>
			viewerProtocol?: Input<'allow-all' | 'https-only' | 'redirect-to-https'>
			allowMethod?: Input<
				| ['GET', 'HEAD']
				| ['GET', 'HEAD', 'OPTIONS']
				| ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE']
			>

			cachePolicyId?: Input<string>
			originRequestPolicyId?: Input<string>
			targetOriginId: Input<string>
			responseHeadersPolicyId?: Input<string>

			aliases?: Input<Input<string>[]>
			origins?: Input<Input<Origin>[]>
			originGroups?: OriginGroup[]
			compress?: Input<boolean>
			associations?: Input<
				Input<{
					type: Input<Type>
					functionArn: Input<string>
				}>[]
			>
			lambdaAssociations?: Input<
				Input<{
					type: Input<Type>
					functionArn: Input<string>
					includeBody?: Input<boolean>
				}>[]
			>
			customErrorResponses?: Input<
				Input<{
					errorCode: Input<string>
					cacheMinTTL?: Input<Duration>
					responseCode?: Input<number>
					responsePath?: Input<string>
				}>[]
			>

			// forward?: {
			// 	cookies?: string[]
			// 	headers?: string[]
			// 	queries?: string[]
			// }
		}
	) {
		super('AWS::CloudFront::Distribution', id, props)
	}

	// get id() {
	// 	return this.getAtt('Id')
	// }

	// get arn() {
	// 	return sub('arn:${AWS::Partition}:cloudfront::${AWS::AccountId}:distribution/${id}', {
	// 		id: this.id,
	// 	})
	// }

	// get domainName() {
	// 	return getAtt(this.logicalId, 'DomainName')
	// }

	get hostedZoneId() {
		return 'Z2FDTNDATAQYW2'
	}

	toState() {
		return {
			document: {
				DistributionConfig: {
					Enabled: true,
					Aliases: unwrap(this.props.aliases, []),
					PriceClass: 'PriceClass_' + unwrap(this.props.priceClass, 'All'),
					HttpVersion: unwrap(this.props.httpVersion, 'http2and3'),
					ViewerCertificate: this.props.certificateArn
						? {
								SslSupportMethod: 'sni-only',
								AcmCertificateArn: this.props.certificateArn,
						  }
						: {},

					Origins: unwrap(this.props.origins, [])
						.map(v => unwrap(v))
						.map(origin => ({
							Id: origin.id,
							DomainName: origin.domainName,
							OriginCustomHeaders: Object.entries(unwrap(origin.headers, {})).map(
								([name, value]) => ({
									HeaderName: name,
									HeaderValue: value,
								})
							),
							...(origin.path
								? {
										OriginPath: origin.path,
								  }
								: {}),
							...(origin.protocol
								? {
										CustomOriginConfig: {
											OriginProtocolPolicy: origin.protocol,
										},
								  }
								: {}),
							...(origin.originAccessIdentityId
								? {
										S3OriginConfig: {
											OriginAccessIdentity: `origin-access-identity/cloudfront/${unwrap(
												origin.originAccessIdentityId
											)}`,
										},
								  }
								: {}),
							...(origin.originAccessControlId
								? {
										OriginAccessControlId: origin.originAccessControlId,
										S3OriginConfig: {
											OriginAccessIdentity: '',
										},
								  }
								: {}),
						})),

					OriginGroups: {
						Quantity: unwrap(this.props.originGroups, []).length ?? 0,
						Items: unwrap(this.props.originGroups, [])
							.map(v => unwrap(v))
							.map(originGroup => ({
								Id: originGroup.id,
								Members: {
									Quantity: unwrap(originGroup.members).length,
									Items: unwrap(originGroup.members).map(member => ({
										OriginId: member,
									})),
								},
								FailoverCriteria: {
									StatusCodes: {
										Quantity: unwrap(originGroup.statusCodes).length,
										Items: originGroup.statusCodes,
									},
								},
							})),
					},

					CustomErrorResponses: unwrap(this.props.customErrorResponses, [])
						.map(v => unwrap(v))
						.map(item => ({
							ErrorCode: item.errorCode,
							...this.attr(
								'ErrorCachingMinTTL',
								item.cacheMinTTL && toSeconds(unwrap(item.cacheMinTTL))
							),
							...this.attr('ResponseCode', item.responseCode),
							...this.attr('ResponsePagePath', item.responsePath),
						})),

					DefaultCacheBehavior: {
						TargetOriginId: this.props.targetOriginId,
						ViewerProtocolPolicy: unwrap(this.props.viewerProtocol, 'redirect-to-https'),
						AllowedMethods: unwrap(this.props.allowMethod, ['GET', 'HEAD', 'OPTIONS']),
						Compress: unwrap(this.props.compress, false),
						FunctionAssociations: unwrap(this.props.associations, [])
							.map(v => unwrap(v))
							.map(association => ({
								EventType: association.type,
								FunctionARN: association.functionArn,
							})),
						LambdaFunctionAssociations: unwrap(this.props.lambdaAssociations, [])
							.map(v => unwrap(v))
							.map(association => ({
								EventType: association.type,
								IncludeBody: unwrap(association.includeBody, false),
								FunctionARN: association.functionArn,
							})),
						...this.attr('CachePolicyId', this.props.cachePolicyId),
						...this.attr('OriginRequestPolicyId', this.props.originRequestPolicyId),
						...this.attr('ResponseHeadersPolicyId', this.props.responseHeadersPolicyId),
					},
				},
				Tags: [{ Key: 'Name', Value: this.props.name }],
			},
		}
	}
}
