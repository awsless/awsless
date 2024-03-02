// import { constantCase } from "change-case";
import { Resource } from '../../resource.js'
import { formatName, getAtt, ref } from '../../util.js'
// import { Duration } from '../../property/duration.js';

export class GraphQLApi extends Resource {
	readonly name: string
	private defaultAuthorization?: GraphQLAuthorization
	// private lambdaAuthProviders: { arn: string, ttl: Duration }[] = []

	constructor(
		logicalId: string,
		private props: {
			name?: string
			defaultAuthorization?: GraphQLAuthorization
			// authenticationType?: 'api-key'
		}
	) {
		super('AWS::AppSync::GraphQLApi', logicalId)

		this.name = formatName(this.props.name || logicalId)
		this.defaultAuthorization = props.defaultAuthorization

		this.tag('name', this.name)
	}

	get arn() {
		return ref(this.logicalId)
	}

	get id() {
		return getAtt(this.logicalId, 'ApiId')
	}

	get url() {
		return getAtt(this.logicalId, 'GraphQLUrl')
	}

	get dns() {
		return getAtt(this.logicalId, 'GraphQLDns')
	}

	setDefaultAuthorization(auth: GraphQLAuthorization) {
		this.defaultAuthorization = auth
		return this
	}

	// addLambdaAuthProvider(lambdaAuthorizerArn: string, resultTTL: Duration = Duration.seconds(0)) {
	// 	this.lambdaAuthProviders.push({
	// 		arn: lambdaAuthorizerArn,
	// 		ttl: resultTTL,
	// 	})

	// 	return this
	// }

	// addCognitoAuthProvider(lambdaAuthorizerArn: string, resultTTL: Duration = Duration.seconds(0)) {
	// 	this.lambdaAuthProviders.push({
	// 		arn: lambdaAuthorizerArn,
	// 		ttl: resultTTL,
	// 	})

	// 	return this
	// }

	protected properties() {
		return {
			Name: this.name,
			...(this.defaultAuthorization?.toJSON() ?? {}),
			// AuthenticationType: constantCase(this.props.authenticationType || 'api-key'),
			// AdditionalAuthenticationProviders: this.lambdaAuthProviders.map(provider => ({
			// 	AuthenticationType: 'AWS_LAMBDA',
			// 	LambdaAuthorizerConfig: {
			// 		AuthorizerUri: provider.arn,
			// 		AuthorizerResultTtlInSeconds: provider.ttl.toSeconds(),
			// 	}
			// }))
		}
	}
}

export class GraphQLAuthorization {
	static withCognito(props: GraphQLCognitoAuthorizationProps) {
		return new GraphQLCognitoAuthorization(props)
	}

	static withApiKey() {
		return new GraphQLApiKeyAuthorization()
	}
}

export interface GraphQLAuthorization {
	toJSON(): {
		AuthenticationType: string
	}
}

type GraphQLCognitoAuthorizationProps = {
	userPoolId: string
	region: string
	defaultAction?: string
	appIdClientRegex?: string
}

export class GraphQLCognitoAuthorization implements GraphQLAuthorization {
	constructor(private props: GraphQLCognitoAuthorizationProps) {}

	toJSON() {
		return {
			AuthenticationType: 'AMAZON_COGNITO_USER_POOLS',
			UserPoolConfig: {
				UserPoolId: this.props.userPoolId,
				...(this.props.region ? { AwsRegion: this.props.region } : {}),
				...(this.props.defaultAction ? { DefaultAction: this.props.defaultAction } : {}),
				...(this.props.appIdClientRegex ? { AppIdClientRegex: this.props.appIdClientRegex } : {}),
			},
		}
	}
}

export class GraphQLApiKeyAuthorization implements GraphQLAuthorization {
	toJSON() {
		return {
			AuthenticationType: 'API_KEY',
		}
	}
}
