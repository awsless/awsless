import { Node } from '../../../core/node'
import { Input } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'
import { ARN } from '../types'

export class DomainName extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			domainName: Input<string>
			certificateArn: Input<ARN>
		}
	) {
		super(parent, 'AWS::AppSync::DomainName', id, props)
	}

	get appSyncDomainName() {
		return this.output<string>(v => v.AppSyncDomainName)
	}

	get domainName() {
		return this.output<string>(v => v.DomainName)
	}

	get hostedZoneId() {
		return this.output<string>(v => v.HostedZoneId)
	}

	toState() {
		return {
			document: {
				DomainName: this.props.domainName,
				CertificateArn: this.props.certificateArn,
			},
		}
	}
}
