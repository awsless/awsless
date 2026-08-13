import { constantCase } from 'change-case'
import { Node } from '../../../core/node.js'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { ARN } from '../types.js'

export type PermissionProps = {
	functionArn: Input<ARN>
	action?: Input<string>
	principal: Input<string>
	sourceArn?: Input<ARN>
	urlAuthType?: Input<'none' | 'aws-iam'>
}

export class Permission extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: PermissionProps
	) {
		super(parent, 'AWS::Lambda::Permission', id, props)
	}

	toState() {
		return {
			document: {
				FunctionName: this.props.functionArn,
				Action: unwrap(this.props.action, 'lambda:InvokeFunction'),
				Principal: this.props.principal,
				...this.attr('SourceArn', this.props.sourceArn),
				...this.attr('FunctionUrlAuthType', this.props.urlAuthType, constantCase),

				// ...(this.props.sourceArn ? { SourceArn: this.props.sourceArn } : {}),
				// ...(this.props.urlAuthType
				// 	? { FunctionUrlAuthType: constantCase(unwrap(this.props.urlAuthType)) }
				// 	: {}),
			},
		}
	}
}
