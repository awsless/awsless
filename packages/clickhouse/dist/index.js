import { ClickHouseError, createClient } from "@clickhouse/client";
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
				request_timeout: props.requestTimeout
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
const select = async (table, { where, params, orderBy, limit, offset, final } = {}) => {
	const sql = [
		`SELECT ${Object.keys(table.schema.columns).map(quoteIdentifier).join(", ")} FROM ${quoteIdentifier(table.name)}${final ? " FINAL" : ""}`,
		where ? `WHERE ${where}` : "",
		orderBy ? `ORDER BY ${orderBy}` : "",
		typeof limit === "number" ? `LIMIT ${Math.floor(limit)}` : "",
		typeof offset === "number" ? `OFFSET ${Math.floor(offset)}` : ""
	].filter(Boolean).join(" ");
	return (await table.client().query(sql, params)).map((row) => table.schema.decode(row));
};
//#endregion
//#region src/ops/count.ts
const count = async (table, { where, params, final } = {}) => {
	const [row] = await table.client().query(`SELECT count() AS count FROM ${quoteIdentifier(table.name)}${final ? " FINAL" : ""}${where ? ` WHERE ${where}` : ""}`, params);
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
export { ClickHouseError, array, boolean, clickhouseClient, columnOf, count, createTable, createTableStatement, date, define, deleteRows, dropTable, dropTable$1 as dropTableByName, enums, formatColumn, formatIndex, formatSetting, insert, json, map, nullable, number, object, optional, query, quoteIdentifier, quoteString, select, string, uuid };
