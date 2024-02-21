import { Duration } from '../../property/duration.js'
import { Resource } from '../../resource.js'
import { formatName, getAtt } from '../../util.js'

export class CachePolicy extends Resource {
	readonly name: string

	constructor(
		logicalId: string,
		private props: {
			name?: string
			minTtl: Duration
			maxTtl: Duration
			defaultTtl: Duration
			acceptBrotli?: boolean
			acceptGzip?: boolean
			cookies?: string[]
			headers?: string[]
			queries?: string[]
		}
	) {
		super('AWS::CloudFront::CachePolicy', logicalId)
		this.name = formatName(this.props.name || logicalId)
	}

	get id() {
		return getAtt(this.logicalId, 'Id')
	}

	properties() {
		return {
			CachePolicyConfig: {
				Name: this.name,
				MinTTL: this.props.minTtl.toSeconds(),
				MaxTTL: this.props.maxTtl.toSeconds(),
				DefaultTTL: this.props.defaultTtl.toSeconds(),
				ParametersInCacheKeyAndForwardedToOrigin: {
					EnableAcceptEncodingGzip: this.props.acceptGzip ?? false,
					EnableAcceptEncodingBrotli: this.props.acceptBrotli ?? false,
					CookiesConfig: {
						CookieBehavior: this.props.cookies ? 'whitelist' : 'none',
						...this.attr('Cookies', this.props.cookies),
					},
					HeadersConfig: {
						HeaderBehavior: this.props.headers ? 'whitelist' : 'none',
						...this.attr('Headers', this.props.headers),
					},
					QueryStringsConfig: {
						QueryStringBehavior: this.props.queries ? 'whitelist' : 'none',
						...this.attr('QueryStrings', this.props.queries),
					},
				},
			},
		}
	}
}
