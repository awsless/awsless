import { Input, unwrap } from '../../../resource/output.js'
import { AwsResource } from '../resource.js'

export type HostedZoneProps = {
	name: Input<string>
}

export class HostedZone extends AwsResource {
	constructor(id: string, private props: HostedZoneProps) {
		super('AWS::Route53::HostedZone', id, props)
	}

	get id() {
		return this.output<string>(v => v.Id)
	}

	get name() {
		return this.output<string>(v => v.Name)
	}

	get nameServers() {
		return this.output<string[]>(v => v.NameServers)
	}

	toState() {
		const name = unwrap(this.props.name)

		return {
			document: {
				Name: name.endsWith('.') ? name : name + '.',
			},
		}
	}
}
