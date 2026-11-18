import type { BigFloat } from '@awsless/big-float'
import {
	type CompiledQuery,
	type DatabaseConnection,
	type DatabaseIntrospector,
	DefaultInsertValueNode,
	DefaultQueryCompiler,
	type DialectAdapter,
	type Driver,
	InsertQueryNode,
	type KyselyPlugin,
	Kysely,
	type LimitNode,
	type OffsetNode,
	type OperationNode,
	OperationNodeTransformer,
	type PluginTransformQueryArgs,
	type PluginTransformResultArgs,
	PrimitiveValueListNode,
	type QueryResult,
	type RootOperationNode,
	SchemableIdentifierNode,
	type UnknownRow,
	ValueNode,
	ValuesNode,
} from 'kysely'
import type { ClickHouseClient, QueryParams } from './client'
import { quoteString } from './param'
import { decodeValue } from './type'

// The query builder is Kysely: a typed way to write sql. Every value
// travels as a ClickHouse parameter ({p1:String}) next to the sql, never
// inside it, so there's nothing to escape.
export { sql } from 'kysely'
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

// The narrowest whole number type that holds a value: a parameter of a type
// too narrow for it would not match the value it stands for.
const integerType = (value: bigint) => {
	for (const bits of [64n, 128n, 256n]) {
		if (value >= -(2n ** (bits - 1n)) && value < 2n ** (bits - 1n)) {
			return `Int${bits}`
		}

		if (value >= 0n && value < 2n ** bits) {
			return `UInt${bits}`
		}
	}

	throw new RangeError('ClickHouse has no whole number of more than 256 bits.')
}

const bitsOf = (type: string) => Number(/\d+$/.exec(type)?.[0])

// The type of an array: of the one type that holds every item (the widest
// whole number, a float next to whole numbers, Nullable when an item is
// missing), or a tuple when its items are of different kinds.
const arrayType = (types: string[]) => {
	const item = itemType(types)

	return item ? `Array(${item})` : `Tuple(${types.join(', ')})`
}

const itemType = (types: string[]) => {
	const present = [...new Set(types.filter(type => type !== 'Nullable(String)'))]
	const nullable = (type: string) => (present.length < new Set(types).size ? `Nullable(${type})` : type)

	// An empty array fits a column of any item type.
	if (types.length === 0) {
		return 'Nothing'
	}

	if (present.length <= 1) {
		return nullable(present[0] ?? 'String')
	}

	const integers = present.filter(type => /^U?Int\d+$/.test(type))
	const decimals = present.filter(type => type.startsWith('Decimal('))

	if (integers.length === present.length) {
		const bits = Math.max(...integers.map(bitsOf))
		const signed = integers.some(type => type.startsWith('Int'))
		// A signed item next to an unsigned one of the most bits needs twice those.
		const widest = signed && integers.includes(`UInt${bits}`) ? bits * 2 : bits

		if (widest > 256) {
			throw new RangeError('ClickHouse has no whole number of more than 256 bits.')
		}

		return nullable(`${signed ? 'Int' : 'UInt'}${widest}`)
	}

	if (decimals.length > 0 && integers.length + decimals.length === present.length) {
		return nullable(`Decimal(76, ${Math.max(...decimals.map(type => Number(/, (\d+)\)$/.exec(type)?.[1])))})`)
	}

	if (present.every(type => type === 'Float64' || integers.includes(type))) {
		return nullable('Float64')
	}

	return undefined
}

