import { Resource } from '../../resource.js'
import { formatName, getAtt } from '../../util.js'

export class OriginAccessControl extends Resource {
	readonly name: string

	constructor(
		logicalId: string,
		private props: {
			name?: string
			type: 'mediastore' | 's3'
			behavior?: 'always' | 'never' | 'no-override'
			protocol?: 'sigv4'
		}
	) {
		super('AWS::CloudFront::OriginAccessControl', logicalId)
		this.name = formatName(this.props.name || logicalId)
	}

	get id() {
		return getAtt(this.logicalId, 'Id')
	}

	properties() {
		return {
			OriginAccessControlConfig: {
				Name: this.name,
				OriginAccessControlOriginType: this.props.type,
				SigningBehavior: this.props.behavior ?? 'always',
				SigningProtocol: this.props.protocol ?? 'sigv4',
			},
		}
	}
}
