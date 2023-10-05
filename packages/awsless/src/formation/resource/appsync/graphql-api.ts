import { constantCase } from "change-case";
import { Resource } from '../../resource.js';
import { formatName, getAtt, ref } from '../../util.js';
import { Duration } from '../../property/duration.js';

export class GraphQLApi extends Resource {

	readonly name: string
	private lambdaAuthProviders: { arn: string, ttl: Duration }[] = []

	constructor(logicalId: string, private props: {
		name?: string
		authenticationType?: 'api-key'
	}) {
		super('AWS::AppSync::GraphQLApi', logicalId)

		this.name = formatName(this.props.name || logicalId)

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

	addLambdaAuthProvider(lambdaAuthorizerArn: string, resultTTL: Duration = Duration.seconds(0)) {
		this.lambdaAuthProviders.push({
			arn: lambdaAuthorizerArn,
			ttl: resultTTL,
		})

		return this
	}

	properties() {
		return {
			Name: this.name,
			AuthenticationType: constantCase(this.props.authenticationType || 'api-key'),
			AdditionalAuthenticationProviders: this.lambdaAuthProviders.map(provider => ({
				AuthenticationType: 'AWS_LAMBDA',
				LambdaAuthorizerConfig: {
					AuthorizerUri: provider.arn,
					AuthorizerResultTtlInSeconds: provider.ttl.toSeconds(),
				}
			}))
		}
	}
}
