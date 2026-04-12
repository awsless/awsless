import { Node } from '../../../core/node.js'
import { Input, unwrap } from '../../../core/output.js'
import { CloudControlApiResource } from '../cloud-control-api'
import { ARN } from '../types.js'
import { formatCode, S3Code } from './code.js'

export type LayerProps = {
	name: Input<string>
	code: Input<S3Code>
	description?: Input<string>
	architectures?: Input<'arm64' | 'x86_64'>[]
	runtimes?: Input<'nodejs18.x' | 'nodejs20.x' | 'nodejs22.x'>[]
}

export class Layer extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: LayerProps
	) {
		super(parent, 'AWS::Lambda::LayerVersion', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.LayerVersionArn)
	}

	toState() {
		if (unwrap(this.props.name).length > 140) {
			throw new TypeError(`Layer function name length can't be greater then 140. ${unwrap(this.props.name)}`)
		}

		return {
			document: {
				LayerName: this.props.name,
				Description: this.props.description,
				Content: formatCode(unwrap(this.props.code)),
				CompatibleArchitectures: unwrap(this.props.architectures),
				CompatibleRuntimes: unwrap(this.props.runtimes),
			},
		}
	}
}
