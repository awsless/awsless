import type { BigFloat } from '@awsless/big-float'
import {
	type CompiledQuery,
	type DatabaseConnection,
	type DatabaseIntrospector,
	DefaultQueryCompiler,
	type DialectAdapter,
	type Driver,
	type KyselyPlugin,
	Kysely,
	type LimitNode,
	type OffsetNode,
	type OperationNode,
	OperationNodeTransformer,
	type PluginTransformQueryArgs,
	type PluginTransformResultArgs,
	type QueryResult,
	type RootOperationNode,
	SchemableIdentifierNode,
	type UnknownRow,
	type ValueNode,
} from 'kysely'
import type { ClickHouseClient, QueryParams } from './client'
import { decodeValue } from './type'

// The query builder is Kysely: a typed way to write sql. Every value
// travels as a ClickHouse parameter ({p1:String}) next to the sql, never
// inside it, so there's nothing to escape.
export type {
	ColumnType as ClickHouseColumn,
	Generated as ClickHouseGenerated,
	GeneratedAlways as ClickHouseGeneratedAlways,
	Kysely as ClickHouseQueryBuilder,
} from 'kysely'

export type ClickHouseQueryBuilderProps = {
	// Asked for on every statement.
	client: () => ClickHouseClient | Promise<ClickHouseClient>
	// The table in ClickHouse behind `stack.table`, which the builder names
	// its tables by. Without it, a table is the name it's written with.
	tableName?: (stack: string, table: string) => string
}

// By its shape, not its class: an app can hold a second copy of the package.
const isBigFloat = (value: object): value is BigFloat => {
	const { coefficient, exponent } = value as Partial<BigFloat>

	return typeof coefficient === 'bigint' && typeof exponent === 'number'
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0')

// A moment the way ClickHouse reads a DateTime64(3, 'UTC').
const formatDateTime = (date: Date) => {
	return (
		`${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
		`${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`
	)
}

const INT64_MAX = 2n ** 63n - 1n

// The ClickHouse type a value travels as, and the value in the text or
// shape the client sends for it.
const toParameter = (value: unknown): { type: string; value: unknown } => {
	if (value === null || value === undefined) {
		return { type: 'Nullable(String)', value: null }
	}

	if (typeof value === 'string') {
		return { type: 'String', value }
	}

	if (typeof value === 'boolean') {
		return { type: 'Bool', value }
	}

	if (typeof value === 'number') {
		return { type: Number.isInteger(value) ? 'Int64' : 'Float64', value }
	}

	if (typeof value === 'bigint') {
		return { type: value > INT64_MAX ? 'UInt64' : 'Int64', value: value.toString() }
	}

	if (value instanceof Date) {
		return { type: "DateTime64(3, 'UTC')", value: formatDateTime(value) }
	}

	if (isBigFloat(value)) {
		// As many digits as a decimal holds, with the value's own scale.
		return { type: `Decimal(76, ${Math.max(0, -value.exponent)})`, value: value.toString() }
	}

	if (Array.isArray(value)) {
		const items = value.map(toParameter)

		return { type: `Array(${items[0]?.type ?? 'String'})`, value: items.map(item => item.value) }
	}

	// Anything else is a json document.
	return { type: 'String', value: JSON.stringify(value) }
}

// A row for an insert: what JSON can't carry exactly goes as text.
const toInsertValue = (value: unknown): unknown => {
	if (typeof value === 'bigint') {
		return value.toString()
	}

	if (value instanceof Date) {
		return value.toISOString()
	}

	if (value !== null && typeof value === 'object') {
		if (isBigFloat(value)) {
			return value.toString()
		}

		if (Array.isArray(value)) {
			return value.map(toInsertValue)
		}

		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toInsertValue(item)]))
	}

	return value
}

// Sql in ClickHouse's own spelling: names in backticks, and every value a
// typed parameter.
class ClickHouseQueryCompiler extends DefaultQueryCompiler {
	protected override getLeftIdentifierWrapper() {
		return '`'
	}

	protected override getRightIdentifierWrapper() {
		return '`'
	}

	protected override sanitizeIdentifier(identifier: string) {
		return identifier.replaceAll('\\', '\\\\').replaceAll('`', '\\`')
	}

	// A whole number as it is: a limit takes no parameter everywhere.
	private appendCount(node: OperationNode) {
		const value = node.kind === 'ValueNode' ? (node as ValueNode).value : undefined

		if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
			this.append(String(value))
		} else {
			this.visitNode(node)
		}
	}

	protected override visitLimit(node: LimitNode) {
		this.append('limit ')
		this.appendCount(node.limit)
	}

	protected override visitOffset(node: OffsetNode) {
		this.append('offset ')
		this.appendCount(node.offset)
	}

	protected override appendValue(parameter: unknown) {
		const { type, value } = toParameter(parameter)

		this.addParameter(value)
		this.append(`{p${this.numParameters}:${type}}`)
	}
}

// Turns `stack.table` into the name the table has in ClickHouse.
class TableNameTransformer extends OperationNodeTransformer {
	constructor(private tableName: (stack: string, table: string) => string) {
		super()
	}

	protected override transformSchemableIdentifier(node: SchemableIdentifierNode) {
		const transformed = super.transformSchemableIdentifier(node)

		if (!transformed.schema) {
			return transformed
		}

		return SchemableIdentifierNode.create(this.tableName(transformed.schema.name, transformed.identifier.name))
	}
}

class TableNamePlugin implements KyselyPlugin {
	private transformer: TableNameTransformer

	constructor(tableName: (stack: string, table: string) => string) {
		this.transformer = new TableNameTransformer(tableName)
	}

	transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
		return this.transformer.transformNode(args.node)
	}

	async transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
		return args.result
	}
}

