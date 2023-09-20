// import { Resource } from "../../resource";
// import { formatName, getAtt } from "../../util";

// export class ApDeploymenti extends Resource {

// 	readonly name: string

// 	constructor(logicalId: string, private props: {
// 		name?: string
// 		description?: string
// 		protocolType: 'HTTP'
// 		cors?: {
// 			headers?: string[]
// 			methods?: string[]
// 			origins?: string[]
// 		}
// 	}) {
// 		super('AWS::ApiGatewayV2::Deployment', logicalId)
// 	}

// 	get endpoint() {
// 		return getAtt(this.logicalId, 'ApiEndpoint')
// 	}

// 	get id() {
// 		return getAtt(this.logicalId, 'ApiId')
// 	}

// 	properties() {
// 		return {
// 			Name: this.name,
// 			...this.attr('Description', this.props.description),
// 			ProtocolType: this.props.protocolType,
// 			CorsConfiguration: {
// 				AllowHeaders: this.props.cors?.headers ?? [],
// 				AllowMethods: this.props.cors?.methods ?? [],
// 				AllowOrigins: this.props.cors?.origins ?? [],
// 			},
// 		}
// 	}
// }

// BooksAPIDeployment:
//   Type: AWS::ApiGatewayV2::Deployment
//   DependsOn:
//     - RetrieveBooksRoute
//     - CreateBooksRoute
//   Properties:
//     ApiId: !Ref BooksAPI
