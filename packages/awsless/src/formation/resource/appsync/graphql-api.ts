import { constantCase } from "change-case";
import { Group, Resource } from "../../resource";
import { formatName, getAtt, ref } from "../../util";
import { Duration } from "../../property/duration";
import { Schema } from "./schema";

export type GraphQLProps = {
	name?: string
	authenticationType?: 'api-key'
	schema: Schema
}

export class GraphQL extends Group {
	readonly api: GraphQLApi
	readonly schema: GraphQLSchema

	constructor(private logicalId: string, props: GraphQLProps) {
		const api = new GraphQLApi(logicalId, props)
		const schema = new GraphQLSchema(logicalId, {
			apiId: api.id,
			definition: props.schema,
		}).dependsOn(api)

		super([ api, schema ])

		this.api = api
		this.schema = schema
	}

	attachDomainName(domainName: string, certificateArn: string) {
		const id = this.logicalId + domainName
		const domain = new DomainName(id, {
			domainName,
			certificateArn
		})

		const association = new DomainNameApiAssociation(id, {
			apiId: this.api.id,
			domainName,
		}).dependsOn(this.api, domain)

		this.children.push(domain, association)

		return this
	}
}


class GraphQLApi extends Resource {

	readonly name: string
	private lambdaAuthProviders: { arn: string, ttl: Duration }[] = []

	constructor(logicalId: string, private props: {
		name?: string
		authenticationType?: 'api-key'
	}) {
		super('AWS::AppSync::GraphQLApi', logicalId)

		this.name = formatName(this.props.name || logicalId)
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


class GraphQLSchema extends Resource {
	constructor(logicalId: string, private props: {
		apiId: string
		definition: Schema
	}) {
		super('AWS::AppSync::GraphQLSchema', logicalId, [
			props.definition
		])
	}

	properties() {
		return {
			ApiId: this.props.apiId,
			Definition: this.props.definition.toDefinition(),
		}
	}
}

class DomainName extends Resource {
	constructor(logicalId: string, private props: {
		domainName: string
		certificateArn: string
	}) {
		super('AWS::AppSync::DomainName', logicalId)
	}

	properties() {
		return {
			DomainName: this.props.domainName,
			CertificateArn: this.props.certificateArn,
		}
	}
}

class DomainNameApiAssociation extends Resource {
	constructor(logicalId: string, private props: {
		apiId: string
		domainName: string
	}) {
		super('AWS::AppSync::DomainNameApiAssociation', logicalId)
	}

	properties() {
		return {
			ApiId: this.props.apiId,
			DomainName: this.props.domainName,
		}
	}
}
