import { ARN } from '../types.js'
import { Input } from '../../../core/output.js'
import { Resource } from '../../../core/resource.js'
import { Node } from '../../../core/node.js'

export type DataSourceProps = {
	apiId: Input<string>
	name: Input<string>
	description?: Input<string>
} & (
	| {
			type: 'none'
	  }
	| {
			type: 'lambda'
			role: Input<ARN>
			functionArn: Input<ARN>
	  }
)

export class DataSource extends Resource {
	cloudProviderId = 'aws-appsync-data-source'

	constructor(readonly parent: Node, id: string, private props: DataSourceProps) {
		super(parent, 'AWS::AppSync::DataSource', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.dataSourceArn)
	}

	get name() {
		return this.output<string>(v => v.name)
	}

	toState() {
		return {
			document: {
				apiId: this.props.apiId,
				name: this.props.name,
				...(this.props.type === 'none'
					? {
							type: 'NONE',
					  }
					: {}),

				...(this.props.type === 'lambda'
					? {
							type: 'AWS_LAMBDA',
							serviceRoleArn: this.props.role,
							lambdaConfig: {
								lambdaFunctionArn: this.props.functionArn,
							},
					  }
					: {}),
			},
		}
	}
}
