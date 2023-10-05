
import { constantCase } from 'change-case';
import { Resource } from '../../resource.js';

export type PermissionProps = {
	functionArn: string
	action: string
	principal: string
	sourceArn?: string
	urlAuthType?: 'none' | 'aws-iam'
}

export class Permission extends Resource {

	constructor(logicalId: string, private props: PermissionProps) {
		super('AWS::Lambda::Permission', logicalId)
	}

	properties() {
		return {
			FunctionName: this.props.functionArn,
			Action: this.props.action || 'lambda:InvokeFunction',
			Principal: this.props.principal,
			...this.attr('FunctionUrlAuthType', this.props.urlAuthType && constantCase(this.props.urlAuthType)),
			...this.attr('SourceArn', this.props.sourceArn),
		}
	}
}
