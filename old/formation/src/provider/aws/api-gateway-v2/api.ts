import { Duration, toSeconds } from '@awsless/duration'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { Node } from '../../../core/node.js'
import { Input, unwrap } from '../../../core/output.js'

export class Api extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			name: Input<string>
			description?: Input<string>
			protocolType: Input<'HTTP'>
			cors?: Input<{
				allow?: Input<{
					credentials?: Input<boolean>
					headers?: Input<Input<string>[]>
					methods?: Input<Input<string>[]>
					origins?: Input<Input<string>[]>
				}>
				expose?: Input<{
					headers?: string[]
				}>
				maxAge?: Input<Duration>
			}>
		}
	) {
		super(parent, 'AWS::ApiGatewayV2::Api', id, props)
	}

	get endpoint() {
		return this.output<string>(v => v.ApiEndpoint)
	}

	get id() {
		return this.output<string>(v => v.ApiId)
	}

	toState() {
		const cors = unwrap(this.props.cors, {})
		const allow = unwrap(cors.allow, {})
		const expose = unwrap(cors.expose, {})

		return {
			document: {
				Name: this.props.name,
				ProtocolType: this.props.protocolType,
				...this.attr('Description', this.props.description),
				CorsConfiguration: {
					...this.attr('AllowCredentials', allow.credentials),
					...this.attr('AllowHeaders', allow.headers),
					...this.attr('AllowMethods', allow.methods),
					...this.attr('AllowOrigins', allow.origins),
					...this.attr('ExposeHeaders', expose.headers),
					...this.attr('MaxAge', cors.maxAge, toSeconds),
				},
			},
		}
	}
}
