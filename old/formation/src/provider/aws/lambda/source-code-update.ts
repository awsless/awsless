import { Asset } from '../../../core/asset'
import { Node } from '../../../core/node.js'
import { Input, unwrap } from '../../../core/output.js'
import { Resource } from '../../../core/resource'
import { Code, formatCode } from './code.js'

export type SourceCodeUpdateProps = {
	functionName: Input<string>
	version: Input<Asset>
	code: Input<Code>
	architecture: Input<'arm64' | 'x86_64'>
}

export class SourceCodeUpdate extends Resource {
	cloudProviderId = 'aws-lambda-source-code-update'

	constructor(
		readonly parent: Node,
		id: string,
		private props: SourceCodeUpdateProps
	) {
		super(parent, 'AWS::Lambda::SourceCodeUpdate', id, props)
	}

	toState() {
		return {
			assets: {
				version: this.props.version,
			},
			document: {
				FunctionName: this.props.functionName,
				Architectures: [unwrap(this.props.architecture, 'arm64')],
				Code: formatCode(unwrap(this.props.code)),
			},
		}
	}
}
