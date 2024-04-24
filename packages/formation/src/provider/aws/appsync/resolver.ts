import { Asset } from '../../../core/asset.js'
import { Node } from '../../../core/node.js'
import { Input } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export type ResolverProps = {
	apiId: Input<string>
	typeName: Input<string>
	fieldName: Input<string>
	functions: Input<Input<string>[]>
	code: Input<Asset>
}

export class Resolver extends CloudControlApiResource {
	constructor(readonly parent: Node, id: string, private props: ResolverProps) {
		super(parent, 'AWS::AppSync::Resolver', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.ResolverArn)
	}

	toState() {
		return {
			assets: {
				code: this.props.code,
			},
			document: {
				ApiId: this.props.apiId,
				Kind: 'PIPELINE',
				TypeName: this.props.typeName,
				FieldName: this.props.fieldName,
				PipelineConfig: {
					Functions: this.props.functions,
				},
				Code: { __ASSET__: 'code' },
				Runtime: {
					Name: 'APPSYNC_JS',
					RuntimeVersion: '1.0.0',
				},
			},
		}
	}
}
