
import { Resource } from "../../resource";
import { ref } from "../../util";

export type HostedZoneProps = {
	domainName?: string
}

export class HostedZone extends Resource {
	readonly name: string

	constructor(readonly logicalId: string, private props: HostedZoneProps = {}) {
		super('route53', 'hosted-zone', logicalId)
		this.name = this.props.domainName || this.logicalId
	}

	get id() {
		return ref(`${ this.logicalId }HostedZone`)
	}

	template() {
		return {
			[ `${ this.logicalId }HostedZone` ]: {
				Type: 'AWS::Route53::HostedZone',
				Properties: {
					Name: this.name + '.'
				}
			}
		}
	}
}
