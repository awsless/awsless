import { Duration } from '../../property/duration.js'
import { Resource } from '../../resource.js'
import { formatName } from '../../util.js'

export class Api extends Resource {
	readonly name: string

	constructor(
		logicalId: string,
		private props: {
			name?: string
			description?: string
			protocolType: 'HTTP'
			cors?: {
				allow?: {
					credentials?: boolean
					headers?: string[]
					methods?: string[]
					origins?: string[]
				}
				expose?: {
					headers?: string[]
				}
				maxAge?: Duration
			}
		}
	) {
		super('AWS::ApiGatewayV2::Api', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	get endpoint() {
		return this.getAtt('ApiEndpoint')
	}

	get id() {
		return this.getAtt('ApiId')
	}

	protected properties() {
		return {
			Name: this.name,
			ProtocolType: this.props.protocolType,
			...this.attr('Description', this.props.description),
			CorsConfiguration: {
				...this.attr('AllowCredentials', this.props.cors?.allow?.credentials),
				...this.attr('AllowHeaders', this.props.cors?.allow?.headers),
				...this.attr('AllowMethods', this.props.cors?.allow?.methods),
				...this.attr('AllowOrigins', this.props.cors?.allow?.origins),
				...this.attr('ExposeHeaders', this.props.cors?.expose?.headers),
				...this.attr('MaxAge', this.props.cors?.maxAge?.toSeconds()),
			},
		}
	}
}
