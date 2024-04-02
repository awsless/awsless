import { Duration, toSeconds } from '@awsless/duration'
import { CloudControlApiResource } from '../cloud-control-api/resource'
import { ARN } from '../types'
import { Input, unwrap } from '../../../core/output'
import { Resource } from '../../../core/resource'

type CognitoAuth = {
	type: Input<'cognito'>
	userPoolId: Input<string>
	region: Input<string>
	defaultAction?: Input<string>
	appIdClientRegex?: Input<string>
}

type ApiKeyAuth = {
	type: Input<'api-key'>
}

type IamAuth = {
	type: Input<'iam'>
}

type LambdaAuth = {
	type: Input<'lambda'>
	functionArn: Input<ARN>
	resultTtl?: Input<Duration>
	tokenRegex?: Input<string>
}

type Auth = CognitoAuth | ApiKeyAuth | IamAuth | LambdaAuth

export class GraphQLApi extends Resource {
	cloudProviderId = 'aws-appsync-graphql-api'
	// private defaultAuthorization?: GraphQLAuthorization
	// private lambdaAuthProviders: { arn: string, ttl: Duration }[] = []

	constructor(
		id: string,
		private props: {
			name: Input<string>
			type?: Input<'graphql' | 'merged'>
			auth: Input<{
				default: Input<Auth>
				additional?: Input<Input<Auth>[]>
			}>
			environment?: Input<Record<string, Input<string>>>
			introspection?: Input<boolean>
			visibility?: Input<boolean>
		}
	) {
		super('AWS::AppSync::GraphQLApi', id, props)
	}

	// get arn() {
	// 	return this.ref()
	// }

	// get id() {
	// 	return this.getAtt('ApiId')
	// }

	// get url() {
	// 	return this.getAtt('GraphQLUrl')
	// }

	// get dns() {
	// 	return this.getAtt('GraphQLDns')
	// }

	// setDefaultAuthorization(auth: GraphQLAuthorization) {
	// 	this.defaultAuthorization = auth
	// 	return this
	// }

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

	private formatAuth(props: Auth) {
		const type = unwrap(props.type)

		if (type === 'api-key') {
			return { AuthenticationType: 'API_KEY' }
		}

		if (type === 'iam') {
			return { AuthenticationType: 'AWS_IAM' }
		}

		if (type === 'cognito') {
			const prop = props as CognitoAuth

			return {
				AuthenticationType: 'AMAZON_COGNITO_USER_POOLS',
				UserPoolConfig: {
					UserPoolId: prop.userPoolId,
					...this.attr('AwsRegion', prop.region),
					...this.attr('DefaultAction', prop.defaultAction),
					...this.attr('AppIdClientRegex', prop.appIdClientRegex),
				},
			}
		}
		const prop = props as LambdaAuth

		return {
			AuthenticationType: 'AWS_LAMBDA',
			LambdaAuthorizerConfig: {
				AuthorizerUri: prop.functionArn,
				...this.attr('AuthorizerResultTtlInSeconds', prop.resultTtl && toSeconds(unwrap(prop.resultTtl))),
				...this.attr('IdentityValidationExpression', prop.tokenRegex),
			},
		}
	}

	toState() {
		const auth = unwrap(this.props.auth)

		return {
			document: {
				Name: this.props.name,
				ApiType: unwrap(this.props.type, 'graphql').toUpperCase(),
				...this.formatAuth(unwrap(auth.default)),
				AdditionalAuthenticationProviders: unwrap(auth.additional, []).map(unwrap).map(this.formatAuth),
				Visibility: unwrap(this.props.visibility, true) ? 'GLOBAL' : 'PRIVATE',
				IntrospectionConfig: unwrap(this.props.introspection, true) ? 'ENABLED' : 'DISABLED',
				EnvironmentVariables: JSON.stringify(unwrap(this.props.environment, {})),
			},
		}
	}
}
