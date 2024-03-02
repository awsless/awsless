import { camelCase } from 'change-case'
import { Resource } from '../../resource.js'
import { formatName, getAtt } from '../../util.js'

export class OriginRequestPolicy extends Resource {
	readonly name: string

	constructor(
		logicalId: string,
		private props: {
			name?: string
			cookie?: {
				behavior: 'all' | 'all-except' | 'none' | 'whitelist'
				values?: string[]
			}
			header?: {
				behavior:
					| 'all-except'
					| 'all-viewer'
					| 'all-viewer-and-whitelist-cloudfront'
					| 'none'
					| 'whitelist'
				values?: string[]
			}
			query?: {
				behavior: 'all' | 'all-except' | 'none' | 'whitelist'
				values?: string[]
			}
		} = {}
	) {
		super('AWS::CloudFront::OriginRequestPolicy', logicalId)
		this.name = formatName(this.props.name || logicalId)
	}

	get id() {
		return getAtt(this.logicalId, 'Id')
	}

	protected properties() {
		return {
			OriginRequestPolicyConfig: {
				Name: this.name,
				CookiesConfig: {
					CookieBehavior: camelCase(this.props.cookie?.behavior ?? 'all'),
					...this.attr('Cookies', this.props.cookie?.values),
				},
				HeadersConfig: {
					HeaderBehavior: camelCase(this.props.header?.behavior ?? 'allViewer'),
					...this.attr('Headers', this.props.header?.values),
				},
				QueryStringsConfig: {
					QueryStringBehavior: camelCase(this.props.query?.behavior ?? 'all'),
					...this.attr('QueryStrings', this.props.query?.values),
				},
			},
		}
	}
}
