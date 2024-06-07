import { Node } from '../../../core/node'
import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api'
import { ARN } from '../types'

export type StreamKeyProps = {
	channel: Input<ARN>
	tags?: Input<Record<string, Input<string>>>
}

export class StreamKey extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: StreamKeyProps
	) {
		super(parent, 'AWS::IVS::StreamKey', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get value() {
		return this.output<string>(v => v.Value)
	}

	toState() {
		return {
			document: {
				ChannelArn: this.props.channel,
				Tags: Object.entries(unwrap(this.props.tags, {})).map(([k, v]) => ({
					Key: k,
					Value: v,
				})),
			},
		}
	}
}
