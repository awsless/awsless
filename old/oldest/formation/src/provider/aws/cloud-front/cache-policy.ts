import { Duration, toSeconds } from '@awsless/duration'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { Input, unwrap } from '../../../core/output.js'
import { Node } from '../../../core/node.js'

export class CachePolicy extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			name: Input<string>
			minTtl: Input<Duration>
			maxTtl: Input<Duration>
			defaultTtl: Input<Duration>
			acceptBrotli?: Input<boolean>
			acceptGzip?: Input<boolean>
			cookies?: Input<Input<string>[]>
			headers?: Input<Input<string>[]>
			queries?: Input<Input<string>[]>
		}
	) {
		super(parent, 'AWS::CloudFront::CachePolicy', id, props)
	}

	get id() {
		return this.output<string>(v => v.Id)
	}

	toState() {
		return {
			document: {
				CachePolicyConfig: {
					Name: this.props.name,
					MinTTL: toSeconds(unwrap(this.props.minTtl)),
					MaxTTL: toSeconds(unwrap(this.props.maxTtl)),
					DefaultTTL: toSeconds(unwrap(this.props.defaultTtl)),
					ParametersInCacheKeyAndForwardedToOrigin: {
						EnableAcceptEncodingGzip: unwrap(this.props.acceptGzip, false),
						EnableAcceptEncodingBrotli: unwrap(this.props.acceptBrotli, false),
						CookiesConfig: {
							CookieBehavior: unwrap(this.props.cookies) ? 'whitelist' : 'none',
							...this.attr('Cookies', this.props.cookies),
						},
						HeadersConfig: {
							HeaderBehavior: unwrap(this.props.headers) ? 'whitelist' : 'none',
							...this.attr('Headers', this.props.headers),
						},
						QueryStringsConfig: {
							QueryStringBehavior: unwrap(this.props.queries) ? 'whitelist' : 'none',
							...this.attr('QueryStrings', this.props.queries),
						},
					},
				},
			},
		}
	}
}
