import { constantCase } from 'change-case'
import { ARN } from '../types.js'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'

export type PermissionProps = {
	functionArn: Input<ARN>
	action?: Input<string>
	principal: Input<string>
	sourceArn?: Input<ARN>
	urlAuthType?: Input<'none' | 'aws-iam'>
}

export class Permission extends CloudControlApiResource {
	constructor(id: string, private props: PermissionProps) {
		super('AWS::Lambda::Permission', id, props)
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
