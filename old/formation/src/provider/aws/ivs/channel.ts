import { constantCase } from 'change-case'
import { Node } from '../../../core/node'
import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api'
import { ARN } from '../types'

export type ChannelProps = {
	name: Input<string>
	type?: Input<'standard' | 'basic' | 'advanced-sd' | 'advanced-hd'>
	preset?: Input<'higher' | 'constrained'>
	latencyMode?: Input<'normal' | 'low'>
	authorized?: Input<boolean>
	insecureIngest?: Input<boolean>
	tags?: Input<Record<string, Input<string>>>
}

export class Channel extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: ChannelProps
	) {
		super(parent, 'AWS::IVS::Channel', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get ingestEndpoint() {
		return this.output<string>(v => v.IngestEndpoint)
	}

	get playbackUrl() {
		return this.output<string>(v => v.PlaybackUrl)
	}

	toState() {
		return {
			document: {
				Name: this.props.name,
				Type: constantCase(unwrap(this.props.type, 'standard')),
				LatencyMode: constantCase(unwrap(this.props.latencyMode, 'low')),
				...this.attr('Preset', this.props.preset, v => `${v.toUpperCase()}_BANDWIDTH_DELIVERY`),
				...this.attr('Authorized', this.props.authorized),
				...this.attr('InsecureIngest', this.props.insecureIngest),
				Tags: Object.entries(unwrap(this.props.tags, {})).map(([k, v]) => ({
					Key: k,
					Value: v,
				})),
			},
		}
	}
}
