import { Duration, toSeconds } from '@awsless/duration'
import { ARN } from '../types'
import { Input, unwrap } from '../../../core/output'
import { Resource } from '../../../core/resource'
import { Node } from '../../../core/node'
// import { DomainName } from './domain-name'
// import { DomainNameApiAssociation } from './domain-name-api-association'

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
		readonly parent: Node,
		id: string,
		private props: {
			name: Input<string>
			type?: Input<'graphql' | 'merged'>
			role?: Input<ARN>
			auth: Input<{
				default: Input<Auth>
				additional?: Input<Input<Auth>[]>
			}>
			environment?: Input<Record<string, Input<string>>>
			introspection?: Input<boolean>
			visibility?: Input<boolean>
		}
	) {
		super(parent, 'AWS::AppSync::GraphQLApi', id, props)
	}

	get id() {
		return this.output<string>(v => v.apiId)
	}

	get arn() {
		return this.output<ARN>(v => v.arn)
	}

	get name() {
		return this.output<string>(v => v.name)
	}

	get realtime() {
		return {
			uri: this.output<string>(v => v.uris.REALTIME),
			dns: this.output<string>(v => v.dns.REALTIME),
		}
	}

	get graphql() {
		return {
			uri: this.output<string>(v => v.uris.GRAPHQL),
			dns: this.output<string>(v => v.dns.GRAPHQL),
		}
	}

	// addDataSource(id: string, props:) {

	// }

	// assignDomainName(
	// 	id: string,
	// 	props: {
	// 		domainName: Input<string>
	// 		certificateArn: Input<ARN>
	// 	}
	// ) {
	// 	const domain = new DomainName(id, props)
	// 	this.add(domain)

	// 	// const association = new DomainNameApiAssociation(id, {
	// 	// 	apiId: this.id,
	// 	// 	domainName: domain.domainName,
	// 	// })

	// 	// domain.add(association)

	// 	return domain
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
			return { authenticationType: 'API_KEY' }
		}

		if (type === 'iam') {
			return { authenticationType: 'AWS_IAM' }
		}

		if (type === 'cognito') {
			const prop = props as CognitoAuth

			return {
				authenticationType: 'AMAZON_COGNITO_USER_POOLS',
				userPoolConfig: {
					userPoolId: prop.userPoolId,
					defaultAction: prop.defaultAction ?? 'ALLOW',
					...this.attr('awsRegion', prop.region),
					...this.attr('appIdClientRegex', prop.appIdClientRegex),
				},
			}
		}
		const prop = props as LambdaAuth

		return {
			authenticationType: 'AWS_LAMBDA',
			lambdaAuthorizerConfig: {
				authorizerUri: prop.functionArn,
				...this.attr('authorizerResultTtlInSeconds', prop.resultTtl && toSeconds(unwrap(prop.resultTtl))),
				...this.attr('identityValidationExpression', prop.tokenRegex),
			},
		}
	}

	toState() {
		const auth = unwrap(this.props.auth)

		return {
			document: {
				name: this.props.name,
				apiType: unwrap(this.props.type, 'graphql').toUpperCase(),
				...this.attr('mergedApiExecutionRoleArn', this.props.role),
				...this.formatAuth(unwrap(auth.default)),
				additionalAuthenticationProviders: unwrap(auth.additional, [])
					.map(v => unwrap(v))
					.map(this.formatAuth),
				visibility: unwrap(this.props.visibility, true) ? 'GLOBAL' : 'PRIVATE',
				introspectionConfig: unwrap(this.props.introspection, true) ? 'ENABLED' : 'DISABLED',
				environmentVariables: JSON.stringify(unwrap(this.props.environment, {})),
			},
		}
	}
}
