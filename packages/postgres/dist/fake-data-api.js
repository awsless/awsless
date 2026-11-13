import { i as splitStatements, o as SUPPORTED_TYPES } from "./statement-D0cFz05O.js";
import pg from "pg";
import { randomUUID } from "crypto";
//#region src/fake-data-api.ts
const HINTS = {
	UUID: 2950,
	TIMESTAMP: 1114,
	DATE: 1082,
	TIME: 1083,
	DECIMAL: 1700,
	JSON: 114
};
const serviceError = (name, message) => Object.assign(new Error(message), { name });
const databaseError = (error) => {
	const lines = [
		`ERROR: ${error.message}`,
		error.detail ? `  Detail: ${error.detail}` : "",
		error.hint ? `  Hint: ${error.hint}` : "",
		error.position ? `  Position: ${error.position}` : "",
		error.where ? `  Where: ${error.where.split("\n")[0]}` : ""
	];
	return serviceError("DatabaseErrorException", `${lines.filter(Boolean).join("\n")}; SQLState: ${error.code}`);
};
const bindNames = (sql) => {
	const names = [];
	const skip = /'(?:[^']|'')*'|"(?:[^"]|"")*"|\$([A-Za-z_]\w*)?\$[\s\S]*?\$\1\$|--[^\n]*|\/\*[\s\S]*?\*\/|::/y;
	let text = "";
	for (let index = 0; index < sql.length;) {
		skip.lastIndex = index;
		const skipped = skip.exec(sql)?.[0];
		if (skipped) {
			text += skipped;
			index += skipped.length;
			continue;
		}
		const name = sql[index] === ":" ? /^:([A-Za-z_]\w*)/.exec(sql.slice(index, index + 80))?.[1] : void 0;
		if (name) {
			if (!names.includes(name)) names.push(name);
			text += `$${names.indexOf(name) + 1}`;
			index += name.length + 1;
			continue;
		}
		text += sql[index];
		index++;
	}
	return {
		text,
		names
	};
};
const typeOf = (parameter) => {
	const value = parameter.value ?? {};
	if (value.isNull) return {
		oid: 0,
		value: null
	};
	if (value.stringValue !== void 0) return {
		oid: HINTS[parameter.typeHint ?? ""] ?? 1043,
		value: value.stringValue
	};
	if (value.longValue !== void 0) return {
		oid: 20,
		value: String(value.longValue)
	};
	if (value.doubleValue !== void 0) return {
		oid: 701,
		value: String(value.doubleValue)
	};
	if (value.booleanValue !== void 0) return {
		oid: 16,
		value: String(value.booleanValue)
	};
	if (value.blobValue !== void 0) return {
		oid: 17,
		value: Buffer.from(value.blobValue)
	};
	throw serviceError("ValidationException", "Array parameters are not supported");
};
const raw = { getTypeParser: () => (value) => value };
const parseTextArray = pg.types.getTypeParser(1009, "text");
const NUMBERS = /* @__PURE__ */ new Set([
	"int2",
	"int4",
	"int8"
]);
const FRACTIONS = /* @__PURE__ */ new Set(["float4", "float8"]);
const fakeDataApi = (options) => {
	const pools = /* @__PURE__ */ new Map();
	const typeNames = /* @__PURE__ */ new Map();
	const transactions = /* @__PURE__ */ new Map();
	const calls = [];
	let paused = options.paused ?? 0;
	const poolOf = (database) => {
		let pool = pools.get(database);
		if (!pool) {
			pool = new pg.Pool({
				connectionString: `${options.url}/${database}`,
				max: 10,
				allowExitOnIdle: true
			});
			pool.on("error", () => {});
			pools.set(database, pool);
		}
		return pool;
	};
	const typeNameOf = async (connection, oid) => {
		if (!typeNames.has(oid)) {
			const { rows } = await connection.query("SELECT typname::text AS name, typtype::text AS kind FROM pg_type WHERE oid = $1", [oid]);
			typeNames.set(oid, rows[0].kind === "e" ? "enum" : rows[0].name);
		}
		return typeNames.get(oid);
	};
	const encode = (typeName, value, input) => {
		if (value === null) return { isNull: true };
		const longs = input.resultSetOptions?.longReturnType === "STRING";
		const decimals = input.resultSetOptions?.decimalReturnType !== "DOUBLE_OR_LONG";
		if (typeName.startsWith("_")) {
			const element = typeName.slice(1);
			const elements = parseTextArray(value);
			if (elements.some(Array.isArray)) throw serviceError("UnsupportedResultException", "The result contains a multidimensional array.");
			if (element === "bool") return { arrayValue: { booleanValues: elements.map((item) => item === "t") } };
			if (NUMBERS.has(element)) return { arrayValue: { longValues: elements.map(Number) } };
			if (FRACTIONS.has(element)) return { arrayValue: { doubleValues: elements.map(Number) } };
			return { arrayValue: { stringValues: elements } };
		}
		if (typeName === "bool") return { booleanValue: value === "t" };
		if (NUMBERS.has(typeName)) return longs ? { stringValue: value } : { longValue: Number(value) };
		if (FRACTIONS.has(typeName)) return { doubleValue: Number(value) };
		if (typeName === "numeric") return decimals ? { stringValue: value } : { doubleValue: Number(value) };
		if (typeName === "bytea") return { blobValue: Buffer.from(value.slice(2), "hex") };
		if (typeName === "timestamptz") return { stringValue: value.replace(/[+-]\d\d(:\d\d)?$/, "") };
		return { stringValue: value };
	};
	const run = async (connection, input) => {
		const sql = input.sql ?? "";
		if (sql.length > 65536) throw serviceError("ValidationException", "Value at 'sql' failed to satisfy constraint: Member must have length less than or equal to 65536");
		if (splitStatements(sql).length > 1) throw serviceError("ValidationException", "Multistatements aren't supported.");
		const { text, names } = bindNames(sql);
		const givenParameters = new Map((input.parameters ?? []).map((parameter) => [parameter.name, typeOf(parameter)]));
		const bound = names.map((name) => {
			const parameter = givenParameters.get(name);
			if (!parameter) throw serviceError("BadRequestException", `Parameter "${name}" has value not set`);
			return parameter;
		});
		let result;
		try {
			result = await connection.query({
				text,
				values: bound.map((parameter) => parameter.value),
				types: Object.assign(bound.map((parameter) => parameter.oid), raw)
			});
		} catch (error) {
			if (error instanceof pg.DatabaseError && error.code === "57014") throw serviceError("StatementTimeoutException", "Request timed out");
			throw error instanceof pg.DatabaseError ? databaseError(error) : error;
		}
		const columns = [];
		for (const field of result.fields) {
			const typeName = await typeNameOf(connection, field.dataTypeID);
			if (!(SUPPORTED_TYPES.has(field.dataTypeID) || field.dataTypeID >= 16384 && ["enum", "vector"].includes(typeName))) throw serviceError("UnsupportedResultException", `The result contains the unsupported data type ${typeName.toUpperCase()}.`);
			columns.push({
				name: field.name,
				label: field.name,
				typeName
			});
		}
		if (result.rows.reduce((total, row) => total + Object.values(row).reduce((size, value) => size + Buffer.byteLength(value ?? ""), 0), 0) > 1048576) throw serviceError("DatabaseErrorException", "Database response exceeded size limit");
		return {
			$metadata: {},
			numberOfRecordsUpdated: result.rowCount ?? 0,
			columnMetadata: columns,
			records: result.rows.map((row) => columns.map((column) => encode(column.typeName, row[column.name] ?? null, input)))
		};
	};
	const execute = async (input) => {
		const transaction = input.transactionId ? transactions.get(input.transactionId) : void 0;
		if (input.transactionId && !transaction) throw serviceError("TransactionNotFoundException", `Transaction ${input.transactionId} is not found`);
		if (transaction) {
			if (transaction.running) throw serviceError("DatabaseErrorException", "Transaction is still running a query");
			const running = run(transaction.connection, input).finally(() => {
				transaction.running = void 0;
			});
			transaction.running = running;
			if (input.continueAfterTimeout && options.timeout) {
				const timedOut = Symbol("timeout");
				if (await Promise.race([running, new Promise((resolve) => setTimeout(() => resolve(timedOut), options.timeout))]) === timedOut) {
					running.catch(() => {});
					throw serviceError("StatementTimeoutException", "Request timed out");
				}
			}
			return running;
		}
		const connection = await poolOf(input.database ?? "postgres").connect();
		try {
			if (options.timeout) await connection.query(`SET statement_timeout = ${options.timeout}`);
			return await run(connection, input);
		} finally {
			await connection.query("DISCARD ALL").catch(() => {});
			connection.release();
		}
	};
	const send = async (command) => {
		const name = command.constructor.name.replace(/Command$/, "");
		const input = command.input;
		calls.push({
			name,
			input: command.input
		});
		if (paused > 0 && (name === "ExecuteStatement" || name === "BeginTransaction")) {
			paused--;
			throw serviceError("DatabaseResumingException", `The Aurora DB instance ${input.resourceArn} is resuming after being auto-paused. Please wait a few seconds and try again.`);
		}
		if (name === "ExecuteStatement") return execute(input);
		if (name === "BeginTransaction") {
			const connection = await poolOf(input.database ?? "postgres").connect();
			const transactionId = randomUUID();
			await connection.query("BEGIN");
			transactions.set(transactionId, { connection });
			return {
				$metadata: {},
				transactionId
			};
		}
		if (name === "CommitTransaction" || name === "RollbackTransaction") {
			const transaction = transactions.get(input.transactionId);
			if (!transaction) throw serviceError("TransactionNotFoundException", `Transaction ${input.transactionId} is not found`);
			if (transaction.running) throw serviceError("DatabaseErrorException", "Transaction is still running a query");
			transactions.delete(input.transactionId);
			try {
				await transaction.connection.query(name === "CommitTransaction" ? "COMMIT" : "ROLLBACK");
			} finally {
				await transaction.connection.query("DISCARD ALL").catch(() => {});
				transaction.connection.release();
			}
			return {
				$metadata: {},
				transactionStatus: name === "CommitTransaction" ? "Transaction Committed" : "Rollback Complete"
			};
		}
		throw new Error(`The fake Data API has no ${name}.`);
	};
	return {
		send,
		calls,
		pause(count) {
			paused = count;
		},
		async close() {
			await Promise.all([...pools.values()].map((pool) => pool.end()));
		}
	};
};
//#endregion
export { fakeDataApi };
