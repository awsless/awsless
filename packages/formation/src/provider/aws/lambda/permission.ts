import { constantCase } from 'change-case'
import { AwsResource } from '../resource.js'
import { ARN } from '../types.js'
import { Input, unwrap } from '../../../core/output.js'

export type PermissionProps = {
	functionArn: Input<ARN>
	action?: Input<string>
	principal: Input<string>
	sourceArn?: Input<ARN>
	urlAuthType?: Input<'none' | 'aws-iam'>
}

export class Permission extends AwsResource {
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
