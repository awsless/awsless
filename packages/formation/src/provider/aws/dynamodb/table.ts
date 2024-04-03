import { constantCase } from 'change-case'
import { ARN } from '../types'
import { unwrap, Input } from '../../../core/output'
import { Asset } from '../../../core/asset'
import { TableItem } from './table-item'
import { Statement } from '../iam'
import { CloudControlApiResource } from '../cloud-control-api'

export type IndexProps = {
	hash: string
	sort?: string
	projection?: 'all' | 'keys-only'
}

export type StreamViewType = 'keys-only' | 'new-image' | 'old-image' | 'new-and-old-images'

export type TableProps = {
	name: Input<string>

	hash: Input<string>
	sort?: Input<string>
	fields?: Input<Record<string, Input<'string' | 'number' | 'binary'>>>
	class?: Input<'standard' | 'standard-infrequent-access'>
	pointInTimeRecovery?: Input<boolean>
	deletionProtection?: Input<boolean>
	timeToLiveAttribute?: Input<string>
	stream?: Input<StreamViewType>
	indexes?: Record<string, IndexProps>
}

export class Table extends CloudControlApiResource {
	private indexes: Record<string, IndexProps>

	constructor(id: string, private props: TableProps) {
		super('AWS::DynamoDB::Table', id, props)

		this.indexes = { ...(this.props.indexes || {}) }
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get streamArn() {
		return this.output<ARN>(v => v.StreamArn)
	}

	get name() {
		return this.output<string>(v => v.TableName)
	}

	get hash() {
		return this.output(() => unwrap(this.props.hash))
	}

	get sort() {
		return this.output(() => unwrap(this.props.sort))
	}

	enableStream(viewType: StreamViewType) {
		this.props.stream = viewType
	}

	addIndex(name: string, props: IndexProps) {
		this.indexes[name] = props
	}

	addItem(id: string, item: Input<Asset>) {
		const tableItem = new TableItem(id, {
			table: this,
			item,
		})

		this.add(tableItem)

		return tableItem
	}

	get streamPermissions() {
		return {
			actions: [
				'dynamodb:ListStreams',
				'dynamodb:DescribeStream',
				'dynamodb:GetRecords',
				'dynamodb:GetShardIterator',
			],
			resources: [this.streamArn],
		}
	}

	get permissions() {
		const permissions: Statement[] = [
			{
				actions: [
					'dynamodb:DescribeTable',
					'dynamodb:PutItem',
					'dynamodb:GetItem',
					'dynamodb:UpdateItem',
					'dynamodb:DeleteItem',
					'dynamodb:TransactWrite',
					'dynamodb:BatchWriteItem',
					'dynamodb:BatchGetItem',
					'dynamodb:ConditionCheckItem',
					'dynamodb:Query',
					'dynamodb:Scan',
				],
				resources: [this.arn],
			},
		]

		const indexNames = Object.keys(this.indexes ?? {})

		if (indexNames.length > 0) {
			permissions.push({
				actions: ['dynamodb:Query'],
				resources: indexNames.map(indexName => this.arn.apply(arn => `${arn}/index/${indexName}` as ARN)),
			})
		}

		return permissions
	}

	private attributeDefinitions() {
		const fields = unwrap(this.props.fields, {})
		const attributes = new Set(
			[
				this.props.hash,
				this.props.sort,
				...Object.values(this.props.indexes || {}).map(index => [index.hash, index.sort]),
			]
				.flat()
				.filter(Boolean) as string[]
		)

		const types = {
			string: 'S',
			number: 'N',
			binary: 'B',
		} as const

		return [...attributes].map(name => ({
			AttributeName: name,
			AttributeType: types[unwrap(fields[name], 'string')],
		}))
	}

	toState() {
		return {
			document: {
				TableName: this.props.name,
				BillingMode: 'PAY_PER_REQUEST',
				KeySchema: [
					{ KeyType: 'HASH', AttributeName: this.props.hash },
					...(this.props.sort ? [{ KeyType: 'RANGE', AttributeName: this.props.sort }] : []),
				],
				AttributeDefinitions: this.attributeDefinitions(),
				TableClass: constantCase(unwrap(this.props.class, 'standard')),
				DeletionProtectionEnabled: unwrap(this.props.deletionProtection, false),
				PointInTimeRecoverySpecification: {
					PointInTimeRecoveryEnabled: unwrap(this.props.pointInTimeRecovery, false),
				},
				...(this.props.timeToLiveAttribute
					? {
							TimeToLiveSpecification: {
								AttributeName: this.props.timeToLiveAttribute,
								Enabled: true,
							},
					  }
					: {}),
				...(this.props.stream
					? {
							StreamSpecification: {
								StreamViewType: constantCase(unwrap(this.props.stream)),
							},
					  }
					: {}),
				...(Object.keys(this.indexes).length
					? {
							GlobalSecondaryIndexes: Object.entries(this.indexes).map(([name, props]) => ({
								IndexName: name,
								KeySchema: [
									{ KeyType: 'HASH', AttributeName: props.hash },
									...(props.sort ? [{ KeyType: 'RANGE', AttributeName: props.sort }] : []),
								],
								Projection: {
									ProjectionType: constantCase(props.projection || 'all'),
								},
							})),
					  }
					: {}),
			},
		}
	}
}
