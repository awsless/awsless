import { Input, unwrap } from '../../../core/output'
import { CloudControlApiResource } from '../cloud-control-api/resource'

export class SourceApiAssociation extends CloudControlApiResource {
	constructor(
		id: string,
		private props: {
			mergedApiId: Input<string>
			sourceApiId: Input<string>
			mergeType?: 'manual' | 'auto'
		}
	) {
		super('AWS::AppSync::SourceApiAssociation', id, props)
	}

	toState() {
		return {
			document: {
				MergedApiIdentifier: this.props.mergedApiId,
				SourceApiIdentifier: this.props.sourceApiId,
				SourceApiAssociationConfig: {
					MergeType: unwrap(this.props.mergeType, 'auto') ? 'AUTO_MERGE' : 'MANUAL_MERGE',
				},
			},
		}
	}
}