// The rows of an insert of plain values, to send the way ClickHouse takes
// rows in bulk instead of as sql.
const insertRowsOf = (query: CompiledQuery['query']) => {
	if (query.kind !== 'InsertQueryNode' || query.values?.kind !== 'ValuesNode' || !query.into || !query.columns) {
		return
	}

	const node = query as unknown as {
		into: { table: { identifier: { name: string } } }
		columns: { column: { name: string } }[]
		values: { values: ({ kind: string; values: unknown[] } | undefined)[] }
		onConflict?: unknown
		returning?: unknown
	}

	const columns = node.columns.map(column => column.column.name)
	const rows: Record<string, unknown>[] = []

	for (const list of node.values.values) {
		if (list?.kind === 'PrimitiveValueListNode') {
			rows.push(Object.fromEntries(columns.map((column, index) => [column, toInsertValue(list.values[index])])))
			continue
		}

		// A row with an expression in it has to go as sql. A column one row
		// leaves out, where another has it, is left to its default.
		const values = (list?.values ?? []) as { kind: string; value?: unknown }[]
		const isPlain = (value: { kind: string }) =>
			value.kind === 'ValueNode' || value.kind === 'DefaultInsertValueNode'

		if (list?.kind !== 'ValueListNode' || !values.every(isPlain)) {
			return
		}

		rows.push(
			Object.fromEntries(
				columns.flatMap((column, index) => {
					const value = values[index]

					return value?.kind === 'ValueNode' ? [[column, toInsertValue(value.value)]] : []
				})
			)
		)
	}

	return { table: node.into.table.identifier.name, rows }
}

const UNSUPPORTED = {
	transaction:
		"ClickHouse has no transactions: an insert of rows is written whole, and that's all it keeps together.",
	stream: "The query builder doesn't stream a result. Read it in parts, with a limit.",
	update: 'ClickHouse changes rows with a mutation, not an update. Write it as sql: ALTER TABLE … UPDATE … WHERE …',
}

class Connection implements DatabaseConnection {
	constructor(private props: ClickHouseQueryBuilderProps) {}

	async executeQuery<Row>(compiled: CompiledQuery): Promise<QueryResult<Row>> {
		const client = await this.props.client()
		const kind = compiled.query.kind
		const params = Object.fromEntries(
			compiled.parameters.map((value, index) => [`p${index + 1}`, value])
		) as QueryParams

		if (kind === 'UpdateQueryNode') {
			throw new Error(UNSUPPORTED.update)
		}

		const insert = insertRowsOf(compiled.query)

		if (insert) {
			await client.insert(insert.table, insert.rows)

			return { rows: [], numAffectedRows: BigInt(insert.rows.length) }
		}

		// What answers with rows: a select, and sql written out that reads.
		const reads =
			kind === 'SelectQueryNode' ||
			(kind === 'RawNode' && /^\s*(select|with|show|describe|exists)\b/i.test(compiled.sql))

		if (!reads) {
			await client.command(compiled.sql, params)

			return { rows: [] }
		}

		const { columns, rows } = await client.queryTyped(compiled.sql, params)

		return {
			rows: rows.map(row => {
				return Object.fromEntries(
					columns.map(column => [column.name, decodeValue(column.type, row[column.name])])
				)
			}) as Row[],
		}
	}

	streamQuery<Row>(): AsyncIterableIterator<QueryResult<Row>> {
		throw new Error(UNSUPPORTED.stream)
	}
}

const createDriver = (props: ClickHouseQueryBuilderProps): Driver => ({
	async init() {},
	async acquireConnection() {
		return new Connection(props)
	},
	async beginTransaction() {
		throw new Error(UNSUPPORTED.transaction)
	},
	async commitTransaction() {
		throw new Error(UNSUPPORTED.transaction)
	},
	async rollbackTransaction() {
		throw new Error(UNSUPPORTED.transaction)
	},
	async releaseConnection() {},
	async destroy() {},
})

const adapter: DialectAdapter = {
	supportsCreateIfNotExists: true,
	supportsTransactionalDdl: false,
	supportsReturning: false,
	async acquireMigrationLock() {},
	async releaseMigrationLock() {},
}

// The schema is the stack files', not read from the server.
const introspector: DatabaseIntrospector = {
	async getSchemas() {
		return []
	},
	async getTables() {
		return []
	},
}

/**
 * A typed query builder on a ClickHouse client. Values travel as typed
 * parameters, an insert of plain rows as rows, and a result is read by the
 * type of its columns.
 */
export const clickhouseQueryBuilder = <Tables>(props: ClickHouseQueryBuilderProps) => {
	return new Kysely<Tables>({
		dialect: {
			createAdapter: () => adapter,
			createDriver: () => createDriver(props),
			createIntrospector: () => introspector,
			createQueryCompiler: () => new ClickHouseQueryCompiler(),
		},
		plugins: props.tableName ? [new TableNamePlugin(props.tableName)] : [],
	})
}
