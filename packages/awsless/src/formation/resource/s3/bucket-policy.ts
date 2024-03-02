import { capitalCase } from 'change-case'
import { Resource } from '../../resource.js'
import { formatName } from '../../util.js'

export class BucketPolicy extends Resource {
	constructor(
		logicalId: string,
		private props: {
			bucketName: string
			version?: '2012-10-17'
			statements: {
				effect?: 'allow' | 'deny'
				principal?: string
				actions: string[]
				resources: string[]
				sourceArn?: string
			}[]
		}
	) {
		super('AWS::S3::BucketPolicy', logicalId)
	}

	protected properties() {
		return {
			Bucket: formatName(this.props.bucketName),
			PolicyDocument: {
				Version: this.props.version ?? '2012-10-17',
				Statement: this.props.statements.map(statement => ({
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
		}
	}
}
