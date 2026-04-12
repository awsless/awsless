import { Duration } from '../../property/duration.js';
import { Resource } from '../../resource.js';
import { formatName, getAtt } from '../../util.js';

export class Authorizer extends Resource {

	readonly name: string

	constructor(logicalId: string, private props: {
		name?: string
		apiId: string
		payloadFormatVersion?: '1.0' | '2.0'
		ttl?: Duration
		type: 'jwt' | 'request'
		uri:
		// credentialsArn: string
	}) {
		super('AWS::ApiGatewayV2::Authorizer', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	get id() {
		return getAtt(this.logicalId, 'AuthorizerId')
	}

	properties() {
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


// {
// 	"Type" : "AWS::ApiGatewayV2::Authorizer",
// 	"Properties" : {
// 		"ApiId" : String,
// 		"AuthorizerCredentialsArn" : String,
// 		"AuthorizerPayloadFormatVersion" : String,
// 		"AuthorizerResultTtlInSeconds" : Integer,
// 		"AuthorizerType" : String,
// 		"AuthorizerUri" : String,
// 		"EnableSimpleResponses" : Boolean,
// 		"IdentitySource" : List,
// 		"IdentityValidationExpression" : String,
// 		"JwtConfiguration" : JWTConfiguration,
// 		"Name" : String
// 	  }
//   }
