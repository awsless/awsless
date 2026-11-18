import { decodeValue } from "./type.js";
import { ClickHouseError, ClickHouseLogLevel, createClient } from "@clickhouse/client";
import { DefaultInsertValueNode, DefaultQueryCompiler, InsertQueryNode, Kysely, OperationNodeTransformer, PrimitiveValueListNode, SchemableIdentifierNode, ValueNode, ValuesNode, sql } from "kysely";
//#region src/param.ts
const escape = (value) => {
	return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll("	", "\\t").replaceAll("\n", "\\n").replaceAll("\r", "\\r");
};
const quoteIdentifier = (name) => {
	return `\`${name.replaceAll("\\", "\\\\").replaceAll("`", "\\`")}\``;
};
const quoteString = (value) => {
	return `'${escape(value)}'`;
};
//#endregion
//#region src/client.ts
const QUERY_SETTINGS = {
	output_format_json_quote_64bit_integers: 0,
	date_time_output_format: "iso"
};
const TYPED_QUERY_SETTINGS = {
	output_format_json_quote_64bit_integers: 1,
	output_format_json_quote_decimals: 1,
	date_time_output_format: "iso"
};
const INSERT_SETTINGS = { date_time_input_format: "best_effort" };
const clickhouseClient = (props) => {
	let client;
	const getClient = () => {
		client ??= (async () => {
			return createClient({
				url: props.endpoint,
				username: props.username ?? "default",
				password: typeof props.password === "function" ? await props.password() : props.password ?? "",
				database: props.database,
				clickhouse_settings: props.settings,
				request_timeout: props.requestTimeout,
				log: props.silent ? { level: ClickHouseLogLevel.OFF } : void 0
			});
		})().catch((error) => {
			client = void 0;
			throw error;
		});
		return client;
	};
	return {
		async query(sql, params, settings) {
			return (await (await getClient()).query({
				query: sql,
				format: "JSONEachRow",
				query_params: params,
				clickhouse_settings: {
					...QUERY_SETTINGS,
					...settings
				}
			})).json();
		},
		async queryTyped(sql, params, settings) {
			const { meta, data } = await (await (await getClient()).query({
				query: sql,
				format: "JSON",
				query_params: params,
				clickhouse_settings: {
					...TYPED_QUERY_SETTINGS,
					...settings
				}
			})).json();
			return {
				columns: meta ?? [],
				rows: data
			};
		},
		async command(sql, params, settings) {
			await (await getClient()).command({
				query: sql,
				query_params: params,
				clickhouse_settings: settings
			});
		},
		async insert(table, rows, options = {}) {
			if (rows.length === 0) return;
			await (await getClient()).insert({
				table: [table].flat().map(quoteIdentifier).join("."),
				values: rows,
				format: "JSONEachRow",
				clickhouse_settings: {
					...INSERT_SETTINGS,
					...options.async ? {
						async_insert: 1,
						wait_for_async_insert: 1
					} : {},
					...options.settings
				}
			});
		},
		async close() {
			const current = client;
			client = void 0;
			await (await current)?.close();
		}
	};
};
//#endregion
//#region src/query-builder.ts
const isBigFloat = (value) => {
	const { coefficient, exponent } = value;
	return typeof coefficient === "bigint" && typeof exponent === "number";
};
const pad = (value, length = 2) => String(value).padStart(length, "0");
const formatDateTime = (date) => {
	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`;
};
const integerType = (value) => {
	for (const bits of [
		64n,
		128n,
		256n
	]) {
		if (value >= -(2n ** (bits - 1n)) && value < 2n ** (bits - 1n)) return `Int${bits}`;
		if (value >= 0n && value < 2n ** bits) return `UInt${bits}`;
	}
	throw new RangeError("ClickHouse has no whole number of more than 256 bits.");
};
const bitsOf = (type) => Number(/\d+$/.exec(type)?.[0]);
const arrayType = (types) => {
	const item = itemType(types);
	return item ? `Array(${item})` : `Tuple(${types.join(", ")})`;
};
const itemType = (types) => {
	const present = [...new Set(types.filter((type) => type !== "Nullable(String)"))];
	const nullable = (type) => present.length < new Set(types).size ? `Nullable(${type})` : type;
	if (types.length === 0) return "Nothing";
	if (present.length <= 1) return nullable(present[0] ?? "String");
	const integers = present.filter((type) => /^U?Int\d+$/.test(type));
	const decimals = present.filter((type) => type.startsWith("Decimal("));
	if (integers.length === present.length) {
		const bits = Math.max(...integers.map(bitsOf));
		const signed = integers.some((type) => type.startsWith("Int"));
		const widest = signed && integers.includes(`UInt${bits}`) ? bits * 2 : bits;
		if (widest > 256) throw new RangeError("ClickHouse has no whole number of more than 256 bits.");
		return nullable(`${signed ? "Int" : "UInt"}${widest}`);
	}
	if (decimals.length > 0 && integers.length + decimals.length === present.length) return nullable(`Decimal(76, ${Math.max(...decimals.map((type) => Number(/, (\d+)\)$/.exec(type)?.[1])))})`);
	if (present.every((type) => type === "Float64" || integers.includes(type))) return nullable("Float64");
};
const formatLiteral = (value) => {
	if (value === null || value === void 0) return "NULL";
	if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") return String(value);
	if (value instanceof Date) return `'${formatDateTime(value)}'`;
	if (typeof value === "object" && isBigFloat(value)) return value.toString();
	if (Array.isArray(value)) {
		const items = value.map(formatLiteral).join(",");
		return arrayType(value.map((item) => toParameter(item).type)).startsWith("Tuple(") ? `(${items})` : `[${items}]`;
	}
	return `'${(typeof value === "string" ? value : JSON.stringify(toInsertValue(value))).replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
};
const toParameter = (value) => {
	if (value === null || value === void 0) return {
		type: "Nullable(String)",
		value: null
	};
	if (typeof value === "string") return {
		type: "String",
		value
	};
	if (typeof value === "boolean") return {
		type: "Bool",
		value
	};
	if (typeof value === "number") return {
		type: Number.isSafeInteger(value) ? "Int64" : "Float64",
		value
	};
	if (typeof value === "bigint") return {
		type: integerType(value),
		value: value.toString()
	};
	if (value instanceof Date) return {
		type: "DateTime64(3, 'UTC')",
		value: formatDateTime(value)
	};
	if (isBigFloat(value)) return {
		type: `Decimal(76, ${Math.max(0, -value.exponent)})`,
		value: value.toString()
	};
	if (Array.isArray(value)) return {
		type: arrayType(value.map((item) => toParameter(item).type)),
		value: formatLiteral(value)
	};
	return {
		type: "String",
		value: JSON.stringify(toInsertValue(value))
	};
};
const toInsertValue = (value) => {
	if (typeof value === "bigint") return value.toString();
	if (value instanceof Date) return value.toISOString();
	if (value !== null && typeof value === "object") {
		if (isBigFloat(value)) return value.toString();
		if (Array.isArray(value)) return value.map(toInsertValue);
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toInsertValue(item)]));
	}
	return value;
};
var ClickHouseQueryCompiler = class extends DefaultQueryCompiler {
	getLeftIdentifierWrapper() {
		return "`";
	}
	getRightIdentifierWrapper() {
		return "`";
	}
	sanitizeIdentifier(identifier) {
		return identifier.replaceAll("\\", "\\\\").replaceAll("`", "\\`");
	}
	appendCount(node) {
		const value = node.kind === "ValueNode" ? node.value : void 0;
		if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) this.append(String(value));
		else this.visitNode(node);
	}
	visitLimit(node) {
		this.append("limit ");
		this.appendCount(node.limit);
	}
	visitOffset(node) {
		this.append("offset ");
		this.appendCount(node.offset);
	}
	appendValue(parameter) {
		const { type, value } = toParameter(parameter);
		this.addParameter(value);
		this.append(Array.isArray(parameter) ? `CAST({p${this.numParameters}:String}, ${quoteString(type)})` : `{p${this.numParameters}:${type}}`);
	}
};
var TableNameTransformer = class extends OperationNodeTransformer {
	tableName;
	constructor(tableName) {
		super();
		this.tableName = tableName;
	}
	transformSchemableIdentifier(node) {
		const transformed = super.transformSchemableIdentifier(node);
		if (!transformed.schema) return transformed;
		return SchemableIdentifierNode.create(this.tableName(transformed.schema.name, transformed.identifier.name));
	}
};
var TableNamePlugin = class {
	transformer;
	constructor(tableName) {
		this.transformer = new TableNameTransformer(tableName);
	}
	transformQuery(args) {
		return this.transformer.transformNode(args.node);
	}
	async transformResult(args) {
		return args.result;
	}
};
const INSERT_CLAUSES = [
	"returning",
	"onConflict",
	"onDuplicateKey",
	"orAction",
	"ignore",
	"replace",
	"top",
	"output"
];
const insertRowsOf = (query) => {
	if (!InsertQueryNode.is(query)) return;
	for (const clause of INSERT_CLAUSES) if (query[clause]) throw new Error(UNSUPPORTED.insert);
	const { into, columns, values, ...rest } = query;
	if (Object.entries(rest).some(([key, value]) => key !== "kind" && value !== void 0) || !into || !columns || !values || !ValuesNode.is(values)) return;
	const names = columns.map((column) => column.column.name);
	const rows = [];
	for (const list of values.values) {
		if (PrimitiveValueListNode.is(list)) {
			rows.push(Object.fromEntries(names.map((name, index) => [name, toInsertValue(list.values[index])])));
			continue;
		}
		if (!list.values.every((value) => ValueNode.is(value) || DefaultInsertValueNode.is(value))) return;
		rows.push(Object.fromEntries(names.flatMap((name, index) => {
			const value = list.values[index];
			return value && ValueNode.is(value) ? [[name, toInsertValue(value.value)]] : [];
		})));
	}
	const { schema, identifier } = into.table;
	return {
		table: schema ? [schema.name, identifier.name] : identifier.name,
		rows
	};
};
const WRITES = /^(insert|alter|create|drop|truncate|rename|optimize|delete|update|system|grant|revoke|set|use|attach|detach|exchange|kill|undrop|backup|restore)\b/i;
const writes = (sql) => WRITES.test(sql.replace(/^(\s+|\(|--[^\n]*\n?|\/\*[\s\S]*?\*\/)+/, ""));
const UNSUPPORTED = {
	transaction: "ClickHouse has no transactions: an insert of rows is written whole, and that's all it keeps together.",
	stream: "The query builder doesn't stream a result. Read it in parts, with a limit.",
	update: "ClickHouse changes rows with a mutation, not an update. Write it as sql: ALTER TABLE … UPDATE … WHERE …",
	insert: "ClickHouse inserts rows and nothing more: it has no returning, on conflict, ignore or replace."
};
var Connection = class {
	props;
	constructor(props) {
		this.props = props;
	}
	async executeQuery(compiled) {
		const client = await this.props.client();
		const kind = compiled.query.kind;
		const params = Object.fromEntries(compiled.parameters.map((value, index) => [`p${index + 1}`, value]));
		if (kind === "UpdateQueryNode") throw new Error(UNSUPPORTED.update);
		const insert = insertRowsOf(compiled.query);
		if (insert) {
			await client.insert(insert.table, insert.rows);
			return {
				rows: [],
				numAffectedRows: BigInt(insert.rows.length)
			};
		}
		if (!(kind === "SelectQueryNode" || kind === "RawNode" && !writes(compiled.sql))) {
			await client.command(compiled.sql, params);
			return { rows: [] };
		}
		const { columns, rows } = await client.queryTyped(compiled.sql, params);
		return { rows: rows.map((row) => {
			return Object.fromEntries(columns.map((column) => [column.name, decodeValue(column.type, row[column.name])]));
		}) };
	}
	streamQuery() {
		throw new Error(UNSUPPORTED.stream);
	}
};
const createDriver = (props) => ({
	async init() {},
	async acquireConnection() {
		return new Connection(props);
	},
	async beginTransaction() {
		throw new Error(UNSUPPORTED.transaction);
	},
	async commitTransaction() {
		throw new Error(UNSUPPORTED.transaction);
	},
	async rollbackTransaction() {
		throw new Error(UNSUPPORTED.transaction);
	},
	async releaseConnection() {},
	async destroy() {}
});
const adapter = {
	supportsCreateIfNotExists: true,
	supportsTransactionalDdl: false,
	supportsReturning: false,
	async acquireMigrationLock() {},
	async releaseMigrationLock() {}
};
const introspector = {
	async getSchemas() {
		return [];
	},
	async getTables() {
		return [];
	}
};
/**
* A typed query builder on a ClickHouse client. Values travel as typed
* parameters, an insert of plain rows as rows, and a result is read by the
* type of its columns.
*/
const clickhouseQueryBuilder = (props) => {
	return new Kysely({
		dialect: {
			createAdapter: () => adapter,
			createDriver: () => createDriver(props),
			createIntrospector: () => introspector,
			createQueryCompiler: () => new ClickHouseQueryCompiler()
		},
		plugins: props.tableName ? [new TableNamePlugin(props.tableName)] : []
	});
};
//#endregion
//#region src/ddl.ts
const columnOf = (column) => {
	return typeof column === "string" ? { type: column } : column;
};
const formatSetting = (value) => {
	if (typeof value === "string") return quoteString(value);
	if (typeof value === "boolean") return value ? "1" : "0";
	return String(value);
};
const formatColumn = (name, definition) => {
	const column = columnOf(definition);
	return [
		quoteIdentifier(name),
		column.type,
		column.default ? `DEFAULT ${column.default}` : "",
		column.materialized ? `MATERIALIZED ${column.materialized}` : "",
		column.codec ? `CODEC(${column.codec})` : "",
		column.comment ? `COMMENT ${quoteString(column.comment)}` : ""
	].filter(Boolean).join(" ");
};
const formatIndex = (name, index) => {
	return `INDEX ${quoteIdentifier(name)} ${index.expression} TYPE ${index.type} GRANULARITY ${index.granularity ?? 1}`;
};
const createTableStatement = (name, table) => {
	const lines = [...Object.entries(table.columns).map(([column, props]) => formatColumn(column, props)), ...Object.entries(table.indexes ?? {}).map(([index, props]) => formatIndex(index, props))];
	const orderBy = table.orderBy ?? [];
	const settings = Object.entries(table.settings ?? {});
	return [
		`CREATE TABLE IF NOT EXISTS ${quoteIdentifier(name)} (\n\t${lines.join(",\n	")}\n)`,
		`ENGINE = ${table.engine ?? "MergeTree"}`,
		table.partitionBy ? `PARTITION BY ${table.partitionBy}` : "",
		table.primaryKey ? `PRIMARY KEY (${table.primaryKey.join(", ")})` : "",
		orderBy.length > 0 ? `ORDER BY (${orderBy.join(", ")})` : "ORDER BY tuple()",
		table.ttl ? `TTL ${table.ttl}` : "",
		settings.length > 0 ? `SETTINGS ${settings.map(([key, value]) => `${key} = ${formatSetting(value)}`).join(", ")}` : "",
		table.comment ? `COMMENT ${quoteString(table.comment)}` : ""
	].filter(Boolean).join("\n");
};
const dropTable$1 = async (client, name) => {
	await client.command(`DROP TABLE IF EXISTS ${quoteIdentifier(name)} SYNC`);
};
//#endregion
//#region src/table.ts
const define = (name, schema, client) => {
	return {
		name,
		schema,
		client
	};
};
//#endregion
//#region src/ops/insert.ts
const insert = async (table, rows, options) => {
	await table.client().insert(table.name, rows.map((row) => table.schema.encode(row)), options);
};
//#endregion
//#region src/ops/query.ts
const query = async (table, sql, params = {}, settings) => {
	return table.client().query(sql, {
		...params,
		table: table.name
	}, settings);
};
//#endregion
//#region src/ops/select.ts
const select = async (table, { where, params, orderBy, limit, offset, final, settings } = {}) => {
	const sql = [
		`SELECT ${Object.keys(table.schema.columns).map(quoteIdentifier).join(", ")} FROM ${quoteIdentifier(table.name)}${final ? " FINAL" : ""}`,
		where ? `WHERE ${where}` : "",
		orderBy ? `ORDER BY ${orderBy}` : "",
		typeof limit === "number" ? `LIMIT ${Math.floor(limit)}` : "",
		typeof offset === "number" ? `OFFSET ${Math.floor(offset)}` : ""
	].filter(Boolean).join(" ");
	return (await table.client().query(sql, params, settings)).map((row) => table.schema.decode(row));
};
//#endregion
//#region src/ops/count.ts
const count = async (table, { where, params, final, settings } = {}) => {
	const [row] = await table.client().query(`SELECT count() AS count FROM ${quoteIdentifier(table.name)}${final ? " FINAL" : ""}${where ? ` WHERE ${where}` : ""}`, params, settings);
	return row?.count ?? 0;
};
//#endregion
//#region src/ops/delete-rows.ts
const deleteRows = async (table, { where, params }) => {
	await table.client().command(`DELETE FROM ${quoteIdentifier(table.name)} WHERE ${where}`, params);
};
//#endregion
//#region src/ops/create-table.ts
const createTable = async (table, definition = {}) => {
	await table.client().command(createTableStatement(table.name, {
		...definition,
		columns: table.schema.columns
	}));
};
//#endregion
//#region src/ops/drop-table.ts
const dropTable = async (table) => {
	await dropTable$1(table.client(), table.name);
};
//#endregion
//#region src/schema/schema.ts
var Schema = class {
	encode;
	decode;
	type;
	constructor(encode, decode, type) {
		this.encode = encode;
		this.decode = decode;
		this.type = type;
	}
};
//#endregion
//#region src/schema/array.ts
const array = (schema) => new Schema((input) => input.map((item) => schema.encode(item)), (encoded) => encoded.map((item) => schema.decode(item)), `Array(${schema.type})`);
//#endregion
//#region src/schema/boolean.ts
const boolean = () => new Schema((value) => value, (value) => value, "Bool");
//#endregion
//#region src/schema/date.ts
const date = ({ precision = 3, timeZone = "UTC" } = {}) => new Schema((value) => value.toISOString(), (value) => new Date(value), precision === 0 ? `DateTime('${timeZone}')` : `DateTime64(${precision}, '${timeZone}')`);
//#endregion
//#region src/schema/enums.ts
const enums = (values) => new Schema((value) => value, (value) => value, `Enum8(${values.map((value, index) => `${quoteString(value)} = ${index + 1}`).join(", ")})`);
//#endregion
//#region src/schema/json.ts
const json = () => new Schema((value) => value, (value) => value, "JSON");
//#endregion
//#region src/schema/map.ts
const map = (schema) => new Schema((input) => Object.fromEntries(Object.entries(input).map(([key, value]) => [key, schema.encode(value)])), (encoded) => Object.fromEntries(Object.entries(encoded).map(([key, value]) => [key, schema.decode(value)])), `Map(String, ${schema.type})`);
//#endregion
//#region src/schema/nullable.ts
const nullableType = (type) => {
	const inner = type.match(/^LowCardinality\((.*)\)$/)?.[1];
	return inner ? `LowCardinality(Nullable(${inner}))` : `Nullable(${type})`;
};
const nullable = (schema) => new Schema((input) => input === null ? null : schema.encode(input), (encoded) => encoded === null ? null : schema.decode(encoded), nullableType(schema.type));
//#endregion
//#region src/schema/optional.ts
var OptionalSchema = class extends Schema {
	inner;
	constructor(inner) {
		super(inner.encode, inner.decode, inner.type);
		this.inner = inner;
	}
};
const optional = (schema) => new OptionalSchema(schema);
//#endregion
//#region src/schema/number.ts
const number = (type = "Float64") => new Schema((value) => value, (value) => value, type);
const of = (type) => () => number(type);
const float32 = of("Float32");
const float64 = of("Float64");
const int8 = of("Int8");
const int16 = of("Int16");
const int32 = of("Int32");
const int64 = of("Int64");
const uint8 = of("UInt8");
const uint16 = of("UInt16");
const uint32 = of("UInt32");
const uint64 = of("UInt64");
//#endregion
//#region src/schema/object.ts
var ObjectSchema = class extends Schema {
	entries;
	columns;
	constructor(entries) {
		super((input) => {
			const encoded = {};
			for (const key in input) {
				const entry = entries[key];
				if (!entry) throw new TypeError(`No '${key}' column present on the schema.`);
				if (input[key] !== void 0) encoded[key] = entry.encode(input[key]);
			}
			return encoded;
		}, (encoded) => {
			const output = {};
			for (const key in encoded) {
				const entry = entries[key];
				output[key] = entry ? entry.decode(encoded[key]) : encoded[key];
			}
			return output;
		}, `Tuple(${Object.entries(entries).map(([key, entry]) => `${key} ${entry.type}`).join(", ")})`);
		this.entries = entries;
		this.columns = Object.fromEntries(Object.entries(entries).map(([key, entry]) => [key, entry.type]));
	}
};
const object = (entries) => new ObjectSchema(entries);
//#endregion
//#region src/schema/string.ts
const string = (props = {}) => new Schema((value) => value, (value) => value, props.lowCardinality ? "LowCardinality(String)" : "String");
//#endregion
//#region src/schema/uuid.ts
const uuid = () => new Schema((value) => value, (value) => value, "UUID");
//#endregion
export { ClickHouseError, array, boolean, clickhouseClient, clickhouseQueryBuilder, columnOf, count, createTable, createTableStatement, date, define, deleteRows, dropTable, dropTable$1 as dropTableByName, enums, float32, float64, formatColumn, formatIndex, formatSetting, insert, int16, int32, int64, int8, json, map, nullable, number, object, optional, query, quoteIdentifier, quoteString, select, sql, string, uint16, uint32, uint64, uint8, uuid };
