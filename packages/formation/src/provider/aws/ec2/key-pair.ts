import { Node } from '../../../core/node'
import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'

export class KeyPair extends CloudControlApiResource {
	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			name: Input<string>
			type?: Input<'rsa' | 'ed25519'>
			format?: Input<'pem' | 'ppk'>
			publicKey?: Input<string>
			tags?: Input<Record<string, Input<string>>>
		}
	) {
		super(parent, 'AWS::EC2::KeyPair', id, props)
	}

	get id() {
		return this.output<string>(v => v.KeyPairId)
	}

	get fingerprint() {
		return this.output<string>(v => v.KeyFingerprint)
	}

	get name() {
		return this.output<string>(v => v.KeyName)
	}

	toState() {
		return {
			document: {
				KeyName: this.props.name,
				KeyType: unwrap(this.props.type, 'rsa'),
				KeyFormat: unwrap(this.props.format, 'pem'),
				PublicKeyMaterial: this.props.publicKey,
				Tags: Object.entries(unwrap(this.props.tags, {})).map(([k, v]) => ({
					Key: k,
					Value: v,
				})),
			},
		}
	}
}
