import { capitalCase } from 'change-case'
import { AwsResource } from '../resource'
import { Input, unwrap } from '../../../resource/output'

export class BucketPolicy extends AwsResource {
	constructor(
		id: string,
		private props: {
			bucketName: Input<string>
			version?: '2012-10-17'
			statements: Input<
				Input<{
					effect?: 'allow' | 'deny'
					principal?: string
					actions: string[]
					resources: string[]
					sourceArn?: string
				}>[]
			>
		}
	) {
		super('AWS::S3::BucketPolicy', id)
	}

	toState() {
		return {
			document: {
				Bucket: this.props.bucketName,
				PolicyDocument: {
					Version: this.props.version ?? '2012-10-17',
					Statement: unwrap(this.props.statements, [])
						.map(s => unwrap(s))
						.map(statement => ({
							Effect: capitalCase(statement.effect ?? 'allow'),
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
