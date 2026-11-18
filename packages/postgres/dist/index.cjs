Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_statement = require("./statement-CuKMVGBI.cjs");
let pg = require("pg");
let _awsless_json = require("@awsless/json");
let _aws_sdk_client_rds_data = require("@aws-sdk/client-rds-data");
let kysely = require("kysely");
//#region src/client.ts
const parseUrl = (url) => {
	const invalid = () => {
		return /* @__PURE__ */ new TypeError("A Postgres url looks like postgres://user:password@host:5432/database, without parameters.");
	};
	if (!URL.canParse(url)) throw invalid();
	const { protocol, hostname, port, username, password, pathname, search } = new URL(url);
	if (!/^postgres(ql)?:$/.test(protocol) || search) throw invalid();
	return {
		host: hostname.replace(/^\[|\]$/g, "") || void 0,
		port: port ? Number(port) : void 0,
		user: decodeURIComponent(username) || void 0,
		password: decodeURIComponent(password) || void 0,
		database: decodeURIComponent(pathname.slice(1)) || void 0
	};
};
const postgresClient = (props) => {
	const schema = [props.schema ?? []].flat().map(require_statement.assertIdentifier).join(",") || void 0;
	const url = parseUrl(props.url);
	let pool;
	const settings = [schema ? `-c search_path=${schema},public` : "", props.strict ? `-c statement_timeout=45000` : ""];
	const getPool = () => {
		if (!pool) {
			pool = new pg.Pool({
				...url,
				max: props.max ?? 4,
				idleTimeoutMillis: 0,
				allowExitOnIdle: true,
				options: settings.filter(Boolean).join(" ") || void 0
			});
			pool.on("error", () => {});
		}
		return pool;
	};
	const ownTypes = /* @__PURE__ */ new Map();
	const isReturnedOwnType = (oid) => {
		let isReturned = ownTypes.get(oid);
		if (!isReturned) {
			isReturned = getPool().query("SELECT typname AS name, typtype AS kind FROM pg_type WHERE oid = $1", [oid]).then(({ rows: [type] }) => type?.kind === "e" || type?.name === "vector");
			ownTypes.set(oid, isReturned);
		}
		return isReturned;
	};
	const queryStrictly = async (on, sql, values) => {
		require_statement.renderQuery(sql, values);
		let bytes = 0;
		const result = await on.query({
			text: sql,
			values,
			types: { getTypeParser(oid, format) {
				const parse = require_statement.getTypeParser(oid, format);
				return (value) => {
					bytes += Buffer.byteLength(value);
					return parse(value);
				};
			} }
		});
		for (const field of result.fields) {
			if (!(require_statement.SUPPORTED_TYPES.has(field.dataTypeID) || field.dataTypeID >= 16384 && await isReturnedOwnType(field.dataTypeID))) throw require_statement.createError("0A000", `The Data API can't return the type of column "${field.name}". Cast it to text in the query, like ${field.name}::text.`);
			if (result.rows.some((row) => Array.isArray(row[field.name]) && row[field.name].some(Array.isArray))) throw require_statement.createError("0A000", `The Data API can't return column "${field.name}": an array with more than one dimension. Return it as jsonb.`);
		}
		if (bytes > 1048576) throw require_statement.createError("54000", `The result is ${bytes} bytes, over the ${require_statement.MAX_RESULT_BYTES} the Data API returns. Read it in parts, with a LIMIT.`);
		return result;
	};
	const run = async (on, sql, params) => {
		const values = require_statement.prepareParams(params);
		const result = props.strict ? await queryStrictly(on, sql, values) : await on.query({
			text: sql,
			values,
			types: require_statement.valueTypes
		});
		const last = Array.isArray(result) ? result.at(-1) : result;
		return {
			rows: last?.rows ?? [],
			affected: last?.rowCount ?? 0
		};
	};
	const client = {
		async query(sql, params) {
			return (await run(getPool(), sql, params)).rows;
		},
		async close() {
			const current = pool;
			pool = void 0;
			await current?.end();
		}
	};
	require_statement.registerExecute(client, (sql, params) => run(getPool(), sql, params));
	require_statement.registerTransaction(client, async (work) => {
		const connection = await getPool().connect();
		let broken = false;
		try {
			await connection.query("BEGIN");
			const result = await work({
				query: async (sql) => (await connection.query(sql)).rows,
				execute: (sql, params) => run(connection, sql, params)
			});
			await connection.query("COMMIT");
			return result;
		} catch (error) {
			await connection.query("ROLLBACK").catch(() => {
				broken = true;
			});
			throw error;
		} finally {
			connection.release(broken);
		}
	});
	return client;
};
//#endregion
//#region src/data-api.ts
const RESUME_TIMEOUT = 6e4;
const TRANSACTION_TIMEOUT = 33e5;
let shared;
const getApi = () => shared ??= new _aws_sdk_client_rds_data.RDSDataClient({ maxAttempts: 1 });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nameOf = (error) => error instanceof Error ? error.name : "";
const messageOf = (error) => error instanceof Error ? error.message : String(error);
const isStillRunning = (error) => /Transaction is still running a query/i.test(messageOf(error));
const afterRunning = async (call, deadline) => {
	for (;;) {
		try {
			return await call();
		} catch (error) {
			if (!isStillRunning(error) || Date.now() > deadline) throw error;
		}
		await sleep(5e3);
	}
};
const toPostgresError = (error) => {
	const name = nameOf(error);
	const message = messageOf(error);
	if (name === "StatementTimeoutException") return require_statement.createError("57014", "canceling statement due to statement timeout");
	if (name === "UnsupportedResultException") return require_statement.createError("0A000", `The Data API can't return the type of one of the columns. Cast it to text in the query, like days::text. (${message})`);
	if (/exceeded size limit|response.*too large/i.test(message)) return require_statement.createError("54000", `The result is over the ${require_statement.MAX_RESULT_BYTES} bytes the Data API returns. Read it in parts, with a LIMIT. (${message})`);
	const state = /SQLState: ([0-9A-Z]{5})/.exec(message)?.[1];
	if (!state) return error;
	const [first = "", ...rest] = message.replace(/;?\s*SQLState: [0-9A-Z]{5}\s*$/, "").split("\n");
	const field = (label) => {
		return rest.find((line) => line.trim().startsWith(`${label}:`))?.trim().slice(label.length + 1).trim();
	};
	return require_statement.createError(state, first.replace(/^ERROR:\s*/, ""), {
		detail: field("Detail"),
		hint: field("Hint"),
		position: field("Position"),
		where: field("Where")
	});
};
const postgresDataClient = (props) => {
	const api = props.client ?? getApi();
	const target = {
		resourceArn: props.clusterArn,
		secretArn: props.secretArn,
		database: props.database
	};
	const resumeTimeout = props.resumeTimeout ?? RESUME_TIMEOUT;
	const whileResuming = async (call) => {
		const deadline = Date.now() + resumeTimeout;
		for (let attempt = 1;; attempt++) {
			try {
				return await call();
			} catch (error) {
				if (nameOf(error) !== "DatabaseResumingException") throw error;
				if (Date.now() > deadline) throw require_statement.createError("57P03", `Postgres was paused and is still resuming after ${Math.round(resumeTimeout / 1e3)} seconds. Try again in a moment.`);
			}
			await sleep(Math.min(3e3, 500 * attempt));
		}
	};
	const execute = async (sql, parameters, transaction) => {
		const command = () => new _aws_sdk_client_rds_data.ExecuteStatementCommand({
			...target,
			sql,
			parameters: parameters.length > 0 ? parameters.map(({ name, value }) => ({
				name,
				value: value === null ? { isNull: true } : { stringValue: value }
			})) : void 0,
			transactionId: transaction?.id,
			continueAfterTimeout: transaction ? true : void 0,
			includeResultMetadata: true,
			resultSetOptions: {
				longReturnType: "STRING",
				decimalReturnType: "STRING"
			}
		});
		try {
			if (!transaction) return await whileResuming(() => api.send(command()));
			return await afterRunning(async () => {
				try {
					return await api.send(command());
				} catch (error) {
					if (nameOf(error) === "StatementTimeoutException") return { $metadata: {} };
					throw error;
				}
			}, transaction.deadline);
		} catch (error) {
			throw toPostgresError(error);
		}
	};
	const run = async (sql, params, transaction) => {
		const rendered = require_statement.renderQuery(sql, params);
		const response = await execute(rendered.sql, rendered.parameters, transaction);
		const affected = response.numberOfRecordsUpdated ?? 0;
		return {
			rows: require_statement.decodeRecords(response),
			affected
		};
	};
	const client = {
		async query(sql, params) {
			return (await run(sql, params)).rows;
		},
		async close() {}
	};
	require_statement.registerExecute(client, (sql, params) => run(sql, params));
	require_statement.registerTransaction(client, async (work) => {
		const { transactionId } = await whileResuming(() => api.send(new _aws_sdk_client_rds_data.BeginTransactionCommand(target)));
		const transaction = {
			id: transactionId,
			deadline: Date.now() + TRANSACTION_TIMEOUT
		};
		const end = {
			resourceArn: props.clusterArn,
			secretArn: props.secretArn,
			transactionId
		};
		try {
			const result = await work({
				query: async (sql) => require_statement.decodeRecords(await execute(sql, [], transaction)),
				execute: (sql, params) => run(sql, params, transaction)
			});
			await afterRunning(() => api.send(new _aws_sdk_client_rds_data.CommitTransactionCommand(end)), transaction.deadline).catch((error) => {
				throw toPostgresError(error);
			});
			return result;
		} catch (error) {
			await afterRunning(() => api.send(new _aws_sdk_client_rds_data.RollbackTransactionCommand(end)), transaction.deadline).catch(() => {});
			throw error;
		}
	});
	return client;
};
//#endregion
//#region src/function.ts
const POSTGRES_FUNCTION = Symbol.for("awsless.postgres.function");
const valueType = (sql, encode) => ({
	sql,
	encode,
	shape: "value"
});
const uuid = () => valueType("uuid");
const text = () => valueType("text");
const integer = () => valueType("integer");
const double = () => valueType("double precision");
const boolean = () => valueType("boolean");
const date = () => valueType("date");
const timestamp = () => valueType("timestamptz");
const numeric = () => valueType("numeric");
const jsonb = () => valueType("jsonb", (value) => (0, _awsless_json.stringify)(value));
const array = (item) => valueType(`${item.sql}[]`);
const nullable = (type) => ({
	...type,
	encode: type.encode && ((value) => value === null ? null : type.encode(value))
});
const custom = (sql) => valueType(sql);
const table = (columns) => ({
	sql: `TABLE (${Object.entries(columns).map(([name, type]) => `${name} ${type.sql}`).join(", ")})`,
	shape: "rows"
});
const nothing = () => ({
	sql: "void",
	shape: "nothing"
});
const BODY_QUOTE = "$awsless$";
const NAME = /^[a-z_][a-z0-9_]*$/;
const assertName = (name, what) => {
	if (!NAME.test(name)) throw new TypeError(`${what} "${name}" isn't a plain sql name: lowercase letters, digits and underscores.`);
};
const createStatement = (definition) => {
	const { name, args, returns, language, attributes, body } = definition;
	assertName(name, "The function name");
	Object.keys(args).forEach((arg) => assertName(arg, `The argument of ${name}`));
	if (body.includes(BODY_QUOTE)) throw new TypeError(`The body of ${name} holds ${BODY_QUOTE}, which quotes it.`);
	return [
		`CREATE OR REPLACE FUNCTION ${name}(${Object.entries(args).map(([arg, type]) => `${arg} ${type.sql}`).join(", ")}) RETURNS ${returns.sql}`,
		`LANGUAGE ${language}${attributes ? ` ${attributes}` : ""} AS ${BODY_QUOTE}`,
		body.trim(),
		BODY_QUOTE
	].join("\n");
};
const define = (definition) => {
	const { name, args, returns } = definition;
	const argTypes = Object.entries(args);
	const placeholders = argTypes.map(([arg, type], index) => `${arg} => $${index + 1}::${type.sql}`).join(", ");
	const call = {
		rows: `SELECT * FROM ${name}(${placeholders})`,
		value: `SELECT ${name}(${placeholders}) AS "result"`,
		nothing: `SELECT ${name}(${placeholders})::text AS "result"`
	}[returns.shape];
	const callFunction = async (client, ...[values]) => {
		const given = values ?? {};
		const params = argTypes.map(([arg, type]) => {
			const value = given[arg];
			return type.encode && value !== void 0 ? type.encode(value) : value ?? null;
		});
		const rows = await client.query(call, params);
		if (returns.shape === "rows") return rows;
		return returns.shape === "nothing" ? void 0 : rows[0]?.result;
	};
	return Object.assign(callFunction, {
		functionName: name,
		sql: createStatement(definition),
		[POSTGRES_FUNCTION]: true
	});
};
const isPostgresFunction = (value) => typeof value === "function" && value[POSTGRES_FUNCTION] === true;
const postgres = {
	function: { define },
	type: {
		uuid,
		text,
		integer,
		double,
		numeric,
		boolean,
		date,
		timestamp,
		jsonb,
		array,
		nullable,
		custom,
		table,
		nothing
	}
};
//#endregion
//#region src/query-builder.ts
const ROLLED_BACK = Symbol("rolled back");
var Connection = class {
	props;
	transaction;
	constructor(props) {
		this.props = props;
	}
	async executeQuery(query) {
		const wrap = this.props.wrap ?? ((run) => run());
		const params = [...query.parameters];
		const { rows, affected } = await wrap(async () => {
			return this.transaction ? this.transaction.session.execute(query.sql, params) : require_statement.execute(await this.props.client(), query.sql, params);
		});
		return {
			rows,
			numAffectedRows: BigInt(affected)
		};
	}
	streamQuery() {
		throw new Error("Postgres results can't be streamed: the Data API returns a result whole. Read it in parts, with a limit.");
	}
	async begin() {
		const client = await this.props.client();
		this.transaction = await new Promise((resolve, reject) => {
			const done = require_statement.transact(client, (session) => {
				return new Promise((commit, rollback) => {
					resolve({
						session,
						commit,
						rollback,
						done
					});
				});
			});
			done.catch(reject);
		});
	}
	async commit() {
		const transaction = this.transaction;
		this.transaction = void 0;
		transaction.commit();
		await transaction.done;
	}
	async rollback() {
		const transaction = this.transaction;
		this.transaction = void 0;
		transaction?.rollback(ROLLED_BACK);
		await transaction?.done.catch((error) => {
			if (error !== ROLLED_BACK) throw error;
		});
	}
};
const createDriver = (props) => ({
	async init() {},
	async acquireConnection() {
		return new Connection(props);
	},
	beginTransaction: (connection) => connection.begin(),
	commitTransaction: (connection) => connection.commit(),
	rollbackTransaction: (connection) => connection.rollback(),
	async releaseConnection() {},
	async destroy() {}
});
/**
* A typed query builder on a Postgres client. Every statement goes through
* the client, so it runs the same over a connection and through the Data API.
*/
const postgresQueryBuilder = (props) => {
	return new kysely.Kysely({ dialect: {
		createAdapter: () => new kysely.PostgresAdapter(),
		createDriver: () => createDriver(props),
		createIntrospector: (db) => new kysely.PostgresIntrospector(db),
		createQueryCompiler: () => new kysely.PostgresQueryCompiler()
	} });
};
//#endregion
//#region src/table.ts
const COMMENT_PREFIX = "awsless:";
var TableChangeError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "TableChangeError";
	}
};
const columnOf = (definition) => {
	const column = typeof definition === "string" ? { type: definition } : definition;
	const type = column.type.trim();
	const nullable = type.endsWith("?");
	return {
		type: nullable ? type.slice(0, -1).trim() : type,
		nullable,
		...column.default !== void 0 ? { default: column.default } : {},
		...column.collate ? { collate: column.collate } : {},
		identity: column.identity ?? false
	};
};
const declareTable = (table) => {
	return {
		columns: Object.fromEntries(Object.entries(table.columns).map(([name, column]) => [name, columnOf(column)])),
		primaryKey: table.primaryKey,
		indexes: Object.fromEntries(Object.entries(table.indexes ?? {}).map(([name, index]) => [name, Array.isArray(index) ? {
			columns: index,
			unique: false
		} : {
			columns: index.columns,
			unique: index.unique ?? false
		}])),
		...table.partitionBy ? { partitionBy: {
			hash: table.partitionBy.hash,
			partitions: table.partitionBy.partitions
		} } : {},
		...table.fillfactor !== void 0 ? { fillfactor: table.fillfactor } : {}
	};
};
const isSame = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const typeText = (type) => type.replace(/\s+/g, " ").toLowerCase();
const quote = (name) => `"${require_statement.assertIdentifier(name)}"`;
const quoteString = (value) => `'${value.replaceAll("'", "''")}'`;
const columnList = (columns) => columns.map(quote).join(", ");
const indexName = (table, index) => `${table}_${index}`;
const partitionName = (table, partition) => `${table}_p${partition}`;
const formatColumn = (name, column) => {
	return [
		quote(name),
		column.type,
		column.collate ? `COLLATE "${column.collate.replaceAll("\"", "\"\"")}"` : "",
		column.identity ? "GENERATED ALWAYS AS IDENTITY" : "",
		column.default !== void 0 ? `DEFAULT ${column.default}` : "",
		column.nullable ? "" : "NOT NULL"
	].filter(Boolean).join(" ");
};
const createIndexStatement = (table, name, index) => {
	return `CREATE ${index.unique ? "UNIQUE INDEX" : "INDEX"} ${quote(indexName(table, name))} ON ${quote(table)} (${columnList(index.columns)})`;
};
const storageTables = (name, table) => {
	return table.partitionBy ? Array.from({ length: table.partitionBy.partitions }, (_, partition) => partitionName(name, partition)) : [name];
};
const commentStatement = (name, table) => {
	return `COMMENT ON TABLE ${quote(name)} IS ${quoteString(COMMENT_PREFIX + JSON.stringify(table))}`;
};
const parseTableComment = (comment) => {
	if (!comment?.startsWith(COMMENT_PREFIX)) return;
	try {
		return JSON.parse(comment.slice(8));
	} catch {
		return;
	}
};
const createTableStatements = (name, table) => {
	const fillfactor = table.fillfactor !== void 0 ? ` WITH (fillfactor = ${table.fillfactor})` : "";
	const lines = [...Object.entries(table.columns).map(([column, props]) => formatColumn(column, props)), `PRIMARY KEY (${columnList(table.primaryKey)})`];
	const statements = [[`CREATE TABLE ${quote(name)} (\n\t${lines.join(",\n	")}\n)`, table.partitionBy ? ` PARTITION BY HASH (${columnList(table.partitionBy.hash)})` : fillfactor].join("")];
	if (table.partitionBy) {
		const { partitions } = table.partitionBy;
		for (let partition = 0; partition < partitions; partition++) statements.push(`CREATE TABLE ${quote(partitionName(name, partition))} PARTITION OF ${quote(name)} FOR VALUES WITH (MODULUS ${partitions}, REMAINDER ${partition})${fillfactor}`);
	}
	for (const [index, props] of Object.entries(table.indexes)) statements.push(createIndexStatement(name, index, props));
	statements.push(commentStatement(name, table));
	return statements;
};
const refuseChange = (name, what, detail = "") => {
	throw new TableChangeError(`The ${what}${detail} of Postgres table "${name}" can't change in place. Declare a new table & copy the data over instead.`);
};
const alterDeclaredTable = (name, from, to) => {
	const table = quote(name);
	const statements = [];
	if (!isSame(from.partitionBy, to.partitionBy)) refuseChange(name, "partitioning");
	if (!isSame(from.primaryKey, to.primaryKey)) refuseChange(name, "primary key");
	for (const [column, after] of Object.entries(to.columns)) {
		const before = from.columns[column];
		if (!before) continue;
		if (typeText(before.type) !== typeText(after.type)) refuseChange(name, `type of column "${column}"`, ` (${before.type} to ${after.type})`);
		if (before.collate !== after.collate) refuseChange(name, `collation of column "${column}"`);
		if (before.identity !== after.identity) refuseChange(name, `identity of column "${column}"`);
	}
	for (const [index, props] of Object.entries(from.indexes)) if (!isSame(props, to.indexes[index])) statements.push(`DROP INDEX IF EXISTS ${quote(indexName(name, index))}`);
	for (const column of Object.keys(from.columns)) if (!to.columns[column]) statements.push(`ALTER TABLE ${table} DROP COLUMN ${quote(column)}`);
	for (const [column, after] of Object.entries(to.columns)) {
		const before = from.columns[column];
		if (!before) {
			statements.push(`ALTER TABLE ${table} ADD COLUMN ${formatColumn(column, after)}`);
			continue;
		}
		if (before.default !== after.default) statements.push(after.default !== void 0 ? `ALTER TABLE ${table} ALTER COLUMN ${quote(column)} SET DEFAULT ${after.default}` : `ALTER TABLE ${table} ALTER COLUMN ${quote(column)} DROP DEFAULT`);
		if (before.nullable !== after.nullable) statements.push(`ALTER TABLE ${table} ALTER COLUMN ${quote(column)} ${after.nullable ? "DROP" : "SET"} NOT NULL`);
	}
	for (const [index, props] of Object.entries(to.indexes)) if (!isSame(props, from.indexes[index])) statements.push(createIndexStatement(name, index, props));
	if (from.fillfactor !== to.fillfactor) for (const storage of storageTables(name, to)) statements.push(to.fillfactor !== void 0 ? `ALTER TABLE ${quote(storage)} SET (fillfactor = ${to.fillfactor})` : `ALTER TABLE ${quote(storage)} RESET (fillfactor)`);
	if (!isSame(from, to)) statements.push(commentStatement(name, to));
	return statements;
};
const alterTableStatements = (name, prior, next) => {
	return alterDeclaredTable(name, declareTable(prior), declareTable(next));
};
//#endregion
//#region src/schema.ts
const dropRoutines = (schema) => `
DO $awsless$
DECLARE
	routine regprocedure;
BEGIN
	FOR routine IN
		SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = '${schema}'
	LOOP
		BEGIN
			EXECUTE format('DROP ROUTINE %s', routine);
		EXCEPTION WHEN dependent_objects_still_exist THEN
			NULL;
		END;
	END LOOP;
END
$awsless$`;
const liveTables = (schema) => `
SELECT c.relname::text AS name, d.description AS comment
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_description d ON d.objoid = c.oid AND d.classoid = 'pg_class'::regclass AND d.objsubid = 0
WHERE n.nspname = '${schema}' AND c.relkind IN ('r', 'p') AND NOT c.relispartition`;
const lineOf = (sql, position) => {
	const offset = Number(position);
	return offset > 0 ? sql.slice(0, offset - 1).split("\n").length : 1;
};
const runNamed = async (session, sql, name) => {
	try {
		return await session.query(sql);
	} catch (error) {
		if (error instanceof pg.DatabaseError) error.message = `${name(error)}: ${error.message}`;
		throw error;
	}
};
const applyTables = async (session, schema, tables, options) => {
	const live = new Map((await session.query(liveTables(schema))).map((table) => [table.name, table.comment]));
	const run = async (table, statements) => {
		for (const statement of statements) await runNamed(session, statement, () => `Postgres table "${table}"`);
	};
	for (const [name, definition] of Object.entries(tables)) {
		const next = declareTable(definition);
		if (!live.has(name)) {
			await run(name, createTableStatements(name, next));
			continue;
		}
		try {
			const prior = parseTableComment(live.get(name));
			if (!prior) throw new TableChangeError(`Postgres table "${name}" exists but wasn't made by awsless. Drop or rename it, then apply again.`);
			await run(name, alterDeclaredTable(name, prior, next));
		} catch (error) {
			if (!options.recreate || !(error instanceof TableChangeError)) throw error;
			await run(name, [`DROP TABLE "${require_statement.assertIdentifier(name)}" CASCADE`, ...createTableStatements(name, next)]);
		}
	}
	for (const [name, comment] of live) if (!Object.hasOwn(tables, name) && !options.retain && parseTableComment(comment)) await run(name, [`DROP TABLE "${require_statement.assertIdentifier(name)}" CASCADE`]);
};
const APPLY_LOCK_TIMEOUT = "10s";
const applySchema = (client, definition, options = {}) => {
	return require_statement.transact(client, async (session) => {
		const schema = require_statement.assertIdentifier(definition.schema);
		await session.query(`SELECT pg_advisory_xact_lock(hashtext('awsless.schema.${schema}'))::text`);
		if (options.reset) await session.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
		await session.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
		await session.query(`SET LOCAL search_path TO "${schema}", public`);
		await session.query(`SET LOCAL lock_timeout = '${APPLY_LOCK_TIMEOUT}'`);
		await applyTables(session, schema, definition.tables ?? {}, options);
		await session.query("SELECT pg_advisory_xact_lock(hashtext('awsless.functions'))::text");
		await session.query(dropRoutines(schema));
		for (const file of definition.functions ?? []) for (const statement of require_statement.splitStatements(file.sql)) await runNamed(session, statement.sql, (error) => {
			return `${file.name}:${statement.line + lineOf(statement.sql, error.position) - 1}`;
		});
	});
};
//#endregion
exports.PostgresError = pg.DatabaseError;
exports.TableChangeError = TableChangeError;
exports.alterTableStatements = alterTableStatements;
exports.applySchema = applySchema;
exports.declareTable = declareTable;
exports.getSqlState = require_statement.getSqlState;
exports.isPostgresFunction = isPostgresFunction;
exports.postgres = postgres;
exports.postgresClient = postgresClient;
exports.postgresDataClient = postgresDataClient;
exports.postgresQueryBuilder = postgresQueryBuilder;
Object.defineProperty(exports, "sql", {
	enumerable: true,
	get: function() {
		return kysely.sql;
	}
});
