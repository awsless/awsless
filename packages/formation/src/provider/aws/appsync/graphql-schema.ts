import { Asset } from '../../../core/asset'
import { Input } from '../../../core/output'
import { Resource } from '../../../core/resource'

export type GraphQLSchemaProps = {
	apiId: Input<string>
	definition: Input<Asset>
}

export class GraphQLSchema extends Resource {
	cloudProviderId = 'aws-appsync-graphql-schema'

	constructor(id: string, private props: GraphQLSchemaProps) {
		super('AWS::AppSync::GraphQLSchema', id, props)
	}

	toState() {
		return {
			assets: {
				definition: this.props.definition,
			},
			document: {
				apiId: this.props.apiId,
			},
		}
	}
}
