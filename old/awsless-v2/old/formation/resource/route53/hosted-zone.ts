import { Resource } from '../../resource.js'

export type HostedZoneProps = {
	domainName?: string
}

export class HostedZone extends Resource {
	constructor(logicalId: string, private props: HostedZoneProps = {}) {
		super('AWS::Route53::HostedZone', logicalId)
	}

	get id() {
		return this.ref()
	}

	protected properties() {
		return {
			Name: this.props.domainName + '.',
		}
	}
}
