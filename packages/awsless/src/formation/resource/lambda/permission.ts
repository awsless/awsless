
import { Resource } from "../../resource";

export type PermissionProps = {
	functionArn: string
	action: string
	principal: string
	sourceArn?: string
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
			...this.attr('SourceArn', this.props.sourceArn),
		}
	}
}
