import { Node } from '../../../core/node'
import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api'
import { ARN } from '../types'

export type AuthorizerProps = {
	name: Input<string>
	functionArn: Input<ARN>
	enabled?: Input<boolean>

	enableCachingForHttp?: Input<boolean>
	enableSigning?: Input<boolean>

	tags?: Input<Record<string, Input<string>>>
}

export class Authorizer extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: AuthorizerProps
	) {
		super(parent, 'AWS::IoT::Authorizer', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	toState() {
		return {
			document: {
				AuthorizerName: this.props.name,
				AuthorizerFunctionArn: this.props.functionArn,

				Status: unwrap(this.props.enabled, true) ? 'ACTIVE' : 'INACTIVE',
				SigningDisabled: !unwrap(this.props.enableSigning, false),
				EnableCachingForHttp: unwrap(this.props.enableCachingForHttp, false),

				// TokenKeyName:
				// TokenSigningPublicKeys:
				// 	Key: Value

				Tags: Object.entries(unwrap(this.props.tags, {})).map(([k, v]) => ({
					Key: k,
					Value: v,
				})),
			},
		}
	}
}
