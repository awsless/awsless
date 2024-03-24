import { Input } from '../../../resource/output'
import { Resource } from '../../../resource/resource'
// import { sha256 } from '../../../resource/hash'
import { Table } from './table'
import { Asset } from '../../../resource/asset'

export class TableItem extends Resource {
	cloudProviderId = 'aws-dynamodb-table-item'

	constructor(
		id: string,
		private props: {
			table: Table
			item: Input<Asset>
		}
	) {
		super('AWS::DynamoDB::Table::Item', id, props)
	}

	// get staticProps() {
	// 	return ['table', 'key']
	// }

	toState() {
		const table = this.props.table

		return {
			assets: {
				item: this.props.item,
			},
			document: {
				table: table.name,
				hash: table.hash,
				sort: table.sort,
			},
		}
	}
}
