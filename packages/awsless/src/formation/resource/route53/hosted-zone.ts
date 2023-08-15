
import { Resource } from "../../resource";
import { ref } from "../../util";

export type HostedZoneProps = {
	domainName?: string
}

export class HostedZone extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: HostedZoneProps = {}) {
		super('AWS::Route53::HostedZone', logicalId)
		this.name = this.props.domainName || logicalId
	}

	get id() {
		return ref(this.logicalId)
	}

	properties() {
		return {
			Name: this.name + '.'
		}
	}
}
