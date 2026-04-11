import { Node } from '../../../core/node'
import { Input, unwrap } from '../../../core/output'
import { Resource } from '../../../core/resource'

export type EndpointProps = {
	type: Input<'data' | 'data-ats' | 'credential-provider' | 'jobs'>
}

export class Endpoint extends Resource {
	cloudProviderId = 'aws-iot-endpoint'

	constructor(
		readonly parent: Node,
		id: string,
		private props: EndpointProps
	) {
		super(parent, 'AWS::IoT::Endpoint', id, props)
	}

	get address() {
		return this.output<string>(v => v.address)
	}

	toState() {
		const type = {
			jobs: 'iot:Jobs',
			data: 'iot:Data',
			'data-ats': 'iot:Data-ATS',
			'credential-provider': 'iot:CredentialProvider',
		}[unwrap(this.props.type)]

		return {
			document: {
				endpointType: type,
			},
		}
	}
}
