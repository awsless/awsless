import { constantCase } from 'change-case'
import { Asset } from '../../../core/asset.js'
import { Node } from '../../../core/node.js'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export type ResolverProps = {
	apiId: Input<string>
	kind: Input<'pipeline' | 'unit'>
	runtime: Input<{
		name: 'appsync-js'
		version: '1.0.0'
	}>
	typeName: Input<string>
	fieldName: Input<string>
	dataSourceName: Input<string>
	// functions: Input<Input<string>[]>
	code: Input<Asset>
}

export class Resolver extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: ResolverProps
	) {
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
				Kind: unwrap(this.props.kind).toUpperCase(),
				TypeName: this.props.typeName,
				FieldName: this.props.fieldName,
				DataSourceName: this.props.dataSourceName,
				// PipelineConfig: {
				// 	Functions: this.props.functions,
				// },
				Code: { __ASSET__: 'code' },
				Runtime: {
					Name: constantCase(unwrap(this.props.runtime).name),
					RuntimeVersion: unwrap(this.props.runtime).version,
				},
			},
		}
	}
}
