import { constantCase } from "change-case";
import { Resource } from "../../resource";
import { formatName, getAtt, ref } from "../../util";

export type IndexProps = {
	hash: string
	sort?: string
	projection?: 'all' | 'keys-only'
}

export type StreamViewType = 'keys-only' | 'new-image' | 'old-image' | 'new-and-old-images'

export type TableProps = {
	name?: string

	hash: string
	sort?: string
	fields?: Record<string, 'string' | 'number' | 'binary'>
	class?: 'standard' | 'standard-infrequent-access'
	pointInTimeRecovery?: boolean
	timeToLiveAttribute?: string
	stream?: StreamViewType
	indexes?: Record<string, IndexProps>
}

export class Table extends Resource {
	readonly name: string
	private indexes: Record<string, IndexProps>

	constructor(logicalId: string, private props: TableProps) {
		super('AWS::DynamoDB::Table', logicalId)

		this.name = formatName(this.props.name || logicalId)
		this.indexes = { ...(this.props.indexes || {}) }

		this.tag('name', this.name)
	}

	enableStream(viewType: StreamViewType) {
		this.props.stream = viewType
	}

	addIndex(name:string, props: IndexProps) {
		this.indexes[name] = props
	}

	get id() {
		return ref(this.logicalId)
	}

	get arn() {
		return getAtt(this.logicalId, 'Arn')
	}

	get streamArn() {
		return getAtt(this.logicalId, 'StreamArn')
	}

	get permissions() {
		return {
			actions: [
				'dynamodb:DescribeTable',
				'dynamodb:PutItem',
				'dynamodb:GetItem',
				'dynamodb:DeleteItem',
				'dynamodb:TransactWrite',
				'dynamodb:BatchWriteItem',
				'dynamodb:BatchGetItem',
				'dynamodb:ConditionCheckItem',
				'dynamodb:Query',
				'dynamodb:Scan',
			],
			resources: [ this.arn ],
		}
	}

	private attributeDefinitions() {
		const fields = this.props.fields || {}
		const attributes = new Set([
			this.props.hash,
			this.props.sort,
			...Object.values(this.props.indexes || {}).map(index => [
				index.hash,
				index.sort,
			])
		].flat().filter(Boolean) as string[])

		const types = {
			string: 'S',
			number: 'N',
			binary: 'B',
		} as const

		return [ ...attributes ].map(name => ({
			AttributeName: name,
			AttributeType: types[fields[name] || 'string']
		}))
	}

	properties() {
		return {
			TableName: this.name,
			BillingMode: 'PAY_PER_REQUEST',
			TableClass: constantCase(this.props.class || 'standard'),
			PointInTimeRecoverySpecification: {
				PointInTimeRecoveryEnabled: this.props.pointInTimeRecovery || false
			},
			KeySchema: [
				{ KeyType: 'HASH', AttributeName: this.props.hash },
				...(this.props.sort ? [{ KeyType: 'RANGE', AttributeName: this.props.sort }] : [])
			],
			AttributeDefinitions: this.attributeDefinitions(),
			...(this.props.stream ? {
				StreamSpecification: {
					StreamViewType: constantCase(this.props.stream),
				},
			} : {}),
			...(this.props.timeToLiveAttribute ? {
				TimeToLiveSpecification: {
					AttributeName: this.props.timeToLiveAttribute,
					Enabled: true,
				},
			} : {}),
			...(Object.keys(this.indexes).length ? {
				GlobalSecondaryIndexes: Object.entries(this.indexes).map(([name, props]) => ({
					IndexName: name,
					KeySchema: [
						{ KeyType: 'HASH', AttributeName: props.hash },
						...(props.sort ? [{ KeyType: 'RANGE', AttributeName: props.sort }] : [])
					],
					Projection: {
						ProjectionType: constantCase(props.projection || 'all')
					},
				}))
			} : {}),
		}
	}
}
