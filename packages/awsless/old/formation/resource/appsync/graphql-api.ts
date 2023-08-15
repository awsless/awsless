import { constantCase } from "change-case";
import { BuildProps, Resource } from "../../resource";
import { Stack } from "../../stack";
import { formatName, getAtt, ref } from "../../util";
import { Duration } from "../../property/duration";
import { readFile } from "fs/promises";
import { mergeTypeDefs } from "@graphql-tools/merge";
import { print } from "graphql";

export type DomainProps = {
	name?: string
	authenticationType?: 'api-key'
	schema: string | string[]
}

export class GraphQLApi extends Resource {

	readonly name: string

	private domain?: { name: string, certificate: string }
	private lambdaAuthProviders: { arn: string, ttl: Duration }[] = []
	private schema?: string

	constructor(readonly logicalId: string, private props: DomainProps) {
		super('appsync', 'graphql', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	get arn() {
		return ref(`${ this.logicalId }GraphQLApi`)
	}

	get id() {
		return getAtt(`${ this.logicalId }GraphQLApi`, 'ApiId')
	}

	get url() {
		return getAtt(`${ this.logicalId }GraphQLApi`, 'GraphQLUrl')
	}

	get dns() {
		return getAtt(`${ this.logicalId }GraphQLApi`, 'GraphQLDns')
	}

	addLambdaAuthProvider(lambdaAuthorizerArn: string, resultTTL: Duration = Duration.seconds(0)) {
		this.lambdaAuthProviders.push({
			arn: lambdaAuthorizerArn,
			ttl: resultTTL,
		})

		return this
	}

	attachDomainName(domainName: string, certificateArn: string) {
		this.domain = {
			name: domainName,
			certificate: certificateArn
		}

		return this
	}

	async build({ write }: BuildProps) {
		const files = [ this.props.schema ].flat()
		const schemas = await Promise.all(files.map(file => {
			return readFile(file, 'utf8')
		}))

		const schema = print(mergeTypeDefs(schemas))
		await write('schema.gql', schema)

		this.schema = schema
	}

	template(stack: Stack) {
		return {
			[ `${ this.logicalId }GraphQLApi` ]: {
				Type: 'AWS::AppSync::GraphQLApi',
				Properties: {
					Name: stack.formatResourceName(this.name),
					AuthenticationType: constantCase(this.props.authenticationType || 'api-key'),
					AdditionalAuthenticationProviders: this.lambdaAuthProviders.map(provider => ({
						AuthenticationType: 'AWS_LAMBDA',
						LambdaAuthorizerConfig: {
							AuthorizerUri: provider.arn,
							AuthorizerResultTtlInSeconds: provider.ttl.toSeconds(),
						}
					}))
				}
			},
			[ `${ this.logicalId }GraphQLSchema` ]: {
				Type: 'AWS::AppSync::GraphQLSchema',
				Properties: {
					Name: stack.formatResourceName(this.name),
					ApiId: this.id,
					Definition: this.schema,
				}
			},
			...(this.domain ? {
				[ `${ this.logicalId }DomainName` ]: {
					Type: 'AWS::AppSync::DomainName',
					Properties: {
						DomainName: this.domain.name,
						CertificateArn: this.domain.certificate,
					}
				}
			} : {}),
		}
	}
}
