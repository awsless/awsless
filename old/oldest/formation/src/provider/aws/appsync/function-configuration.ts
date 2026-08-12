import { Asset } from '../../../core/asset.js'
import { Node } from '../../../core/node.js'
import { Input } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export type FunctionConfigurationProps = {
	apiId: Input<string>
	name: Input<string>
	code: Input<Asset>
	dataSourceName: Input<string>
}

export class FunctionConfiguration extends CloudControlApiResource {
	constructor(readonly parent: Node, id: string, private props: FunctionConfigurationProps) {
		super(parent, 'AWS::AppSync::FunctionConfiguration', id, props)
	}

	get id() {
		return this.output<string>(v => v.FunctionId)
	}

	get arn() {
		return this.output<ARN>(v => v.FunctionArn)
	}

	toState() {
		return {
			assets: {
				code: this.props.code,
			},
			document: {
				ApiId: this.props.apiId,
				DataSourceName: this.props.dataSourceName,
				Name: this.props.name,
				Code: { __ASSET__: 'code' },
				Runtime: {
					Name: 'APPSYNC_JS',
					RuntimeVersion: '1.0.0',
				},
			},
		}
	}
}
