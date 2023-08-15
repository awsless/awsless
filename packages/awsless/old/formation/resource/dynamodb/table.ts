import { constantCase } from "change-case";
import { Resource } from "../../resource";
import { Stack } from "../../stack";
import { formatName, ref } from "../../util";

export type IndexProps = {
	hash: string
	sort?: string
	projection?: 'all' | 'keys-only'
}

export type TableProps = {
	name?: string

	hash: string
	sort?: string
	fields: Record<string, 'string' | 'number' | 'binary'>
	class?: 'standard' | 'standard-infrequent-access'
	pointInTimeRecovery?: boolean
	timeToLiveAttribute?: string
	indexes?: Record<string, IndexProps>
}

export class Table extends Resource {
	readonly name: string
	private indexes: Record<string, IndexProps>

	constructor(readonly logicalId: string, private props: TableProps) {
		super('dynamodb', 'table', logicalId)

		this.name = formatName(this.props.name || logicalId)
		this.indexes = { ...(this.props.indexes || {}) }
	}

	addIndex(name:string, props: IndexProps) {
		this.indexes[name] = props
	}

	get arn() {
		return ref(`${ this.logicalId }Table`)
	}

	get permissions() {
		return {
			action: [
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
			resource: [ this.arn ],
		}
	}

	template(stack:Stack) {
		return {
			[ `${ this.logicalId }Table` ]: {
				Type: 'AWS::DynamoDB::Table',
				Properties: {
					TableName: stack.formatResourceName(this.name),
					BillingMode: 'PAY_PER_REQUEST',
					TableClass: constantCase(this.props.class || 'standard'),
					PointInTimeRecoverySpecification: {
						PointInTimeRecoveryEnabled: this.props.pointInTimeRecovery || false
					},
					KeySchema: [
						{ KeyType: 'HASH', AttributeName: this.props.hash },
						...(this.props.sort ? [{ KeyType: 'RANGE', AttributeName: this.props.sort }] : [])
					],
					AttributeDefinitions: Object.entries(this.props.fields).map(([ name, type ]) => ({
						AttributeName: name,
						AttributeType: type[0].toUpperCase(),
					})),
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
	}
}
