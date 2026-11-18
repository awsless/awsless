import { ClickHouseError, ClickHouseLogLevel, createClient } from "@clickhouse/client";
import { DefaultQueryCompiler, Kysely, OperationNodeTransformer, SchemableIdentifierNode } from "kysely";
import { parse } from "@awsless/big-float";
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
				table: quoteIdentifier(table),
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
//#region src/type.ts
const splitArgs = (text) => {
	const args = [];
	let depth = 0;
	let quoted = false;
	let current = "";
	for (let index = 0; index < text.length; index++) {
		const char = text[index];
		if (quoted) {
			current += char;
			if (char === "\\") current += text[++index] ?? "";
			else if (char === "'") quoted = false;
			continue;
		}
		if (char === "'") quoted = true;
		else if (char === "(") depth++;
		else if (char === ")") depth--;
		else if (char === "," && depth === 0) {
			args.push(current.trim());
			current = "";
			continue;
		}
		current += char;
	}
	if (current.trim()) args.push(current.trim());
	return args;
};
const parseType = (text) => {
	const type = text.trim();
	const open = type.indexOf("(");
	if (open === -1 || !type.endsWith(")")) return {
		name: type,
		args: []
	};
	return {
		name: type.slice(0, open).trim(),
		args: splitArgs(type.slice(open + 1, -1))
	};
};
const WRAPPERS = ["LowCardinality", "SimpleAggregateFunction"];
const unwrapType = (type) => {
	return WRAPPERS.includes(type.name) ? unwrapType(parseType(type.args.at(-1) ?? "String")) : type;
};
const isBigInteger = (name) => /^U?Int(64|128|256)$/.test(name);
const isDecimal = (name) => /^Decimal(32|64|128|256)?$/.test(name);
const isDateTime = (name) => name === "DateTime" || name === "DateTime64";
const tupleFieldType = (field) => {
	const named = field.match(/^`?[A-Za-z_][A-Za-z0-9_]*`?\s+(.+)$/s);
	return named && !/^[A-Za-z0-9]+\s*\(/.test(field) ? named[1] : field;
};
const decodeValue = (text, value) => {
	const type = unwrapType(parseType(text));
	if (value === null || value === void 0) return value ?? null;
	if (type.name === "Nullable") return decodeValue(type.args[0], value);
	if (isBigInteger(type.name)) return BigInt(value);
	if (isDecimal(type.name)) return parse(value);
	if (isDateTime(type.name)) return new Date(value);
	if (type.name === "Array" && Array.isArray(value)) return value.map((item) => decodeValue(type.args[0], item));
	if (type.name === "Tuple" && Array.isArray(value)) return value.map((item, index) => decodeValue(tupleFieldType(type.args[index] ?? "String"), item));
	if (type.name === "Map" && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decodeValue(type.args[1], item)]));
	return value;
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
const INT64_MAX = 2n ** 63n - 1n;
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
		type: Number.isInteger(value) ? "Int64" : "Float64",
		value
	};
	if (typeof value === "bigint") return {
		type: value > INT64_MAX ? "UInt64" : "Int64",
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
	if (Array.isArray(value)) {
		const items = value.map(toParameter);
		return {
			type: `Array(${items[0]?.type ?? "String"})`,
			value: items.map((item) => item.value)
		};
	}
	return {
		type: "String",
		value: JSON.stringify(value)
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
		this.append(`{p${this.numParameters}:${type}}`);
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
const insertRowsOf = (query) => {
	if (query.kind !== "InsertQueryNode" || query.values?.kind !== "ValuesNode" || !query.into || !query.columns) return;
	const node = query;
	const columns = node.columns.map((column) => column.column.name);
	const rows = [];
	for (const list of node.values.values) {
		if (list?.kind === "PrimitiveValueListNode") {
			rows.push(Object.fromEntries(columns.map((column, index) => [column, toInsertValue(list.values[index])])));
			continue;
		}
		const values = list?.values ?? [];
		const isPlain = (value) => value.kind === "ValueNode" || value.kind === "DefaultInsertValueNode";
		if (list?.kind !== "ValueListNode" || !values.every(isPlain)) return;
		rows.push(Object.fromEntries(columns.flatMap((column, index) => {
			const value = values[index];
			return value?.kind === "ValueNode" ? [[column, toInsertValue(value.value)]] : [];
		})));
	}
	return {
		table: node.into.table.identifier.name,
		rows
	};
};
const UNSUPPORTED = {
	transaction: "ClickHouse has no transactions: an insert of rows is written whole, and that's all it keeps together.",
	stream: "The query builder doesn't stream a result. Read it in parts, with a limit.",
	update: "ClickHouse changes rows with a mutation, not an update. Write it as sql: ALTER TABLE … UPDATE … WHERE …"
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
		if (!(kind === "SelectQueryNode" || kind === "RawNode" && /^\s*(select|with|show|describe|exists)\b/i.test(compiled.sql))) {
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
export { ClickHouseError, array, boolean, clickhouseClient, clickhouseQueryBuilder, columnOf, count, createTable, createTableStatement, date, decodeValue, define, deleteRows, dropTable, dropTable$1 as dropTableByName, enums, float32, float64, formatColumn, formatIndex, formatSetting, insert, int16, int32, int64, int8, isBigInteger, isDateTime, isDecimal, json, map, nullable, number, object, optional, parseType, query, quoteIdentifier, quoteString, select, string, tupleFieldType, uint16, uint32, uint64, uint8, unwrapType, uuid };