// An item of an array or tuple the way ClickHouse writes it, so a whole
// number & a decimal keep their digits where the client would quote them.
const formatLiteral = (value: unknown): string => {
	if (value === null || value === undefined) {
		return 'NULL'
	}

	if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
		return String(value)
	}

	if (value instanceof Date) {
		return `'${formatDateTime(value)}'`
	}

	if (typeof value === 'object' && isBigFloat(value)) {
		return value.toString()
	}

	if (Array.isArray(value)) {
		const items = value.map(formatLiteral).join(',')

		return arrayType(value.map(item => toParameter(item).type)).startsWith('Tuple(') ? `(${items})` : `[${items}]`
	}

	const text = typeof value === 'string' ? value : JSON.stringify(toInsertValue(value))

	return `'${text.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
}

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
		return { type: Number.isSafeInteger(value) ? 'Int64' : 'Float64', value }
	}

	if (typeof value === 'bigint') {
		return { type: integerType(value), value: value.toString() }
	}

	if (value instanceof Date) {
		return { type: "DateTime64(3, 'UTC')", value: formatDateTime(value) }
	}

	if (isBigFloat(value)) {
		// As many digits as a decimal holds, with the value's own scale.
		return { type: `Decimal(76, ${Math.max(0, -value.exponent)})`, value: value.toString() }
	}

	if (Array.isArray(value)) {
		return { type: arrayType(value.map(item => toParameter(item).type)), value: formatLiteral(value) }
	}

	// Anything else is a json document, with what json can't carry as text.
	return { type: 'String', value: JSON.stringify(toInsertValue(value)) }
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

	// A whole number as it is: the in-memory engine of the tests takes no
	// parameter for a limit, where ClickHouse does.
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

		// An array or tuple travels as the text ClickHouse writes it in, which
		// it reads back into the type: the client itself would quote a big
		// whole number and has no way to write a decimal.
		this.append(
			Array.isArray(parameter)
				? `CAST({p${this.numParameters}:String}, ${quoteString(type)})`
				: `{p${this.numParameters}:${type}}`
		)
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

// What ClickHouse has no word for on an insert.
const INSERT_CLAUSES = ['returning', 'onConflict', 'onDuplicateKey', 'orAction', 'ignore', 'replace', 'top', 'output']

// The rows of an insert of plain values, to send the way ClickHouse takes
// rows in bulk instead of as sql. An insert with more to it goes as sql.
const insertRowsOf = (query: CompiledQuery['query']) => {
	if (!InsertQueryNode.is(query)) {
		return
	}

	for (const clause of INSERT_CLAUSES) {
		if ((query as unknown as Record<string, unknown>)[clause]) {
			throw new Error(UNSUPPORTED.insert)
		}
	}

	const { into, columns, values, ...rest } = query
	const hasMore = Object.entries(rest).some(([key, value]) => key !== 'kind' && value !== undefined)

	if (hasMore || !into || !columns || !values || !ValuesNode.is(values)) {
		return
	}

	const names = columns.map(column => column.column.name)
	const rows: Record<string, unknown>[] = []

	for (const list of values.values) {
		if (PrimitiveValueListNode.is(list)) {
			rows.push(Object.fromEntries(names.map((name, index) => [name, toInsertValue(list.values[index])])))
			continue
		}

		// A row with an expression in it has to go as sql. A column one row
		// leaves out, where another has it, is left to its default.
		if (!list.values.every(value => ValueNode.is(value) || DefaultInsertValueNode.is(value))) {
			return
		}

		rows.push(
			Object.fromEntries(
				names.flatMap((name, index) => {
					const value = list.values[index]

					return value && ValueNode.is(value) ? [[name, toInsertValue(value.value)]] : []
				})
			)
		)
	}

	const { schema, identifier } = into.table

	return { table: schema ? ([schema.name, identifier.name] as [string, string]) : identifier.name, rows }
}

// Sql written out answers with rows unless it starts as a statement that
// writes, behind any comment or bracket.
const WRITES =
	/^(insert|alter|create|drop|truncate|rename|optimize|delete|update|system|grant|revoke|set|use|attach|detach|exchange|kill|undrop|backup|restore)\b/i

const writes = (sql: string) => WRITES.test(sql.replace(/^(\s+|\(|--[^\n]*\n?|\/\*[\s\S]*?\*\/)+/, ''))

const UNSUPPORTED = {
	transaction:
		"ClickHouse has no transactions: an insert of rows is written whole, and that's all it keeps together.",
	stream: "The query builder doesn't stream a result. Read it in parts, with a limit.",
	update: 'ClickHouse changes rows with a mutation, not an update. Write it as sql: ALTER TABLE … UPDATE … WHERE …',
	insert: 'ClickHouse inserts rows and nothing more: it has no returning, on conflict, ignore or replace.',
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

		// What answers with rows: a select, and sql written out that doesn't write.
		const reads = kind === 'SelectQueryNode' || (kind === 'RawNode' && !writes(compiled.sql))

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
