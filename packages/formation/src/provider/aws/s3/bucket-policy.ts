import { capitalCase } from 'change-case'
import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api'
import { ARN } from '../types'
import { Node } from '../../../core/node'

export class BucketPolicy extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			bucketName: Input<string>
			version?: Input<'2012-10-17'>
			statements: Input<
				Input<{
					effect?: Input<'allow' | 'deny'>
					principal?: Input<string>
					actions: Input<Input<string>[]>
					resources: Input<Input<ARN>[]>
					sourceArn?: Input<ARN>
				}>[]
			>
		}
	) {
		super(parent, 'AWS::S3::BucketPolicy', id, props)
	}

	toState() {
		return {
			document: {
				Bucket: this.props.bucketName,
				PolicyDocument: {
					Version: unwrap(this.props.version, '2012-10-17'),
					Statement: unwrap(this.props.statements, [])
						.map(s => unwrap(s))
						.map(statement => ({
							Effect: capitalCase(unwrap(statement.effect, 'allow')),
							...(statement.principal
								? {
										Principal: {
											Service: statement.principal,
										},
								  }
								: {}),
							Action: statement.actions,
							Resource: statement.resources,
							...(statement.sourceArn
								? {
										Condition: {
											StringEquals: {
												'AWS:SourceArn': statement.sourceArn,
											},
										},
								  }
								: {}),
						})),
				},
			},
		}
	}
}
