import { constantCase } from 'change-case'
import { ARN } from '../types.js'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { Node } from '../../../core/node.js'
import { Resource } from '../../../core/resource.js'

export type ImageProps = {
	name: Input<string>
	emptyOnDelete?: Input<boolean>
	// functionArn: Input<ARN>
	// action?: Input<string>
	// principal: Input<string>
	// sourceArn?: Input<ARN>
	// urlAuthType?: Input<'none' | 'aws-iam'>
}

export class Image extends Resource {
	constructor(readonly parent: Node, id: string, private props: ImageProps) {
		super(parent, 'AWS::ECR::Repository', id, props)
	}

	toState() {
		return {
			document: {
				EmptyOnDelete: this.props.emptyOnDelete,
				// EncryptionConfiguration: EncryptionConfiguration,
				// ImageScanningConfiguration: ImageScanningConfiguration,
				// ImageTagMutability: String,
				// LifecyclePolicy: LifecyclePolicy,
				RepositoryName: this.props.name,
				// RepositoryPolicyText: Json,

				// FunctionName: this.props.functionArn,
				// Action: unwrap(this.props.action, 'lambda:InvokeFunction'),
				// Principal: this.props.principal,
				// ...this.attr('SourceArn', this.props.sourceArn),
				// ...this.attr('FunctionUrlAuthType', this.props.urlAuthType, constantCase),
			},
		}
	}
}
