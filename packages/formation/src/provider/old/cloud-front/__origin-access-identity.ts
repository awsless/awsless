import { Resource } from '../../resource.js';
import { getAtt } from '../../util.js';

export class OriginAccessIdentity extends Resource {
	constructor(logicalId: string, private props: {
		comment?: string
	} = {}) {
		super('AWS::CloudFront::CloudFrontOriginAccessIdentity', logicalId)
	}

	get id() {
		return getAtt(this.logicalId, 'Id')
	}

	properties() {
		return {
			CloudFrontOriginAccessIdentityConfig: {
				Comment: this.props.comment ?? ''
			}
		}
	}
}
