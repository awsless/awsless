Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let crypto = require("crypto");
let http = require("http");
let zlib = require("zlib");
let child_process = require("child_process");
let fs_promises = require("fs/promises");
let net = require("net");
let os = require("os");
let path = require("path");
let fs = require("fs");
let stream = require("stream");
let stream_promises = require("stream/promises");
let util = require("util");
//#region src/real/version.ts
const VERSION = "26.8.33.10";
const release = `https://github.com/ClickHouse/ClickHouse/releases/download/v${VERSION}-lts`;
const ASSETS = {
	"darwin-arm64": {
		url: `${release}/clickhouse-macos-aarch64`,
		sha256: "9959b71b1d255e2135f1e80166d05a836aab4afae029cc654ff5fe267a9e6599"
	},
	"darwin-x64": {
		url: `${release}/clickhouse-macos`,
		sha256: "feaf85b436f8e12d72878466405ba1194fb2451c0decf4551d08645a9594efb3"
	},
	"linux-arm64": {
		url: `${release}/clickhouse-common-static-${VERSION}-arm64.tgz`,
		sha256: "1f4a60b3e65e09c07cb18d11026717deb0bfc3096addac5042c3208531c289ae",
		member: `clickhouse-common-static-${VERSION}/usr/bin/clickhouse`
	},
	"linux-x64": {
		url: `${release}/clickhouse-common-static-${VERSION}-amd64.tgz`,
		sha256: "4b11daf6b9abd18a7c14cfd839d837ced74c39c71be0f945338deabbe4ed4224",
		member: `clickhouse-common-static-${VERSION}/usr/bin/clickhouse`
	}
};
const getAsset = (platform = process.platform, arch = process.arch) => {
	const asset = ASSETS[`${platform}-${arch}`];
	if (!asset) throw new Error(`ClickHouse has no build for ${platform} ${arch}. Run it on macOS or Linux.`);
	return asset;
};
//#endregion
//#region src/memory/errors.ts
const STATUS = {
	UNKNOWN_TABLE: 404,
	UNKNOWN_FUNCTION: 404,
	UNKNOWN_IDENTIFIER: 404,
	UNKNOWN_TYPE: 404,
	UNKNOWN_DATABASE: 404,
	UNKNOWN_SETTING: 404,
	UNKNOWN_AGGREGATE_FUNCTION: 404,
	UNKNOWN_FORMAT: 404,
	SYNTAX_ERROR: 400,
	CANNOT_PARSE_TEXT: 400,
	CANNOT_PARSE_DATETIME: 400,
	CANNOT_PARSE_INPUT_ASSERTION_FAILED: 400,
	CANNOT_PARSE_NUMBER: 400,
	CANNOT_PARSE_UUID: 400,
	CANNOT_PARSE_QUOTED_STRING: 400,
	INCORRECT_DATA: 400,
	ILLEGAL_TYPE_OF_ARGUMENT: 400,
	TYPE_MISMATCH: 400,
	NUMBER_OF_ARGUMENTS_DOESNT_MATCH: 400,
	TOO_MANY_ARGUMENTS_FOR_FUNCTION: 400,
	TOO_FEW_ARGUMENTS_FOR_FUNCTION: 400,
	BAD_ARGUMENTS: 400,
	ILLEGAL_COLUMN: 400,
	NOT_AN_AGGREGATE: 400,
	ILLEGAL_AGGREGATION: 400,
	DUPLICATE_COLUMN: 400,
	NO_SUCH_COLUMN_IN_TABLE: 400,
	ILLEGAL_FINAL: 400,
	ALTER_OF_COLUMN_IS_FORBIDDEN: 400,
	BAD_QUERY_PARAMETER: 400,
	UNKNOWN_QUERY_PARAMETER: 400,
	EMPTY_QUERY: 400,
	NOT_IMPLEMENTED: 501
};
var ClickHouseException = class extends Error {
	code;
	type;
	status;
	constructor(code, type, message) {
		super(message);
		this.code = code;
		this.type = type;
		this.name = "ClickHouseException";
		this.status = STATUS[type] ?? 500;
	}
	toString() {
		const message = this.message.endsWith(".") || this.message.endsWith("?") ? this.message : `${this.message}.`;
		return `Code: ${this.code}. DB::Exception: ${message} (${this.type}) (version ${VERSION} (official build))\n`;
	}
};
const error = (code, type) => (message) => new ClickHouseException(code, type, message);
const syntaxError = error(62, "SYNTAX_ERROR");
const unknownTable = error(60, "UNKNOWN_TABLE");
const unknownIdentifier = error(47, "UNKNOWN_IDENTIFIER");
const unknownFunction = error(46, "UNKNOWN_FUNCTION");
const unknownType = error(50, "UNKNOWN_TYPE");
const unknownDatabase = error(81, "UNKNOWN_DATABASE");
const unknownFormat = error(73, "UNKNOWN_FORMAT");
const tableExists = error(57, "TABLE_ALREADY_EXISTS");
const notImplemented = error(48, "NOT_IMPLEMENTED");
const illegalType = error(43, "ILLEGAL_TYPE_OF_ARGUMENT");
const argumentCount = error(42, "NUMBER_OF_ARGUMENTS_DOESNT_MATCH");
const badArguments = error(36, "BAD_ARGUMENTS");
const notAnAggregate = error(215, "NOT_AN_AGGREGATE");
const illegalAggregation = error(184, "ILLEGAL_AGGREGATION");
const duplicateColumn = error(15, "DUPLICATE_COLUMN");
const noSuchColumn = error(16, "NO_SUCH_COLUMN_IN_TABLE");
const illegalFinal = error(181, "ILLEGAL_FINAL");
const alterForbidden = error(524, "ALTER_OF_COLUMN_IS_FORBIDDEN");
const cannotParseText = error(6, "CANNOT_PARSE_TEXT");
const cannotParseDateTime = error(41, "CANNOT_PARSE_DATETIME");
const cannotParseNumber = error(72, "CANNOT_PARSE_NUMBER");
const cannotParseUuid = error(376, "CANNOT_PARSE_UUID");
const unknownQueryParameter = error(456, "UNKNOWN_QUERY_PARAMETER");
const badQueryParameter = error(457, "BAD_QUERY_PARAMETER");
const emptyQuery = error(62, "SYNTAX_ERROR");
const unknownElementOfEnum = error(691, "UNKNOWN_ELEMENT_OF_ENUM");
const illegalDivision = error(153, "ILLEGAL_DIVISION");
//#endregion
//#region src/memory/ast.ts
const fn = (name, ...args) => ({
	kind: "function",
	name,
	args
});
const literal$1 = (value, text) => ({
	kind: "literal",
	value,
	text
});
//#endregion
//#region src/memory/lexer.ts
const OPERATORS = [
	"->",
	"<=",
	">=",
	"!=",
	"<>",
	"==",
	"||",
	"::",
	"+",
	"-",
	"*",
	"/",
	"%",
	"=",
	"<",
	">",
	"(",
	")",
	"[",
	"]",
	",",
	".",
	";",
	":",
	"?",
	"{",
	"}"
];
const ESCAPES = {
	n: "\n",
	t: "	",
	r: "\r",
	b: "\b",
	f: "\f",
	"0": "\0",
	a: "\x07",
	v: "\v",
	e: "\x1B"
};
const readQuoted = (sql, start, quote) => {
	let value = "";
	let i = start + 1;
	while (i < sql.length) {
		const char = sql[i];
		if (char === "\\") {
			const next = sql[i + 1];
			if (next === void 0) break;
			if (next === "x" && /^[0-9a-fA-F]{2}$/.test(sql.slice(i + 2, i + 4))) {
				value += String.fromCharCode(parseInt(sql.slice(i + 2, i + 4), 16));
				i += 4;
				continue;
			}
			value += ESCAPES[next] ?? next;
			i += 2;
			continue;
		}
		if (char === quote) {
			if (sql[i + 1] === quote) {
				value += quote;
				i += 2;
				continue;
			}
			return {
				value,
				end: i + 1
			};
		}
		value += char;
		i++;
	}
	throw syntaxError(`Syntax error: failed at position ${start + 1}: unterminated quoted ${quote === "'" ? "string" : "identifier"}`);
};
const isIdentStart = (char) => /[a-zA-Z_]/.test(char);
const isIdentPart = (char) => /[a-zA-Z0-9_$]/.test(char);
const tokenize = (sql) => {
	const tokens = [];
	let i = 0;
	while (i < sql.length) {
		const char = sql[i];
		if (/\s/.test(char)) {
			i++;
			continue;
		}
		if (char === "-" && sql[i + 1] === "-") {
			while (i < sql.length && sql[i] !== "\n") i++;
			continue;
		}
		if (char === "#" && (sql[i + 1] === " " || sql[i + 1] === "!")) {
			while (i < sql.length && sql[i] !== "\n") i++;
			continue;
		}
		if (char === "/" && sql[i + 1] === "*") {
			const end = sql.indexOf("*/", i + 2);
			i = end === -1 ? sql.length : end + 2;
			continue;
		}
		if (char === "'") {
			const { value, end } = readQuoted(sql, i, "'");
			tokens.push({
				kind: "string",
				value,
				pos: i
			});
			i = end;
			continue;
		}
		if (char === "`" || char === "\"") {
			const { value, end } = readQuoted(sql, i, char);
			tokens.push({
				kind: "ident",
				value,
				quoted: true,
				pos: i
			});
			i = end;
			continue;
		}
		if (char === "{") {
			const match = /^\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*/.exec(sql.slice(i));
			if (match) {
				let depth = 0;
				let j = i + match[0].length;
				for (; j < sql.length; j++) {
					const c = sql[j];
					if (c === "(") depth++;
					else if (c === ")") depth--;
					else if (c === "'") j = readQuoted(sql, j, "'").end - 1;
					else if (c === "}" && depth === 0) break;
				}
				if (j >= sql.length) throw syntaxError(`Syntax error: failed at position ${i + 1}: unterminated query parameter`);
				tokens.push({
					kind: "param",
					name: match[1],
					type: sql.slice(i + match[0].length, j).trim(),
					pos: i
				});
				i = j + 1;
				continue;
			}
		}
		const last = tokens.at(-1);
		const accessor = last !== void 0 && (last.kind === "ident" || last.kind === "number" || last.kind === "op" && (last.value === ")" || last.value === "]"));
		const number = /^(0x[0-9a-fA-F]+|0b[01]+|(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?)/.exec(sql.slice(i));
		if (number && (/\d/.test(char) || char === "." && !accessor && /\d/.test(sql[i + 1] ?? ""))) {
			let text = number[0];
			if (accessor && last?.kind === "op" && last.value === "." && text.includes(".")) text = text.slice(0, text.indexOf("."));
			tokens.push({
				kind: "number",
				value: text,
				pos: i
			});
			i += text.length;
			continue;
		}
		if (isIdentStart(char)) {
			let j = i + 1;
			while (j < sql.length && isIdentPart(sql[j])) j++;
			tokens.push({
				kind: "ident",
				value: sql.slice(i, j),
				quoted: false,
				pos: i
			});
			i = j;
			continue;
		}
		const op = OPERATORS.find((op) => sql.startsWith(op, i));
		if (op) {
			tokens.push({
				kind: "op",
				value: op,
				pos: i
			});
			i += op.length;
			continue;
		}
		throw syntaxError(`Syntax error: failed at position ${i + 1} ('${char}'): ${sql.slice(i, i + 20)}. Unrecognized token`);
	}
	tokens.push({
		kind: "eof",
		pos: sql.length
	});
	return tokens;
};
//#endregion
//#region src/memory/values.ts
var DateTimeValue = class {
	ms;
	scale;
	timeZone;
	constructor(ms, scale, timeZone) {
		this.ms = ms;
		this.scale = scale;
		this.timeZone = timeZone;
	}
};
var DateValue = class {
	days;
	wide;
	constructor(days, wide = false) {
		this.days = days;
		this.wide = wide;
	}
};
var TupleValue = class {
	items;
	names;
	constructor(items, names) {
		this.items = items;
		this.names = names;
	}
};
var IntervalValue = class {
	unit;
	count;
	constructor(unit, count) {
		this.unit = unit;
		this.count = count;
	}
};
const isNumeric = (value) => {
	return typeof value === "number" || typeof value === "bigint";
};
const toNumber = (value) => {
	if (typeof value === "number") return value;
	if (typeof value === "bigint") return Number(value);
	if (typeof value === "boolean") return value ? 1 : 0;
	if (value instanceof DateTimeValue) return Math.floor(value.ms / 1e3);
	if (value instanceof DateValue) return value.days;
	return Number(value);
};
const normalizeNumber = (value) => {
	if (typeof value === "bigint" && value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(value);
	return value;
};
const compareStrings = (a, b) => {
	const length = Math.min(a.length, b.length);
	for (let i = 0; i < length; i++) {
		const x = a.charCodeAt(i);
		const y = b.charCodeAt(i);
		if (x === y) continue;
		if (x >= 55296 || y >= 55296) return Buffer.compare(Buffer.from(a.slice(i)), Buffer.from(b.slice(i)));
		return x - y;
	}
	return a.length - b.length;
};
const rank = (value) => {
	if (value === null) return 0;
	if (typeof value === "boolean" || isNumeric(value)) return 1;
	if (value instanceof DateTimeValue) return 2;
	if (value instanceof DateValue) return 3;
	if (typeof value === "string") return 4;
	if (Array.isArray(value)) return 5;
	if (value instanceof TupleValue) return 6;
	return 7;
};
const compareValues = (a, b) => {
	if (a === b) return 0;
	if ((isNumeric(a) || typeof a === "boolean") && (isNumeric(b) || typeof b === "boolean")) {
		const x = typeof a === "boolean" ? Number(a) : a;
		const y = typeof b === "boolean" ? Number(b) : b;
		if (typeof x === "number" && Number.isNaN(x)) return typeof y === "number" && Number.isNaN(y) ? 0 : 1;
		if (typeof y === "number" && Number.isNaN(y)) return -1;
		return x < y ? -1 : x > y ? 1 : 0;
	}
	if (a instanceof DateTimeValue && b instanceof DateTimeValue) return a.ms - b.ms;
	if (a instanceof DateValue && b instanceof DateValue) return a.days - b.days;
	if (a instanceof DateTimeValue && b instanceof DateValue) return a.ms - b.days * 864e5;
	if (a instanceof DateValue && b instanceof DateTimeValue) return a.days * 864e5 - b.ms;
	if (typeof a === "string" && typeof b === "string") return compareStrings(a, b);
	if (Array.isArray(a) && Array.isArray(b)) {
		for (let i = 0; i < Math.min(a.length, b.length); i++) {
			const result = compareValues(a[i], b[i]);
			if (result !== 0) return result;
		}
		return a.length - b.length;
	}
	if (a instanceof TupleValue && b instanceof TupleValue) return compareValues(a.items, b.items);
	return rank(a) - rank(b);
};
const valueKey = (value) => {
	if (value === null) return "n";
	if (typeof value === "string") return `s${value.length}:${value}`;
	if (typeof value === "number") return `d${value}`;
	if (typeof value === "bigint") return `d${normalizeNumber(value)}`;
	if (typeof value === "boolean") return `d${Number(value)}`;
	if (value instanceof DateTimeValue) return `t${value.ms}`;
	if (value instanceof DateValue) return `D${value.days}`;
	if (Array.isArray(value)) return `[${value.map(valueKey).join(",")}]`;
	if (value instanceof TupleValue) return `(${value.items.map(valueKey).join(",")})`;
	if (value instanceof IntervalValue) return `i${value.unit}${value.count}`;
	if (value instanceof Map) return `{${[...value.entries()].map(([k, v]) => `${valueKey(k)}:${valueKey(v)}`).join(",")}}`;
	return `j${JSON.stringify(value)}`;
};
const valuesEqual = (a, b) => valueKey(a) === valueKey(b);
//#endregion
//#region src/memory/parser.ts
const RESERVED$1 = new Set([
	"FROM",
	"WHERE",
	"PREWHERE",
	"GROUP",
	"HAVING",
	"ORDER",
	"LIMIT",
	"OFFSET",
	"SETTINGS",
	"FORMAT",
	"UNION",
	"EXCEPT",
	"INTERSECT",
	"INTO",
	"AS",
	"ON",
	"USING",
	"JOIN",
	"INNER",
	"LEFT",
	"RIGHT",
	"FULL",
	"CROSS",
	"OUTER",
	"ANY",
	"ALL",
	"ARRAY",
	"GLOBAL",
	"FINAL",
	"SAMPLE",
	"WINDOW",
	"QUALIFY",
	"WITH",
	"SEMI",
	"ANTI",
	"ASOF",
	"AND",
	"OR",
	"NOT",
	"BETWEEN",
	"LIKE",
	"ILIKE",
	"IN",
	"IS",
	"ASC",
	"DESC",
	"ASCENDING",
	"DESCENDING",
	"NULLS",
	"THEN",
	"ELSE",
	"END",
	"WHEN",
	"BY",
	"VALUES",
	"SELECT",
	"FETCH",
	"TTL",
	"ENGINE",
	"PARTITION",
	"PRIMARY",
	"COMMENT",
	"CODEC",
	"DEFAULT",
	"MATERIALIZED",
	"ALIAS",
	"EPHEMERAL",
	"AFTER",
	"FIRST",
	"REGEXP",
	"COLLATE",
	"DIV",
	"MOD"
].map((word) => word));
const INTERVAL_UNITS = {
	NANOSECOND: "Nanosecond",
	NANOSECONDS: "Nanosecond",
	NS: "Nanosecond",
	MICROSECOND: "Microsecond",
	MICROSECONDS: "Microsecond",
	US: "Microsecond",
	MILLISECOND: "Millisecond",
	MILLISECONDS: "Millisecond",
	MS: "Millisecond",
	SECOND: "Second",
	SECONDS: "Second",
	SS: "Second",
	S: "Second",
	MINUTE: "Minute",
	MINUTES: "Minute",
	MI: "Minute",
	N: "Minute",
	HOUR: "Hour",
	HOURS: "Hour",
	HH: "Hour",
	H: "Hour",
	DAY: "Day",
	DAYS: "Day",
	DD: "Day",
	D: "Day",
	WEEK: "Week",
	WEEKS: "Week",
	WK: "Week",
	WW: "Week",
	MONTH: "Month",
	MONTHS: "Month",
	MM: "Month",
	M: "Month",
	QUARTER: "Quarter",
	QUARTERS: "Quarter",
	QQ: "Quarter",
	Q: "Quarter",
	YEAR: "Year",
	YEARS: "Year",
	YYYY: "Year",
	YY: "Year"
};
const formatFloatLiteral = (value) => {
	if (!Number.isFinite(value)) return Number.isNaN(value) ? "nan" : value > 0 ? "inf" : "-inf";
	const text = String(value);
	return /[.eE]/.test(text) ? text : `${text}.`;
};
const parseNumber = (text) => {
	if (/^0x/i.test(text)) return literal$1(parseInt(text, 16), String(parseInt(text, 16)));
	if (/^0b/i.test(text)) return literal$1(parseInt(text.slice(2), 2), String(parseInt(text.slice(2), 2)));
	if (/[.eE]/.test(text)) {
		const value = Number(text);
		return {
			kind: "literal",
			value,
			text: formatFloatLiteral(value),
			float: true
		};
	}
	const big = BigInt(text);
	const value = big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big;
	return literal$1(value, String(big));
};
const quoteLiteral = (value) => {
	return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll("\n", "\\n").replaceAll("	", "\\t").replaceAll("\r", "\\r").replaceAll("\0", "\\0")}'`;
};
const isLiteral = (expr) => expr.kind === "literal";
var Parser = class {
	sql;
	pos = 0;
	tokens;
	constructor(sql) {
		this.sql = sql;
		this.tokens = tokenize(sql);
	}
	peek(offset = 0) {
		return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
	}
	next() {
		const token = this.peek();
		if (token.kind !== "eof") this.pos++;
		return token;
	}
	fail(expected) {
		const token = this.peek();
		const near = token.kind === "eof" ? "end of query" : this.sql.slice(token.pos, token.pos + 20);
		throw syntaxError(`Syntax error: failed at position ${token.pos + 1} (${near}): ${near}. Expected ${expected}`);
	}
	isKeyword(word, offset = 0) {
		const token = this.peek(offset);
		return token.kind === "ident" && !token.quoted && token.value.toUpperCase() === word;
	}
	acceptKeyword(...words) {
		if (words.every((word, index) => this.isKeyword(word, index))) {
			this.pos += words.length;
			return true;
		}
		return false;
	}
	expectKeyword(...words) {
		if (!this.acceptKeyword(...words)) this.fail(words.join(" "));
	}
	isOp(value, offset = 0) {
		const token = this.peek(offset);
		return token.kind === "op" && token.value === value;
	}
	acceptOp(value) {
		if (this.isOp(value)) {
			this.pos++;
			return true;
		}
		return false;
	}
	expectOp(value) {
		if (!this.acceptOp(value)) this.fail(`'${value}'`);
	}
	identifier() {
		const token = this.next();
		if (token.kind !== "ident") {
			this.pos--;
			this.fail("identifier");
		}
		return token.value;
	}
	string() {
		const token = this.next();
		if (token.kind !== "string") {
			this.pos--;
			this.fail("string literal");
		}
		return token.value;
	}
	integer() {
		const token = this.next();
		if (token.kind !== "number") {
			this.pos--;
			this.fail("number");
		}
		return Number(token.value);
	}
	tableName() {
		if (this.peek().kind === "param") return {
			name: "",
			param: this.next().name
		};
		const first = this.identifier();
		if (this.acceptOp(".")) return {
			database: first,
			name: this.identifier()
		};
		return { name: first };
	}
	parseTypeText() {
		const start = this.peek().pos;
		this.identifier();
		if (this.isOp("(")) {
			let depth = 0;
			do {
				const token = this.next();
				if (token.kind === "eof") this.fail("')'");
				if (token.kind === "op" && token.value === "(") depth++;
				if (token.kind === "op" && token.value === ")") depth--;
			} while (depth > 0);
		}
		return this.sql.slice(start, this.peek().pos).trim();
	}
	typeTextUntil() {
		return this.parseTypeText();
	}
	parseStatement() {
		const statement = this.statement();
		this.acceptOp(";");
		if (this.peek().kind !== "eof") {
			if (this.statementStart()) throw syntaxError("Syntax error (Multi-statements are not allowed)");
			this.fail("end of query");
		}
		return statement;
	}
	statementStart() {
		return [
			"SELECT",
			"INSERT",
			"CREATE",
			"ALTER",
			"DROP",
			"WITH"
		].some((word) => this.isKeyword(word));
	}
	statement() {
		if (this.isKeyword("SELECT") || this.isKeyword("WITH") || this.isOp("(")) {
			const start = this.peek().pos;
			const query = this.parseQuery();
			const settings = this.acceptKeyword("SETTINGS") ? this.settingsMap() : {};
			let format;
			if (this.acceptKeyword("FORMAT")) format = this.identifier();
			if (this.acceptKeyword("SETTINGS")) Object.assign(settings, this.settingsMap());
			return {
				kind: "query",
				query,
				format,
				settings,
				text: this.sql.slice(start, this.peek().pos).trim()
			};
		}
		if (this.acceptKeyword("INSERT")) return this.insert();
		if (this.acceptKeyword("CREATE")) return this.create();
		if (this.acceptKeyword("ALTER")) return this.alter();
		if (this.acceptKeyword("DROP")) {
			if (this.acceptKeyword("DATABASE")) {
				const ifExists = this.acceptKeyword("IF", "EXISTS");
				const name = this.identifier();
				this.acceptKeyword("SYNC");
				return {
					kind: "drop-database",
					ifExists,
					name
				};
			}
			this.acceptKeyword("TEMPORARY");
			if (!this.acceptKeyword("TABLE")) this.acceptKeyword("VIEW") || this.acceptKeyword("DICTIONARY") || this.fail("TABLE");
			const ifExists = this.acceptKeyword("IF", "EXISTS");
			const table = this.tableName();
			this.acceptKeyword("SYNC") || this.acceptKeyword("NO", "DELAY");
			return {
				kind: "drop-table",
				ifExists,
				...table
			};
		}
		if (this.acceptKeyword("TRUNCATE")) {
			this.acceptKeyword("TABLE");
			const ifExists = this.acceptKeyword("IF", "EXISTS");
			const table = this.tableName();
			this.acceptKeyword("SYNC");
			return {
				kind: "truncate",
				ifExists,
				...table
			};
		}
		if (this.acceptKeyword("RENAME")) {
			this.expectKeyword("TABLE");
			const from = this.tableName();
			this.expectKeyword("TO");
			return {
				kind: "rename-table",
				from,
				to: this.tableName()
			};
		}
		if (this.acceptKeyword("DELETE")) {
			this.expectKeyword("FROM");
			const table = this.tableName();
			this.expectKeyword("WHERE");
			return {
				kind: "delete",
				...table,
				where: this.expression()
			};
		}
		if (this.acceptKeyword("OPTIMIZE")) {
			this.expectKeyword("TABLE");
			const table = this.tableName();
			const final = this.acceptKeyword("FINAL");
			this.acceptKeyword("DEDUPLICATE");
			return {
				kind: "optimize",
				...table,
				final
			};
		}
		if (this.acceptKeyword("EXISTS")) {
			this.acceptKeyword("TEMPORARY");
			this.acceptKeyword("TABLE");
			return {
				kind: "exists",
				...this.tableName(),
				format: this.trailingFormat()
			};
		}
		if (this.acceptKeyword("SHOW")) {
			if (this.acceptKeyword("TABLES")) return {
				kind: "show-tables",
				format: this.trailingFormat()
			};
			this.expectKeyword("CREATE");
			this.acceptKeyword("TABLE");
			return {
				kind: "show-create",
				...this.tableName(),
				format: this.trailingFormat()
			};
		}
		if (this.acceptKeyword("DESCRIBE") || this.acceptKeyword("DESC")) {
			this.acceptKeyword("TABLE");
			return {
				kind: "describe",
				...this.tableName(),
				format: this.trailingFormat()
			};
		}
		if (this.acceptKeyword("SET")) return {
			kind: "set",
			settings: this.settingsMap()
		};
		if (this.acceptKeyword("USE")) return {
			kind: "use",
			database: this.identifier()
		};
		this.fail("SELECT, INSERT, CREATE, ALTER, DROP, TRUNCATE, DELETE, OPTIMIZE, RENAME, SHOW, DESCRIBE, EXISTS or SET");
	}
	trailingFormat() {
		return this.acceptKeyword("FORMAT") ? this.identifier() : void 0;
	}
	settingsList() {
		const settings = [];
		do {
			const name = this.identifier();
			this.expectOp("=");
			const value = this.primary();
			if (!isLiteral(value)) this.fail("literal");
			settings.push([name, value.value]);
		} while (this.acceptOp(","));
		return settings;
	}
	settingsMap() {
		return Object.fromEntries(this.settingsList());
	}
	insert() {
		this.expectKeyword("INTO");
		this.acceptKeyword("TABLE");
		if (this.acceptKeyword("FUNCTION")) throw syntaxError("INSERT INTO FUNCTION is not supported by the in-memory ClickHouse");
		const table = this.tableName();
		let columns;
		if (this.acceptOp("(")) {
			columns = [];
			do
				columns.push(this.identifier());
			while (this.acceptOp(","));
			this.expectOp(")");
		}
		const settings = this.acceptKeyword("SETTINGS") ? this.settingsMap() : {};
		if (this.acceptKeyword("VALUES")) {
			const values = [];
			do {
				this.expectOp("(");
				const row = [];
				if (!this.isOp(")")) do
					row.push(this.expression());
				while (this.acceptOp(","));
				this.expectOp(")");
				values.push(row);
			} while (this.acceptOp(",") || this.isOp("("));
			return {
				kind: "insert",
				...table,
				columns,
				values,
				settings
			};
		}
		if (this.isKeyword("FORMAT")) {
			this.next();
			const formatToken = this.next();
			if (formatToken.kind !== "ident") this.fail("format name");
			const start = formatToken.pos + formatToken.value.length;
			const data = this.sql.slice(start).replace(/^[ \t]*\r?\n?/, "");
			this.pos = this.tokens.length - 1;
			return {
				kind: "insert",
				...table,
				columns,
				format: formatToken.value,
				data,
				settings
			};
		}
		if (this.isKeyword("SELECT") || this.isKeyword("WITH") || this.isOp("(")) return {
			kind: "insert",
			...table,
			columns,
			select: this.parseQuery(),
			settings
		};
		if (this.peek().kind === "eof") return {
			kind: "insert",
			...table,
			columns,
			format: "Values",
			data: "",
			settings
		};
		this.fail("VALUES, FORMAT or SELECT");
	}
	create() {
		const orReplace = this.acceptKeyword("OR", "REPLACE");
		if (this.acceptKeyword("DATABASE")) {
			const ifNotExists = this.acceptKeyword("IF", "NOT", "EXISTS");
			const name = this.identifier();
			if (this.acceptKeyword("ENGINE")) {
				this.expectOp("=");
				this.identifier();
				if (this.acceptOp("(")) this.expectOp(")");
			}
			return {
				kind: "create-database",
				ifNotExists,
				name
			};
		}
		this.acceptKeyword("TEMPORARY");
		if (!this.acceptKeyword("TABLE")) throw syntaxError("Only CREATE TABLE & CREATE DATABASE are supported by the in-memory ClickHouse");
		const ifNotExists = this.acceptKeyword("IF", "NOT", "EXISTS");
		const table = this.tableName();
		const columns = [];
		const indexes = [];
		if (this.acceptOp("(")) {
			do
				if (this.acceptKeyword("INDEX")) indexes.push(this.indexDef());
				else if (this.isKeyword("PROJECTION") || this.isKeyword("CONSTRAINT")) throw syntaxError(`${this.peek().kind === "ident" ? this.peek().value : ""} isn't supported by the in-memory ClickHouse`);
				else if (this.acceptKeyword("PRIMARY", "KEY")) this.primaryKeyClause();
				else columns.push(this.columnDef());
			while (this.acceptOp(","));
			this.expectOp(")");
		}
		let engine = {
			name: "MergeTree",
			args: []
		};
		let partitionBy;
		let primaryKey;
		let orderBy;
		let ttl;
		let settings = [];
		let comment;
		let as;
		while (true) if (this.acceptKeyword("ENGINE")) {
			this.acceptOp("=");
			const name = this.identifier();
			const args = [];
			if (this.acceptOp("(")) {
				if (!this.isOp(")")) do
					args.push(this.expression());
				while (this.acceptOp(","));
				this.expectOp(")");
			}
			engine = {
				name,
				args
			};
		} else if (this.acceptKeyword("PARTITION", "BY")) partitionBy = this.expression();
		else if (this.acceptKeyword("PRIMARY", "KEY")) primaryKey = this.keyList();
		else if (this.acceptKeyword("ORDER", "BY")) orderBy = this.keyList();
		else if (this.acceptKeyword("SAMPLE", "BY")) this.expression();
		else if (this.acceptKeyword("TTL")) ttl = this.ttlList();
		else if (this.acceptKeyword("SETTINGS")) settings = this.settingsList();
		else if (this.acceptKeyword("COMMENT")) comment = this.string();
		else if (this.acceptKeyword("AS")) as = this.parseQuery();
		else break;
		return {
			kind: "create-table",
			ifNotExists,
			orReplace,
			...table,
			columns,
			indexes,
			engine,
			partitionBy,
			primaryKey,
			orderBy,
			ttl,
			settings,
			comment,
			as
		};
	}
	ttlList() {
		const rules = [];
		do {
			rules.push(this.expression());
			if (this.acceptKeyword("DELETE")) continue;
			if (this.isKeyword("TO") || this.isKeyword("GROUP") || this.isKeyword("RECOMPRESS")) throw syntaxError("TTL moves, GROUP BY & RECOMPRESS are not supported by the in-memory ClickHouse");
		} while (this.acceptOp(","));
		return rules.length === 1 ? rules[0] : fn("__ttl", ...rules);
	}
	primaryKeyClause() {
		return this.keyList();
	}
	keyList() {
		const expr = this.expression();
		if (expr.kind === "function" && expr.name === "tuple") return expr.args;
		if (expr.kind === "literal" && expr.value instanceof TupleValue) return expr.value.items.map((item) => literal$1(item));
		return [expr];
	}
	columnDef() {
		const column = { name: this.identifier() };
		if (this.peek().kind === "ident" && ![
			"DEFAULT",
			"MATERIALIZED",
			"ALIAS",
			"EPHEMERAL",
			"COMMENT",
			"CODEC",
			"TTL",
			"NULL",
			"NOT",
			"PRIMARY",
			"FIRST",
			"AFTER",
			"SETTINGS",
			"REMOVE"
		].some((word) => this.isKeyword(word))) column.type = this.typeTextUntil();
		while (true) {
			if (this.acceptKeyword("NOT", "NULL")) continue;
			if (this.acceptKeyword("NULL")) {
				column.type = column.type ? `Nullable(${column.type})` : column.type;
				continue;
			}
			const kind = [
				"DEFAULT",
				"MATERIALIZED",
				"ALIAS",
				"EPHEMERAL"
			].find((word) => this.isKeyword(word));
			if (kind) {
				this.next();
				column.defaultKind = kind;
				if (!(kind === "EPHEMERAL" && (this.isOp(",") || this.isOp(")")))) column.defaultExpr = this.expression();
				continue;
			}
			if (this.acceptKeyword("COMMENT")) {
				column.comment = this.string();
				continue;
			}
			if (this.acceptKeyword("CODEC")) {
				this.expectOp("(");
				const start = this.peek().pos;
				let depth = 0;
				while (!(depth === 0 && this.isOp(")"))) {
					const token = this.next();
					if (token.kind === "eof") this.fail("')'");
					if (token.kind === "op" && token.value === "(") depth++;
					if (token.kind === "op" && token.value === ")") depth--;
				}
				column.codec = this.sql.slice(start, this.peek().pos).trim();
				this.expectOp(")");
				continue;
			}
			if (this.acceptKeyword("TTL")) {
				column.ttl = this.expression();
				continue;
			}
			if (this.acceptKeyword("PRIMARY", "KEY")) continue;
			break;
		}
		return column;
	}
	indexDef() {
		const name = this.identifier();
		const expr = this.expression();
		this.expectKeyword("TYPE");
		return {
			name,
			expr,
			type: this.typeTextUntil(),
			granularity: this.acceptKeyword("GRANULARITY") ? this.integer() : 1
		};
	}
	position() {
		if (this.acceptKeyword("FIRST")) return { first: true };
		if (this.acceptKeyword("AFTER")) return { after: this.identifier() };
		return {};
	}
	alter() {
		this.expectKeyword("TABLE");
		const table = this.tableName();
		const actions = [];
		do
			actions.push(this.alterAction());
		while (this.acceptOp(","));
		this.acceptKeyword("SETTINGS") && this.settingsList();
		return {
			kind: "alter",
			...table,
			actions
		};
	}
	alterAction() {
		if (this.acceptKeyword("ADD", "COLUMN")) return {
			kind: "add-column",
			ifNotExists: this.acceptKeyword("IF", "NOT", "EXISTS"),
			column: this.columnDef(),
			...this.position()
		};
		if (this.acceptKeyword("DROP", "COLUMN")) return {
			kind: "drop-column",
			ifExists: this.acceptKeyword("IF", "EXISTS"),
			name: this.identifier()
		};
		if (this.acceptKeyword("MODIFY", "COLUMN")) {
			const ifExists = this.acceptKeyword("IF", "EXISTS");
			if (this.peek(1).kind === "ident" && this.isKeyword("REMOVE", 1)) {
				const name = this.identifier();
				this.expectKeyword("REMOVE");
				const remove = this.identifier().toUpperCase();
				return {
					kind: "modify-column",
					ifExists,
					column: { name },
					remove
				};
			}
			const column = this.columnDef();
			if (this.acceptKeyword("REMOVE")) return {
				kind: "modify-column",
				ifExists,
				column,
				remove: this.identifier().toUpperCase()
			};
			return {
				kind: "modify-column",
				ifExists,
				column,
				...this.position()
			};
		}
		if (this.acceptKeyword("RENAME", "COLUMN")) {
			const ifExists = this.acceptKeyword("IF", "EXISTS");
			const from = this.identifier();
			this.expectKeyword("TO");
			return {
				kind: "rename-column",
				ifExists,
				from,
				to: this.identifier()
			};
		}
		if (this.acceptKeyword("COMMENT", "COLUMN")) return {
			kind: "comment-column",
			ifExists: this.acceptKeyword("IF", "EXISTS"),
			name: this.identifier(),
			comment: this.string()
		};
		if (this.acceptKeyword("ADD", "INDEX")) return {
			kind: "add-index",
			ifNotExists: this.acceptKeyword("IF", "NOT", "EXISTS"),
			index: this.indexDef(),
			...this.position()
		};
		if (this.acceptKeyword("DROP", "INDEX")) return {
			kind: "drop-index",
			ifExists: this.acceptKeyword("IF", "EXISTS"),
			name: this.identifier()
		};
		if (this.acceptKeyword("MATERIALIZE", "INDEX")) {
			const name = this.identifier();
			this.skipPartition();
			return {
				kind: "materialize-index",
				name
			};
		}
		if (this.acceptKeyword("CLEAR", "INDEX")) {
			const name = this.identifier();
			this.skipPartition();
			return {
				kind: "clear-index",
				name
			};
		}
		if (this.acceptKeyword("MATERIALIZE", "COLUMN")) {
			const name = this.identifier();
			this.skipPartition();
			return {
				kind: "materialize-column",
				name
			};
		}
		if (this.acceptKeyword("MATERIALIZE", "TTL")) {
			this.skipPartition();
			return { kind: "materialize-ttl" };
		}
		if (this.acceptKeyword("MODIFY", "TTL")) return {
			kind: "modify-ttl",
			ttl: this.ttlList()
		};
		if (this.acceptKeyword("REMOVE", "TTL")) return { kind: "remove-ttl" };
		if (this.acceptKeyword("MODIFY", "SETTING")) return {
			kind: "modify-setting",
			settings: this.settingsList()
		};
		if (this.acceptKeyword("RESET", "SETTING")) {
			const names = [];
			do
				names.push(this.identifier());
			while (this.acceptOp(",") && this.peek().kind === "ident" && !this.isKeyword("MODIFY", 0));
			return {
				kind: "reset-setting",
				names
			};
		}
		if (this.acceptKeyword("MODIFY", "COMMENT")) return {
			kind: "modify-comment",
			comment: this.string()
		};
		if (this.acceptKeyword("MODIFY", "ORDER", "BY")) return {
			kind: "modify-order-by",
			exprs: this.keyList()
		};
		if (this.acceptKeyword("DELETE")) {
			this.skipPartition();
			this.expectKeyword("WHERE");
			return {
				kind: "delete",
				where: this.expression()
			};
		}
		if (this.acceptKeyword("UPDATE")) {
			const assignments = [];
			do {
				const name = this.identifier();
				this.expectOp("=");
				assignments.push([name, this.expression()]);
			} while (this.acceptOp(","));
			this.skipPartition();
			this.expectKeyword("WHERE");
			return {
				kind: "update",
				assignments,
				where: this.expression()
			};
		}
		throw syntaxError(`Syntax error: failed at position ${this.peek().pos + 1}: ALTER action not supported by the in-memory ClickHouse`);
	}
	skipPartition() {
		if (this.acceptKeyword("IN", "PARTITION")) this.expression();
	}
	parseQuery() {
		const selects = [this.selectOrParenthesized()];
		const distinct = [];
		while (this.acceptKeyword("UNION")) {
			if (this.acceptKeyword("ALL")) distinct.push(false);
			else {
				this.acceptKeyword("DISTINCT");
				distinct.push(true);
			}
			selects.push(this.selectOrParenthesized());
		}
		return {
			kind: "union",
			selects,
			distinct
		};
	}
	selectOrParenthesized() {
		if (this.isOp("(")) {
			this.next();
			const query = this.parseQuery();
			this.expectOp(")");
			if (query.selects.length === 1) return query.selects[0];
			return this.emptySelect({
				columns: [{ kind: "asterisk" }],
				from: {
					kind: "subquery",
					query
				}
			});
		}
		return this.select();
	}
	emptySelect(props) {
		return {
			kind: "select",
			with: [],
			distinct: false,
			columns: [],
			joins: [],
			groupBy: [],
			withTotals: false,
			orderBy: [],
			settings: {},
			...props
		};
	}
	select() {
		const select = this.emptySelect({});
		if (this.acceptKeyword("WITH")) do
			if (this.peek().kind === "ident" && this.isKeyword("AS", 1) && this.isOp("(", 2) && (this.isKeyword("SELECT", 3) || this.isKeyword("WITH", 3))) {
				const name = this.identifier();
				this.expectKeyword("AS");
				this.expectOp("(");
				const query = this.parseQuery();
				this.expectOp(")");
				select.with.push({
					name,
					query
				});
			} else {
				const expr = this.expression();
				this.expectKeyword("AS");
				select.with.push({
					name: this.identifier(),
					expr
				});
			}
		while (this.acceptOp(","));
		this.expectKeyword("SELECT");
		select.distinct = this.acceptKeyword("DISTINCT");
		this.acceptKeyword("ALL");
		if (this.acceptKeyword("TOP")) select.limit = this.integer();
		do
			select.columns.push(this.selectItem());
		while (this.acceptOp(","));
		if (this.acceptKeyword("FROM")) {
			select.from = this.tableSource();
			while (true) {
				if (this.acceptOp(",")) {
					select.joins.push({
						kind: "CROSS",
						source: this.tableSource()
					});
					continue;
				}
				const join = this.join();
				if (!join) break;
				select.joins.push(join);
			}
		}
		if (this.isKeyword("ARRAY", 0) || this.isKeyword("LEFT") && this.isKeyword("ARRAY", 1)) {
			const left = this.acceptKeyword("LEFT");
			this.expectKeyword("ARRAY", "JOIN");
			const exprs = [];
			do
				exprs.push(this.aliased(this.expression()));
			while (this.acceptOp(","));
			select.arrayJoin = {
				exprs,
				left
			};
		}
		if (this.acceptKeyword("PREWHERE")) select.prewhere = this.expression();
		if (this.acceptKeyword("WHERE")) select.where = this.expression();
		if (this.acceptKeyword("GROUP", "BY")) {
			if (this.acceptKeyword("ALL")) select.groupBy = [{ kind: "asterisk" }];
			else do
				select.groupBy.push(this.expression());
			while (this.acceptOp(","));
			if (this.acceptKeyword("WITH", "TOTALS")) select.withTotals = true;
			if (this.isKeyword("WITH") && (this.isKeyword("ROLLUP", 1) || this.isKeyword("CUBE", 1))) throw syntaxError("WITH ROLLUP & WITH CUBE are not supported by the in-memory ClickHouse");
		}
		if (this.acceptKeyword("HAVING")) select.having = this.expression();
		if (this.isKeyword("WINDOW") || this.isKeyword("QUALIFY")) throw syntaxError("Window functions are not supported by the in-memory ClickHouse");
		if (this.acceptKeyword("ORDER", "BY")) {
			if (this.acceptKeyword("ALL")) select.orderBy.push({
				expr: { kind: "asterisk" },
				direction: this.direction()
			});
			else do
				select.orderBy.push(this.orderItem());
			while (this.acceptOp(","));
		}
		while (this.acceptKeyword("LIMIT")) {
			let limit = this.integer();
			let offset = 0;
			if (this.acceptOp(",")) {
				offset = limit;
				limit = this.integer();
			} else if (this.acceptKeyword("OFFSET")) offset = this.integer();
			if (this.acceptKeyword("BY")) {
				const exprs = [];
				do
					exprs.push(this.expression());
				while (this.acceptOp(","));
				select.limitBy = {
					limit,
					offset,
					exprs
				};
				continue;
			}
			if (this.acceptKeyword("WITH", "TIES")) throw syntaxError("LIMIT WITH TIES is not supported by the in-memory ClickHouse");
			select.limit = limit;
			select.offset = offset || void 0;
		}
		if (this.acceptKeyword("OFFSET")) {
			select.offset = this.integer();
			this.acceptKeyword("ROWS") || this.acceptKeyword("ROW");
			if (this.acceptKeyword("FETCH")) {
				this.acceptKeyword("FIRST") || this.acceptKeyword("NEXT");
				select.limit = this.integer();
				this.acceptKeyword("ROWS") || this.acceptKeyword("ROW");
				this.expectKeyword("ONLY");
			}
		}
		if (this.isKeyword("SETTINGS") && !this.isKeyword("FORMAT", 1)) {
			if (this.isKeyword("UNION", this.settingsLength() + 1)) {
				this.next();
				select.settings = this.settingsMap();
			}
		}
		return select;
	}
	settingsLength() {
		let offset = 1;
		while (this.peek(offset).kind !== "eof" && !this.isKeyword("UNION", offset) && !this.isKeyword("FORMAT", offset) && !this.isOp(")", offset)) offset++;
		return offset - 1;
	}
	direction() {
		if (this.acceptKeyword("DESC") || this.acceptKeyword("DESCENDING")) return "DESC";
		this.acceptKeyword("ASC") || this.acceptKeyword("ASCENDING");
		return "ASC";
	}
	orderItem() {
		const expr = this.aliased(this.expression());
		const direction = this.direction();
		let nulls;
		if (this.acceptKeyword("NULLS")) nulls = this.acceptKeyword("FIRST") ? "FIRST" : (this.expectKeyword("LAST"), "LAST");
		if (this.acceptKeyword("COLLATE")) this.string();
		if (this.acceptKeyword("WITH", "FILL")) throw syntaxError("ORDER BY WITH FILL is not supported by the in-memory ClickHouse");
		return {
			expr,
			direction,
			nulls
		};
	}
	join() {
		const start = this.pos;
		this.acceptKeyword("GLOBAL");
		let strictness;
		if (this.acceptKeyword("ANY")) strictness = "ANY";
		else if (this.acceptKeyword("ALL")) strictness = "ALL";
		else if (this.isKeyword("ASOF") || this.isKeyword("SEMI") || this.isKeyword("ANTI")) throw syntaxError(`${this.peek().value} JOIN is not supported by the in-memory ClickHouse`);
		let kind = "INNER";
		if (this.acceptKeyword("INNER")) kind = "INNER";
		else if (this.acceptKeyword("LEFT")) kind = "LEFT";
		else if (this.acceptKeyword("RIGHT")) kind = "RIGHT";
		else if (this.acceptKeyword("FULL")) kind = "FULL";
		else if (this.acceptKeyword("CROSS")) kind = "CROSS";
		this.acceptKeyword("OUTER");
		if (!this.acceptKeyword("JOIN")) {
			this.pos = start;
			return;
		}
		const source = this.tableSource();
		const join = {
			kind,
			strictness,
			source
		};
		if (this.acceptKeyword("ON")) join.on = this.expression();
		else if (this.acceptKeyword("USING")) {
			const parenthesized = this.acceptOp("(");
			join.using = [];
			do
				join.using.push(this.identifier());
			while (this.acceptOp(","));
			if (parenthesized) this.expectOp(")");
		}
		return join;
	}
	tableSource() {
		let source;
		if (this.acceptOp("(")) {
			const query = this.parseQuery();
			this.expectOp(")");
			source = {
				kind: "subquery",
				query
			};
		} else if (this.peek().kind === "param") source = {
			kind: "table",
			name: "",
			param: this.next().name
		};
		else if (this.peek().kind === "ident" && this.isOp("(", 1)) {
			const name = this.identifier();
			this.expectOp("(");
			const args = [];
			if (!this.isOp(")")) do
				args.push(this.expression());
			while (this.acceptOp(","));
			this.expectOp(")");
			source = {
				kind: "function",
				name,
				args
			};
		} else source = {
			kind: "table",
			...this.tableName()
		};
		if (this.acceptKeyword("FINAL")) source.final = true;
		if (this.acceptKeyword("AS")) source.alias = this.identifier();
		else if (this.peek().kind === "ident" && !this.reserved()) source.alias = this.identifier();
		if (this.acceptKeyword("FINAL")) source.final = true;
		if (this.acceptKeyword("SAMPLE")) throw syntaxError("SAMPLE is not supported by the in-memory ClickHouse");
		return source;
	}
	reserved(offset = 0) {
		const token = this.peek(offset);
		return token.kind === "ident" && !token.quoted && RESERVED$1.has(token.value.toUpperCase());
	}
	selectItem() {
		return this.aliased(this.expression(), true);
	}
	aliased(expr, implicit = false) {
		if (this.acceptKeyword("AS")) return {
			...expr,
			alias: this.identifier()
		};
		if (implicit && this.peek().kind === "ident" && !this.reserved()) return {
			...expr,
			alias: this.identifier()
		};
		return expr;
	}
	expression() {
		return this.lambdaOrTernary();
	}
	lambdaOrTernary() {
		if (this.peek().kind === "ident" && this.isOp("->", 1)) {
			const param = this.identifier();
			this.expectOp("->");
			return {
				kind: "lambda",
				params: [param],
				body: this.expression()
			};
		}
		if (this.isOp("(")) {
			let offset = 1;
			const params = [];
			while (this.peek(offset).kind === "ident") {
				params.push(this.peek(offset).value);
				offset++;
				if (this.isOp(",", offset)) offset++;
				else break;
			}
			if (params.length > 0 && this.isOp(")", offset) && this.isOp("->", offset + 1)) {
				this.pos += offset + 2;
				return {
					kind: "lambda",
					params,
					body: this.expression()
				};
			}
		}
		const condition = this.or();
		if (this.acceptOp("?")) {
			const then = this.expression();
			this.expectOp(":");
			const otherwise = this.expression();
			return fn("if", condition, then, otherwise);
		}
		return condition;
	}
	or() {
		let left = this.and();
		while (this.acceptKeyword("OR")) {
			const right = this.and();
			left = left.kind === "function" && left.name === "or" && !left.alias ? {
				...left,
				args: [...left.args, right]
			} : fn("or", left, right);
		}
		return left;
	}
	and() {
		let left = this.not();
		while (this.acceptKeyword("AND")) {
			const right = this.not();
			left = left.kind === "function" && left.name === "and" && !left.alias ? {
				...left,
				args: [...left.args, right]
			} : fn("and", left, right);
		}
		return left;
	}
	not() {
		if (this.isKeyword("NOT") && !this.isOp("(", 1)) {
			this.next();
			return fn("not", this.not());
		}
		if (this.isKeyword("NOT") && this.isOp("(", 1)) {
			this.next();
			return fn("not", this.comparison());
		}
		return this.comparison();
	}
	comparison() {
		const left = this.concat();
		const binary = {
			"=": "equals",
			"==": "equals",
			"!=": "notEquals",
			"<>": "notEquals",
			"<": "less",
			">": "greater",
			"<=": "lessOrEquals",
			">=": "greaterOrEquals"
		};
		const token = this.peek();
		if (token.kind === "op" && binary[token.value]) {
			this.next();
			return fn(binary[token.value], left, this.concat());
		}
		if (this.acceptKeyword("IS")) {
			const negate = this.acceptKeyword("NOT");
			this.expectKeyword("NULL");
			return fn(negate ? "isNotNull" : "isNull", left);
		}
		const negate = this.isKeyword("NOT") && (this.isKeyword("LIKE", 1) || this.isKeyword("ILIKE", 1) || this.isKeyword("IN", 1) || this.isKeyword("BETWEEN", 1) || this.isKeyword("REGEXP", 1));
		if (negate) this.next();
		if (this.acceptKeyword("LIKE")) return fn(negate ? "notLike" : "like", left, this.concat());
		if (this.acceptKeyword("ILIKE")) return fn(negate ? "notILike" : "ilike", left, this.concat());
		if (this.acceptKeyword("REGEXP")) {
			const match = fn("match", left, this.concat());
			return negate ? fn("not", match) : match;
		}
		if (this.acceptKeyword("BETWEEN")) {
			const low = this.concat();
			this.expectKeyword("AND");
			const high = this.concat();
			return negate ? fn("or", fn("less", left, low), fn("greater", left, high)) : fn("and", fn("greaterOrEquals", left, low), fn("lessOrEquals", left, high));
		}
		const global = this.isKeyword("GLOBAL") && (this.isKeyword("IN", 1) || this.isKeyword("NOT", 1));
		if (global) this.next();
		if (!negate && global && this.acceptKeyword("NOT")) {
			this.expectKeyword("IN");
			return fn("globalNotIn", left, this.inRight());
		}
		if (this.acceptKeyword("IN")) return fn(negate ? global ? "globalNotIn" : "notIn" : global ? "globalIn" : "in", left, this.inRight());
		return left;
	}
	inRight() {
		if (this.isOp("(") && (this.isKeyword("SELECT", 1) || this.isKeyword("WITH", 1))) {
			this.next();
			const query = this.parseQuery();
			this.expectOp(")");
			return {
				kind: "subquery",
				query
			};
		}
		return this.concat();
	}
	concat() {
		let left = this.additive();
		while (this.acceptOp("||")) {
			const right = this.additive();
			left = left.kind === "function" && left.name === "concat" && !left.alias ? {
				...left,
				args: [...left.args, right]
			} : fn("concat", left, right);
		}
		return left;
	}
	additive() {
		let left = this.multiplicative();
		while (true) if (this.acceptOp("+")) left = fn("plus", left, this.multiplicative());
		else if (this.acceptOp("-")) left = fn("minus", left, this.multiplicative());
		else return left;
	}
	multiplicative() {
		let left = this.unary();
		while (true) if (this.acceptOp("*")) left = fn("multiply", left, this.unary());
		else if (this.acceptOp("/")) left = fn("divide", left, this.unary());
		else if (this.acceptOp("%") || this.acceptKeyword("MOD")) left = fn("modulo", left, this.unary());
		else if (this.acceptKeyword("DIV")) left = fn("intDiv", left, this.unary());
		else return left;
	}
	unary() {
		if (this.acceptOp("-")) {
			const operand = this.unary();
			if (operand.kind === "literal" && (typeof operand.value === "number" || typeof operand.value === "bigint") && !operand.alias) {
				const value = typeof operand.value === "bigint" ? -operand.value : -operand.value;
				const text = operand.float ? formatFloatLiteral(value) : String(value);
				return {
					...operand,
					value,
					text
				};
			}
			return fn("negate", operand);
		}
		if (this.acceptOp("+")) return this.unary();
		return this.postfix(this.primary());
	}
	postfix(base) {
		while (true) {
			if (this.acceptOp("[")) {
				const index = this.expression();
				this.expectOp("]");
				base = fn("arrayElement", base, index);
				continue;
			}
			if (this.isOp(".") && this.peek(1).kind === "number") {
				this.next();
				base = fn("tupleElement", base, literal$1(this.integer()));
				continue;
			}
			if (this.isOp(".") && this.peek(1).kind === "ident" && base.kind !== "identifier") {
				this.next();
				base = fn("tupleElement", base, literal$1(this.identifier()));
				continue;
			}
			if (this.acceptOp("::")) {
				const type = this.parseTypeText();
				const value = base.kind === "literal" && typeof base.value !== "string" && base.text ? literal$1(base.text) : base;
				base = fn("CAST", value, literal$1(type));
				continue;
			}
			return base;
		}
	}
	primary() {
		const token = this.peek();
		if (token.kind === "number") {
			this.next();
			return parseNumber(token.value);
		}
		if (token.kind === "string") {
			this.next();
			return literal$1(token.value, quoteLiteral(token.value));
		}
		if (token.kind === "param") {
			this.next();
			return {
				kind: "param",
				name: token.name,
				type: token.type
			};
		}
		if (token.kind === "op") {
			if (token.value === "(") return this.parenthesized();
			if (token.value === "[") return this.array();
			if (token.value === "*") {
				this.next();
				return this.asteriskModifiers({ kind: "asterisk" });
			}
		}
		if (token.kind !== "ident") this.fail("expression");
		if (!token.quoted) {
			const upper = token.value.toUpperCase();
			if (upper === "NULL") {
				this.next();
				return literal$1(null, "NULL");
			}
			if (upper === "TRUE" || upper === "FALSE") {
				this.next();
				return literal$1(upper === "TRUE", upper.toLowerCase());
			}
			if ((upper === "INF" || upper === "NAN") && !this.isOp("(", 1)) {
				this.next();
				return literal$1(upper === "INF" ? Infinity : NaN, upper.toLowerCase());
			}
			if (upper === "CASE") return this.caseExpression();
			if (upper === "CAST" && this.isOp("(", 1)) return this.cast();
			if (upper === "INTERVAL" && !this.isOp("(", 1)) return this.interval();
			if ((upper === "DATE" || upper === "TIMESTAMP") && this.peek(1).kind === "string") {
				this.next();
				const value = this.string();
				return fn(upper === "DATE" ? "toDate" : "toDateTime", literal$1(value));
			}
			if (upper === "EXISTS" && this.isOp("(", 1)) {
				this.next();
				this.expectOp("(");
				const query = this.parseQuery();
				this.expectOp(")");
				return fn("exists", {
					kind: "subquery",
					query
				});
			}
			if (upper === "EXTRACT" && this.isOp("(", 1) && this.peek(3).kind === "ident" && this.isKeyword("FROM", 3)) {
				this.next();
				this.expectOp("(");
				const part = this.identifier().toUpperCase();
				this.expectKeyword("FROM");
				const value = this.expression();
				this.expectOp(")");
				const name = {
					YEAR: "toYear",
					MONTH: "toMonth",
					DAY: "toDayOfMonth",
					HOUR: "toHour",
					MINUTE: "toMinute",
					SECOND: "toSecond"
				}[part];
				if (!name) this.fail("YEAR, MONTH, DAY, HOUR, MINUTE or SECOND");
				return fn(name, value);
			}
		}
		const name = this.identifier();
		if (this.isOp("(")) return this.functionCall(name);
		const parts = [name];
		while (this.isOp(".") && (this.peek(1).kind === "ident" || this.isOp("*", 1))) {
			this.next();
			if (this.acceptOp("*")) return this.asteriskModifiers({
				kind: "asterisk",
				table: parts.join(".")
			});
			parts.push(this.identifier());
		}
		return {
			kind: "identifier",
			parts
		};
	}
	asteriskModifiers(expr) {
		if (this.acceptKeyword("EXCEPT")) {
			const parenthesized = this.acceptOp("(");
			const except = [];
			do
				except.push(this.identifier());
			while (parenthesized && this.acceptOp(","));
			if (parenthesized) this.expectOp(")");
			return {
				...expr,
				except
			};
		}
		return expr;
	}
	functionCall(written) {
		const name = {
			trim: "trimBoth",
			ltrim: "trimLeft",
			rtrim: "trimRight"
		}[written.toLowerCase()] ?? written;
		this.expectOp("(");
		let distinct = false;
		const args = this.argumentList(() => {
			if (this.acceptKeyword("DISTINCT")) distinct = true;
			else this.acceptKeyword("ALL");
		});
		let call = {
			kind: "function",
			name,
			args,
			...distinct ? { distinct } : {}
		};
		if (this.isOp("(")) {
			this.next();
			call = {
				kind: "function",
				name,
				params: args,
				args: this.argumentList(() => {})
			};
		}
		if (this.acceptKeyword("FILTER")) throw syntaxError("FILTER clauses are not supported by the in-memory ClickHouse, use the -If combinator");
		if (this.isKeyword("RESPECT") || this.isKeyword("IGNORE")) {
			this.next();
			this.expectKeyword("NULLS");
		}
		if (this.acceptKeyword("OVER")) throw syntaxError("Window functions are not supported by the in-memory ClickHouse");
		return call;
	}
	argumentList(prefix) {
		const args = [];
		if (this.acceptOp(")")) return args;
		prefix();
		if (this.isOp("*") && this.isOp(")", 1)) {
			this.next();
			this.next();
			return args;
		}
		do
			args.push(this.aliased(this.expression()));
		while (this.acceptOp(","));
		this.expectOp(")");
		return args;
	}
	parenthesized() {
		this.expectOp("(");
		if (this.isKeyword("SELECT") || this.isKeyword("WITH")) {
			const query = this.parseQuery();
			this.expectOp(")");
			return {
				kind: "subquery",
				query
			};
		}
		if (this.acceptOp(")")) return literal$1(new TupleValue([]), "()");
		const items = [this.aliased(this.expression())];
		while (this.acceptOp(",")) {
			if (this.isOp(")")) break;
			items.push(this.aliased(this.expression()));
		}
		this.expectOp(")");
		if (items.length === 1) return items[0];
		if (items.every((item) => item.kind === "literal" && !item.alias)) return literal$1(new TupleValue(items.map((item) => item.value)), `(${items.map((item) => item.text ?? "").join(", ")})`);
		return fn("tuple", ...items);
	}
	array() {
		this.expectOp("[");
		const items = [];
		if (!this.isOp("]")) do {
			if (this.isOp("]")) break;
			items.push(this.expression());
		} while (this.acceptOp(","));
		this.expectOp("]");
		if (items.every((item) => item.kind === "literal" && !item.alias)) return literal$1(items.map((item) => item.value), `[${items.map((item) => item.text ?? "").join(", ")}]`);
		return fn("array", ...items);
	}
	caseExpression() {
		this.next();
		let subject;
		if (!this.isKeyword("WHEN")) subject = this.expression();
		const args = [];
		while (this.acceptKeyword("WHEN")) {
			args.push(this.expression());
			this.expectKeyword("THEN");
			args.push(this.expression());
		}
		const otherwise = this.acceptKeyword("ELSE") ? this.expression() : literal$1(null, "NULL");
		this.expectKeyword("END");
		if (subject) return fn("caseWithExpression", subject, ...args, otherwise);
		return fn("multiIf", ...args, otherwise);
	}
	cast() {
		this.next();
		this.expectOp("(");
		const value = this.expression();
		if (this.acceptKeyword("AS")) {
			const type = this.parseTypeText();
			this.expectOp(")");
			return fn("CAST", value, literal$1(type));
		}
		this.expectOp(",");
		const type = this.expression();
		this.expectOp(")");
		return fn("CAST", value, type);
	}
	interval() {
		this.next();
		let value;
		let unit;
		if (this.peek().kind === "string") {
			const text = this.string().trim();
			const match = /^(-?\d+)\s*([a-zA-Z]+)$/.exec(text);
			if (!match) this.fail("interval");
			value = literal$1(Number(match[1]), match[1]);
			unit = INTERVAL_UNITS[match[2].toUpperCase()];
		} else {
			value = this.concat();
			unit = INTERVAL_UNITS[this.identifier().toUpperCase()];
		}
		if (!unit) this.fail("interval unit");
		return fn(`toInterval${unit}`, value);
	}
};
const parseStatement = (sql) => {
	return new Parser(sql).parseStatement();
};
//#endregion
//#region src/memory/time.ts
const formatters = /* @__PURE__ */ new Map();
const formatter = (timeZone) => {
	let format = formatters.get(timeZone);
	if (!format) {
		format = new Intl.DateTimeFormat("en-US", {
			timeZone,
			hourCycle: "h23",
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
			weekday: "short"
		});
		formatters.set(timeZone, format);
	}
	return format;
};
const isTimeZone = (timeZone) => {
	try {
		formatter(timeZone);
		return true;
	} catch {
		return false;
	}
};
const WEEKDAYS = {
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6,
	Sun: 7
};
const utcParts = (ms) => {
	const date = new Date(ms);
	return {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		day: date.getUTCDate(),
		hour: date.getUTCHours(),
		minute: date.getUTCMinutes(),
		second: date.getUTCSeconds(),
		weekday: (date.getUTCDay() + 6) % 7 + 1
	};
};
const QUARTER = 9e5;
const offsets = /* @__PURE__ */ new Map();
const cachedOffset = (ms, timeZone) => {
	let zone = offsets.get(timeZone);
	if (!zone) {
		zone = /* @__PURE__ */ new Map();
		offsets.set(timeZone, zone);
	}
	const bucket = Math.floor(ms / QUARTER);
	let offset = zone.get(bucket);
	if (offset === void 0) {
		const start = bucket * QUARTER;
		const p = intlParts(start, timeZone);
		offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - start;
		if (zone.size > 1e5) zone.clear();
		zone.set(bucket, offset);
	}
	return offset;
};
const partsIn = (ms, timeZone) => {
	if (timeZone === "UTC") return utcParts(ms);
	return utcParts(Math.floor(ms / 1e3) * 1e3 + cachedOffset(ms, timeZone));
};
const intlParts = (ms, timeZone) => {
	if (timeZone === "UTC") {
		const date = new Date(ms);
		return {
			year: date.getUTCFullYear(),
			month: date.getUTCMonth() + 1,
			day: date.getUTCDate(),
			hour: date.getUTCHours(),
			minute: date.getUTCMinutes(),
			second: date.getUTCSeconds(),
			weekday: (date.getUTCDay() + 6) % 7 + 1
		};
	}
	const parts = {};
	for (const part of formatter(timeZone).formatToParts(/* @__PURE__ */ new Date(Math.floor(ms / 1e3) * 1e3))) parts[part.type] = part.value;
	return {
		year: Number(parts.year),
		month: Number(parts.month),
		day: Number(parts.day),
		hour: Number(parts.hour),
		minute: Number(parts.minute),
		second: Number(parts.second),
		weekday: WEEKDAYS[parts.weekday]
	};
};
const offsetAt = (ms, timeZone) => {
	return timeZone === "UTC" ? 0 : cachedOffset(ms, timeZone);
};
const fromParts = (year, month, day, hour = 0, minute = 0, second = 0, timeZone = "UTC") => {
	const wall = Date.UTC(year, month - 1, day, hour, minute, second);
	if (timeZone === "UTC") return wall;
	let guess = wall - offsetAt(wall, timeZone);
	guess = wall - offsetAt(guess, timeZone);
	return guess;
};
const dayNumberIn = (ms, timeZone) => {
	const p = partsIn(ms, timeZone);
	return Math.floor(Date.UTC(p.year, p.month - 1, p.day) / 864e5);
};
const dayToParts = (days) => {
	const date = /* @__PURE__ */ new Date(days * 864e5);
	return {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		day: date.getUTCDate(),
		weekday: (date.getUTCDay() + 6) % 7 + 1
	};
};
const partsToDay = (year, month, day) => {
	return Math.floor(Date.UTC(year, month - 1, day) / 864e5);
};
const pad = (value, length = 2) => String(value).padStart(length, "0");
const formatDay = (days) => {
	const p = dayToParts(days);
	return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
};
const formatDateTime = (ms, timeZone, scale) => {
	const p = partsIn(ms, timeZone);
	const base = `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
	return scale > 0 ? `${base}.${fraction(ms, scale)}` : base;
};
const formatIso = (ms, scale) => {
	const p = partsIn(ms, "UTC");
	const base = `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
	return scale > 0 ? `${base}.${fraction(ms, scale)}Z` : `${base}Z`;
};
const fraction = (ms, scale) => {
	const subsecond = ms - Math.floor(ms / 1e3) * 1e3;
	const digits = Math.round(subsecond * 10 ** (scale - 3));
	return String(Math.min(digits, 10 ** scale - 1)).padStart(scale, "0");
};
//#endregion
//#region src/memory/types.ts
const SIMPLE = [
	"Int8",
	"Int16",
	"Int32",
	"Int64",
	"Int128",
	"Int256",
	"UInt8",
	"UInt16",
	"UInt32",
	"UInt64",
	"UInt128",
	"UInt256",
	"Float32",
	"Float64",
	"BFloat16",
	"String",
	"Bool",
	"UUID",
	"Date",
	"Date32",
	"IPv4",
	"IPv6",
	"JSON",
	"Dynamic",
	"Nothing"
];
const ALIASES = {
	INT: "Int32",
	INTEGER: "Int32",
	INT1: "Int8",
	TINYINT: "Int8",
	BYTE: "Int8",
	SMALLINT: "Int16",
	INT2: "Int16",
	INT4: "Int32",
	MEDIUMINT: "Int32",
	BIGINT: "Int64",
	INT8: "Int64",
	SIGNED: "Int64",
	UNSIGNED: "UInt64",
	FLOAT: "Float32",
	REAL: "Float32",
	SINGLE: "Float32",
	DOUBLE: "Float64",
	TEXT: "String",
	VARCHAR: "String",
	CHAR: "String",
	NCHAR: "String",
	NVARCHAR: "String",
	CLOB: "String",
	BLOB: "String",
	BYTEA: "String",
	LONGTEXT: "String",
	MEDIUMTEXT: "String",
	TINYTEXT: "String",
	BINARY: "FixedString",
	BOOLEAN: "Bool",
	BOOL: "Bool",
	TIMESTAMP: "DateTime",
	DATETIME: "DateTime",
	DATE: "Date",
	UUID: "UUID",
	STRING: "String",
	DEC: "Decimal",
	DECIMAL: "Decimal",
	NUMERIC: "Decimal",
	FIXED: "Decimal",
	JSON: "JSON"
};
const INTEGER_BITS = {
	Int8: 8,
	Int16: 16,
	Int32: 32,
	Int64: 64,
	Int128: 128,
	Int256: 256,
	UInt8: 8,
	UInt16: 16,
	UInt32: 32,
	UInt64: 64,
	UInt128: 128,
	UInt256: 256
};
const isIntegerType = (type) => type.name in INTEGER_BITS;
const isFloatType = (type) => type.name === "Float32" || type.name === "Float64" || type.name === "BFloat16";
const integerBits = (type) => INTEGER_BITS[type.name] ?? 0;
const isUnsigned = (type) => type.name.startsWith("UInt");
const unwrap = (type) => {
	return type.name === "Nullable" || type.name === "LowCardinality" ? unwrap(type.inner) : type;
};
const isNullable = (type) => {
	if (type.name === "Nullable") return true;
	if (type.name === "LowCardinality") return isNullable(type.inner);
	return type.name === "Nothing";
};
var TypeReader = class {
	tokens;
	text;
	pos = 0;
	constructor(tokens, text) {
		this.tokens = tokens;
		this.text = text;
	}
	peek() {
		return this.tokens[this.pos];
	}
	next() {
		return this.tokens[this.pos++];
	}
	isOp(value) {
		const token = this.peek();
		return token.kind === "op" && token.value === value;
	}
	expectOp(value) {
		if (!this.isOp(value)) this.fail();
		this.pos++;
	}
	fail() {
		throw unknownType(`Unknown data type family: ${this.text}`);
	}
	done() {
		return this.peek().kind === "eof";
	}
	type() {
		const token = this.next();
		if (token.kind !== "ident") this.fail();
		let name = token.value;
		const alias = ALIASES[name.toUpperCase()];
		if (!SIMPLE.includes(name) && ![
			"Nullable",
			"LowCardinality",
			"Array",
			"Map",
			"Tuple",
			"Nested",
			"Enum8",
			"Enum16",
			"Enum",
			"DateTime",
			"DateTime64",
			"Decimal",
			"Decimal32",
			"Decimal64",
			"Decimal128",
			"Decimal256",
			"FixedString",
			"Object",
			"Variant"
		].includes(name)) {
			if (!alias) throw unknownType(`Unknown data type family: ${name}`);
			name = alias;
		}
		while (this.peek().kind === "ident" && [
			"PRECISION",
			"VARYING",
			"UNSIGNED",
			"SIGNED"
		].includes(this.peek().value.toUpperCase())) if (this.next().value.toUpperCase() === "UNSIGNED" && name.startsWith("Int")) name = `U${name}`;
		const args = this.isOp("(") ? this.args() : [];
		switch (name) {
			case "Nullable":
			case "LowCardinality":
			case "Array": return {
				name,
				inner: this.single(args)
			};
			case "Map": {
				const [key, value] = args;
				if (!key || !value || key.kind !== "type" || value.kind !== "type") this.fail();
				return {
					name,
					key: key.type,
					value: value.type
				};
			}
			case "Tuple":
			case "Nested": {
				const items = args.map((arg) => arg.kind === "type" ? arg.type : this.fail());
				const names = args.map((arg) => arg.kind === "type" ? arg.name : void 0);
				const tuple = {
					name: "Tuple",
					items
				};
				if (names.every((name) => name !== void 0)) tuple.names = names;
				return name === "Nested" ? {
					name: "Array",
					inner: tuple
				} : tuple;
			}
			case "Enum":
			case "Enum8":
			case "Enum16": {
				let next = 1;
				const values = args.map((arg) => {
					if (arg.kind !== "enum") this.fail();
					const value = arg.value ?? next;
					next = value + 1;
					return [arg.name, value];
				});
				return {
					name: name === "Enum16" || name === "Enum" && values.some(([, value]) => value > 127 || value < -128) ? "Enum16" : "Enum8",
					values
				};
			}
			case "DateTime": {
				const timeZone = args[0]?.kind === "string" ? args[0].value : void 0;
				if (timeZone && !isTimeZone(timeZone)) throw unknownType(`Invalid time zone: ${timeZone}`);
				return timeZone ? {
					name,
					timeZone
				} : { name };
			}
			case "DateTime64": {
				const scale = args[0]?.kind === "number" ? args[0].value : 3;
				const timeZone = args[1]?.kind === "string" ? args[1].value : void 0;
				if (timeZone && !isTimeZone(timeZone)) throw unknownType(`Invalid time zone: ${timeZone}`);
				return timeZone ? {
					name,
					scale,
					timeZone
				} : {
					name,
					scale
				};
			}
			case "Decimal": {
				const precision = args[0]?.kind === "number" ? args[0].value : 10;
				const scale = args[1]?.kind === "number" ? args[1].value : 0;
				return {
					name,
					precision,
					scale
				};
			}
			case "Decimal32":
			case "Decimal64":
			case "Decimal128":
			case "Decimal256": return {
				name: "Decimal",
				precision: {
					Decimal32: 9,
					Decimal64: 18,
					Decimal128: 38,
					Decimal256: 76
				}[name],
				scale: args[0]?.kind === "number" ? args[0].value : 0
			};
			case "FixedString": {
				const length = args[0]?.kind === "number" ? args[0].value : 1;
				return {
					name,
					length
				};
			}
			case "Object": return { name: "JSON" };
			case "Variant": return { name: "Dynamic" };
			case "JSON": return { name: "JSON" };
			default: return { name };
		}
	}
	single(args) {
		const [arg] = args;
		if (!arg || arg.kind !== "type" || args.length !== 1) this.fail();
		return arg.type;
	}
	args() {
		this.expectOp("(");
		const args = [];
		if (this.isOp(")")) {
			this.next();
			return args;
		}
		do
			args.push(this.arg());
		while (this.isOp(",") && this.next());
		this.expectOp(")");
		return args;
	}
	arg() {
		const token = this.peek();
		if (token.kind === "string") {
			this.next();
			if (this.isOp("=")) {
				this.next();
				const negative = this.isOp("-") && this.next();
				const number = this.next();
				if (number.kind !== "number") this.fail();
				return {
					kind: "enum",
					name: token.value,
					value: Number(number.value) * (negative ? -1 : 1)
				};
			}
			return {
				kind: "string",
				value: token.value
			};
		}
		if (token.kind === "number") {
			this.next();
			return {
				kind: "number",
				value: Number(token.value)
			};
		}
		if (token.kind === "ident") {
			if (this.tokens[this.pos + 1]?.kind === "ident") {
				this.next();
				return {
					kind: "type",
					name: token.value,
					type: this.type()
				};
			}
		}
		return {
			kind: "type",
			type: this.type()
		};
	}
};
const typeCache = /* @__PURE__ */ new Map();
const parseType = (text) => {
	let type = typeCache.get(text);
	if (!type) {
		const reader = new TypeReader(tokenize(text), text);
		type = reader.type();
		if (!reader.done()) reader.fail();
		typeCache.set(text, type);
	}
	return type;
};
const quote = (value) => `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
const formatType = (type) => {
	switch (type.name) {
		case "Nullable":
		case "LowCardinality":
		case "Array": return `${type.name}(${formatType(type.inner)})`;
		case "Map": return `Map(${formatType(type.key)}, ${formatType(type.value)})`;
		case "Tuple": return `Tuple(${type.items.map((item, index) => type.names ? `${type.names[index]} ${formatType(item)}` : formatType(item)).join(", ")})`;
		case "Enum8":
		case "Enum16": return `${type.name}(${type.values.map(([name, value]) => `${quote(name)} = ${value}`).join(", ")})`;
		case "DateTime": return type.timeZone ? `DateTime(${quote(type.timeZone)})` : "DateTime";
		case "DateTime64": return type.timeZone ? `DateTime64(${type.scale}, ${quote(type.timeZone)})` : `DateTime64(${type.scale})`;
		case "Decimal": return `Decimal(${type.precision}, ${type.scale})`;
		case "FixedString": return `FixedString(${type.length})`;
		case "Interval": return `Interval${type.unit}`;
		default: return type.name;
	}
};
const defaultValue = (type) => {
	switch (type.name) {
		case "Nullable":
		case "Nothing": return null;
		case "LowCardinality": return defaultValue(type.inner);
		case "Array": return [];
		case "Map": return /* @__PURE__ */ new Map();
		case "Tuple": return new TupleValue(type.items.map(defaultValue), type.names);
		case "Enum8":
		case "Enum16": return type.values.find(([, value]) => value === 0)?.[0] ?? type.values[0]?.[0] ?? "";
		case "DateTime": return new DateTimeValue(0, 0, type.timeZone);
		case "DateTime64": return new DateTimeValue(0, type.scale, type.timeZone);
		case "Date": return new DateValue(0);
		case "Date32": return new DateValue(0, true);
		case "String":
		case "FixedString": return "";
		case "UUID": return "00000000-0000-0000-0000-000000000000";
		case "IPv4": return "0.0.0.0";
		case "IPv6": return "::";
		case "Bool": return false;
		case "JSON":
		case "Dynamic": return {};
		default: return 0;
	}
};
const zoneOffset = (zone) => {
	if (!/^[+-]/.test(zone)) return 0;
	const sign = zone.startsWith("-") ? -1 : 1;
	const digits = zone.slice(1).replace(":", "");
	return sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4) || 0)) * 6e4;
};
const DATE_TIME = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d+))?)?)?\s*(Z|UTC|GMT|[+-]\d{2}(?::?\d{2})?)?$/i;
const parseDateTime = (text, timeZone = "UTC") => {
	const trimmed = text.trim();
	if (/^\d{9,10}(\.\d+)?$/.test(trimmed)) return Number(trimmed) * 1e3;
	if (/^\d{12,13}$/.test(trimmed)) return Number(trimmed);
	const match = DATE_TIME.exec(trimmed);
	if (match) {
		const [, year, month, day, hour = "0", minute = "0", second = "0", fraction = "", zone] = match;
		const millis = fraction ? Number(`0.${fraction}`) * 1e3 : 0;
		if (zone) return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)) - zoneOffset(zone) + millis;
		return fromParts(Number(year), Number(month), Number(day), Number(hour), Number(minute), Number(second), timeZone) + millis;
	}
	const parsed = Date.parse(trimmed);
	if (!Number.isNaN(parsed)) return parsed;
	throw cannotParseDateTime(`Cannot read DateTime: unexpected value "${text}"`);
};
const parseDate = (text) => {
	const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text.trim());
	if (!match) {
		if (/^\d+$/.test(text.trim())) return Number(text.trim());
		throw cannotParseText(`Cannot parse date: value "${text}" is not a date`);
	}
	return partsToDay(Number(match[1]), Number(match[2]), Number(match[3]));
};
const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const toUuid = (text) => {
	if (!UUID.test(text)) throw cannotParseUuid(`Cannot parse uuid ${text}`);
	const hex = text.replaceAll("-", "").toLowerCase();
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const parseInteger = (text, type) => {
	const trimmed = text.trim();
	if (!/^[+-]?\d+(\.\d*)?([eE][+-]?\d+)?$/.test(trimmed)) throw cannotParseNumber(`Cannot parse ${formatType(type)} from String "${text}"`);
	if (/^[+-]?\d+$/.test(trimmed)) return wrapInteger(BigInt(trimmed), type);
	return wrapInteger(BigInt(Math.trunc(Number(trimmed))), type);
};
const wrapInteger = (value, type) => {
	const bits = integerBits(type);
	if (!bits) return typeof value === "bigint" ? normalizeNumber(value) : value;
	const big = typeof value === "bigint" ? value : BigInt(Math.trunc(value));
	const wrapped = isUnsigned(type) ? BigInt.asUintN(bits, big) : BigInt.asIntN(bits, big);
	return normalizeNumber(wrapped);
};
const toBool = (value) => {
	if (typeof value === "boolean") return value;
	if (isNumeric(value)) return Number(value) !== 0;
	if (typeof value === "string") {
		const lower = value.trim().toLowerCase();
		if ([
			"true",
			"1",
			"yes",
			"on",
			"t",
			"y",
			"enable",
			"enabled"
		].includes(lower)) return true;
		if ([
			"false",
			"0",
			"no",
			"off",
			"f",
			"n",
			"disable",
			"disabled"
		].includes(lower)) return false;
	}
	throw cannotParseText(`Cannot parse boolean value here: '${String(value)}'`);
};
const quantize = (ms, scale) => {
	if (scale >= 3) {
		const factor = 10 ** (scale - 3);
		return Math.floor(ms * factor) / factor;
	}
	const unit = 10 ** (3 - scale);
	return Math.floor(ms / unit) * unit;
};
const castValue = (value, type, nullable = false) => {
	if (value === null) {
		if (isNullable(type) || nullable) return null;
		throw cannotParseText(`Cannot convert NULL value to non-Nullable type ${formatType(type)}`);
	}
	switch (type.name) {
		case "Nullable": return castValue(value, type.inner, true);
		case "LowCardinality": return castValue(value, type.inner, nullable);
		case "String":
		case "FixedString": return stringOf(value);
		case "UUID": return toUuid(stringOf(value));
		case "IPv4":
		case "IPv6": return stringOf(value);
		case "Bool": return toBool(value);
		case "Date":
		case "Date32":
			if (value instanceof DateValue) return new DateValue(value.days, type.name === "Date32");
			if (value instanceof DateTimeValue) return new DateValue(dayNumberIn(value.ms, value.timeZone ?? "UTC"), type.name === "Date32");
			if (typeof value === "string") return new DateValue(parseDate(value), type.name === "Date32");
			return new DateValue(Math.trunc(toNumber(value)), type.name === "Date32");
		case "DateTime":
		case "DateTime64": {
			const scale = type.name === "DateTime64" ? type.scale : 0;
			let ms;
			if (value instanceof DateTimeValue) ms = value.ms;
			else if (value instanceof DateValue) ms = fromParts(1970, 1, 1 + value.days, 0, 0, 0, type.timeZone ?? "UTC");
			else if (typeof value === "string") ms = parseDateTime(value, type.timeZone);
			else ms = toNumber(value) * 1e3;
			return new DateTimeValue(quantize(ms, scale), scale, type.timeZone);
		}
		case "Array":
			if (!Array.isArray(value)) {
				if (typeof value === "string") return castValue(parseLiteralText(value), type);
				throw cannotParseText(`Cannot convert ${stringOf(value)} to ${formatType(type)}`);
			}
			return value.map((item) => castValue(item, type.inner));
		case "Tuple": {
			const items = value instanceof TupleValue ? value.items : Array.isArray(value) ? value : null;
			if (!items) throw cannotParseText(`Cannot convert ${stringOf(value)} to ${formatType(type)}`);
			return new TupleValue(type.items.map((item, index) => castValue(items[index] ?? null, item)), type.names);
		}
		case "Map": {
			const entries = value instanceof Map ? [...value.entries()] : typeof value === "object" ? Object.entries(value) : null;
			if (!entries) throw cannotParseText(`Cannot convert ${stringOf(value)} to ${formatType(type)}`);
			return new Map(entries.map(([key, item]) => [castValue(key, type.key), castValue(item, type.value)]));
		}
		case "Enum8":
		case "Enum16": {
			if (isNumeric(value)) {
				const found = type.values.find(([, number]) => number === Number(value));
				if (!found) throw unknownElementOfEnum(`Unexpected value ${value} in enum`);
				return found[0];
			}
			const name = stringOf(value);
			if (!type.values.some(([member]) => member === name)) throw unknownElementOfEnum(`Unknown element '${name}' for enum`);
			return name;
		}
		case "JSON":
		case "Dynamic":
			if (typeof value === "string") try {
				return JSON.parse(value);
			} catch {
				throw cannotParseText(`Cannot parse JSON object here: ${value}`);
			}
			return value;
		case "Float32":
		case "Float64":
		case "BFloat16":
		case "Decimal": {
			if (typeof value === "string") {
				const trimmed = value.trim().toLowerCase();
				if (trimmed === "inf" || trimmed === "+inf") return Infinity;
				if (trimmed === "-inf") return -Infinity;
				if (trimmed === "nan") return NaN;
				const number = Number(trimmed);
				if (trimmed === "" || Number.isNaN(number)) throw cannotParseNumber(`Cannot parse ${formatType(type)} from String "${value}"`);
				return type.name === "Float32" ? Math.fround(number) : number;
			}
			const number = toNumber(value);
			return type.name === "Float32" ? Math.fround(number) : number;
		}
		case "Interval": return toNumber(value);
		case "Nothing": return null;
		default:
			if (isIntegerType(type)) {
				if (typeof value === "string") return parseInteger(value, type);
				if (typeof value === "bigint") return wrapInteger(value, type);
				if (value instanceof DateTimeValue) return wrapInteger(Math.floor(value.ms / 1e3), type);
				return wrapInteger(Math.trunc(toNumber(value)), type);
			}
			return value;
	}
};
const stringOf = (value) => {
	if (typeof value === "string") return value;
	if (value === null) return "NULL";
	if (typeof value === "boolean") return value ? "true" : "false";
	if (typeof value === "number") return formatNumber(value);
	if (typeof value === "bigint") return value.toString();
	if (value instanceof DateTimeValue || value instanceof DateValue) return textValue(value);
	if (Array.isArray(value) || value instanceof TupleValue || value instanceof Map) return textValue(value);
	return JSON.stringify(value);
};
const formatNumber = (value) => {
	if (Number.isNaN(value)) return "nan";
	if (value === Infinity) return "inf";
	if (value === -Infinity) return "-inf";
	if (Object.is(value, -0)) return "-0";
	return String(value);
};
const textValue = (value, nested = false) => {
	if (value === null) return nested ? "NULL" : "\\N";
	if (typeof value === "string") return nested ? quote(value) : value;
	if (typeof value === "number") return formatNumber(value);
	if (typeof value === "bigint") return value.toString();
	if (typeof value === "boolean") return value ? "true" : "false";
	if (value instanceof DateTimeValue) {
		const text = formatDateTimeValue(value);
		return nested ? quote(text) : text;
	}
	if (value instanceof DateValue) {
		const text = formatDateValue(value);
		return nested ? quote(text) : text;
	}
	if (Array.isArray(value)) return `[${value.map((item) => textValue(item, true)).join(",")}]`;
	if (value instanceof TupleValue) return `(${value.items.map((item) => textValue(item, true)).join(",")})`;
	if (value instanceof Map) return `{${[...value.entries()].map(([key, item]) => `${textValue(key, true)}:${textValue(item, true)}`).join(",")}}`;
	return JSON.stringify(value);
};
const formatDateTimeValue = (value, serverTimeZone = "UTC") => {
	return formatDateTime(value.ms, value.timeZone ?? serverTimeZone, value.scale);
};
const formatDateValue = (value) => formatDay(value.days);
const parseLiteralText = (text) => {
	const tokens = tokenize(text);
	let pos = 0;
	const fail = () => {
		throw badQueryParameter(`Value ${text} cannot be parsed as a literal`);
	};
	const peek = () => tokens[pos];
	const isOp = (value) => {
		const token = peek();
		return token.kind === "op" && token.value === value;
	};
	const read = () => {
		const token = tokens[pos++];
		if (token.kind === "string") return token.value;
		if (token.kind === "number") return /[.eE]/.test(token.value) ? Number(token.value) : normalizeNumber(BigInt(token.value));
		if (token.kind === "op" && token.value === "-") {
			const number = read();
			return typeof number === "bigint" ? -number : -number;
		}
		if (token.kind === "ident") {
			const upper = token.value.toUpperCase();
			if (upper === "NULL") return null;
			if (upper === "TRUE") return true;
			if (upper === "FALSE") return false;
			if (upper === "INF") return Infinity;
			if (upper === "NAN") return NaN;
			fail();
		}
		if (token.kind === "op" && (token.value === "[" || token.value === "(" || token.value === "{")) {
			const close = token.value === "[" ? "]" : token.value === "(" ? ")" : "}";
			const items = [];
			const entries = [];
			if (isOp(close)) {
				pos++;
				return close === "]" ? items : close === ")" ? new TupleValue(items) : /* @__PURE__ */ new Map();
			}
			do {
				const item = read();
				if (close === "}") {
					if (!isOp(":")) fail();
					pos++;
					entries.push([item, read()]);
				} else items.push(item);
			} while (isOp(",") && pos++);
			if (!isOp(close)) fail();
			pos++;
			return close === "]" ? items : close === ")" ? new TupleValue(items) : new Map(entries);
		}
		return fail();
	};
	const value = read();
	if (peek().kind !== "eof") fail();
	return value;
};
const parseParam = (text, type) => {
	if (text === "\\N" && isNullable(type)) return null;
	const base = unwrap(type);
	switch (base.name) {
		case "String":
		case "FixedString": return unescape(text);
		case "Array":
		case "Tuple":
		case "Map": return castValue(parseLiteralText(text), base);
		case "DateTime":
		case "DateTime64":
		case "Date":
		case "Date32":
		case "Enum8":
		case "Enum16":
		case "UUID":
		case "Bool": return castValue(unescape(text), base);
		default: return castValue(text, base);
	}
};
const unescape = (text) => {
	return text.replace(/\\(x[0-9a-fA-F]{2}|.)/g, (_, char) => {
		if (char.length === 3) return String.fromCharCode(parseInt(char.slice(1), 16));
		return {
			n: "\n",
			t: "	",
			r: "\r",
			b: "\b",
			f: "\f",
			"0": "\0",
			a: "\x07",
			v: "\v",
			e: "\x1B"
		}[char] ?? char;
	});
};
const fromJson = (value, type) => {
	if (value === null || value === void 0) return isNullable(type) ? null : defaultValue(type);
	const base = type.name === "Nullable" || type.name === "LowCardinality" ? unwrap(type) : type;
	switch (base.name) {
		case "Array":
			if (!Array.isArray(value)) throw cannotParseText(`Cannot parse input: expected '[' before: ${JSON.stringify(value)}`);
			return value.map((item) => fromJson(item, base.inner));
		case "Tuple": {
			const items = Array.isArray(value) ? value : base.names ? base.names.map((name) => value[name]) : null;
			if (!items) throw cannotParseText(`Cannot parse tuple from ${JSON.stringify(value)}`);
			return new TupleValue(base.items.map((item, index) => fromJson(items[index], item)), base.names);
		}
		case "Map":
			if (typeof value !== "object" || Array.isArray(value)) throw cannotParseText(`Cannot parse map from ${JSON.stringify(value)}`);
			return new Map(Object.entries(value).map(([key, item]) => [castValue(key, base.key), fromJson(item, base.value)]));
		case "JSON":
		case "Dynamic": return typeof value === "string" ? castValue(value, base) : structuredClone(value);
		case "String":
		case "FixedString": return typeof value === "object" ? JSON.stringify(value) : String(value);
		default:
			if (typeof value === "object") throw cannotParseText(`Cannot parse ${formatType(base)} from ${JSON.stringify(value)}`);
			return castValue(value, base);
	}
};
//#endregion
//#region src/memory/naming.ts
const quoteString$1 = (value) => {
	return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll("\n", "\\n").replaceAll("	", "\\t").replaceAll("\r", "\\r").replaceAll("\0", "\\0")}'`;
};
const quoteIdentifier = (name) => {
	return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) ? name : `\`${name.replaceAll("\\", "\\\\").replaceAll("`", "\\`")}\``;
};
const literalText$1 = (value) => {
	if (value === null) return "NULL";
	if (typeof value === "string") return quoteString$1(value);
	if (typeof value === "boolean") return value ? "true" : "false";
	if (typeof value === "number") return Number.isInteger(value) ? formatNumber(value) : formatFloatLiteral(value);
	if (typeof value === "bigint") return value.toString();
	if (Array.isArray(value)) return `[${value.map(literalText$1).join(", ")}]`;
	if (value instanceof TupleValue) return `(${value.items.map(literalText$1).join(", ")})`;
	if (value instanceof DateTimeValue || value instanceof DateValue) return String(value);
	return JSON.stringify(value);
};
const literal = (expr) => expr.text ?? literalText$1(expr.value);
const columnName = (expr) => {
	switch (expr.kind) {
		case "literal": return literal(expr);
		case "identifier": return expr.parts.join(".");
		case "param": return `_CAST(${quoteString$1(expr.name)}, ${quoteString$1(expr.type)})`;
		case "asterisk": return expr.table ? `${expr.table}.*` : "*";
		case "lambda": return `lambda(tuple(${expr.params.join(", ")}), ${columnName(expr.body)})`;
		case "subquery": return `(${querySql(expr.query)})`;
		case "function": {
			const name = expr.distinct ? `${expr.name}Distinct` : expr.name;
			const args = expr.args.map((arg) => arg.alias ? arg.alias : columnName(arg)).join(", ");
			if (name === "array") return `[${args}]`;
			if (name === "tuple" && expr.args.length > 1) return `(${args})`;
			return `${name}${expr.params ? `(${expr.params.map(columnName).join(", ")})` : ""}(${args})`;
		}
	}
};
const INFIX = {
	or: ["OR", 1],
	and: ["AND", 2],
	equals: ["=", 4],
	notEquals: ["!=", 4],
	less: ["<", 4],
	greater: [">", 4],
	lessOrEquals: ["<=", 4],
	greaterOrEquals: [">=", 4],
	like: ["LIKE", 4],
	notLike: ["NOT LIKE", 4],
	ilike: ["ILIKE", 4],
	notILike: ["NOT ILIKE", 4],
	in: ["IN", 4],
	notIn: ["NOT IN", 4],
	globalIn: ["GLOBAL IN", 4],
	globalNotIn: ["GLOBAL NOT IN", 4],
	plus: ["+", 6],
	minus: ["-", 6],
	multiply: ["*", 7],
	divide: ["/", 7],
	modulo: ["%", 7]
};
const sql = (expr, parent = 0) => {
	const text = (() => {
		switch (expr.kind) {
			case "literal": return literal(expr);
			case "identifier": return expr.parts.map(quoteIdentifier).join(".");
			case "param": return `{${expr.name}:${expr.type}}`;
			case "asterisk": return expr.table ? `${expr.table}.*` : "*";
			case "lambda": return `${expr.params.length === 1 ? expr.params[0] : `(${expr.params.join(", ")})`} -> (${sql(expr.body)})`;
			case "subquery": return `(${querySql(expr.query)})`;
			case "function": {
				const infix = INFIX[expr.name];
				if (infix && expr.args.length >= 2 && !expr.params) {
					const [operator, precedence] = infix;
					const joined = expr.args.map((arg) => sql(arg, precedence + 1)).join(` ${operator} `);
					return precedence < parent ? `(${joined})` : joined;
				}
				if (expr.name === "__ttl") return expr.args.map((arg) => sql(arg)).join(", ");
				if (expr.name === "not" && expr.args.length === 1) return wrap(`NOT ${sql(expr.args[0], 3)}`, 3, parent);
				if (expr.name === "negate" && expr.args.length === 1) return `-${sql(expr.args[0], 9)}`;
				if (expr.name === "isNull") return wrap(`${sql(expr.args[0], 5)} IS NULL`, 4, parent);
				if (expr.name === "isNotNull") return wrap(`${sql(expr.args[0], 5)} IS NOT NULL`, 4, parent);
				if (expr.name === "arrayElement" && expr.args.length === 2) return `${sql(expr.args[0], 10)}[${sql(expr.args[1])}]`;
				if (expr.name === "tupleElement" && expr.args.length === 2 && expr.args[1].kind === "literal" && typeof expr.args[1].value === "number") return `${sql(expr.args[0], 10)}.${expr.args[1].value}`;
				if (expr.name === "concat" && expr.args.length >= 2) return `concat(${expr.args.map((arg) => sql(arg)).join(", ")})`;
				if (expr.name === "array") return `[${expr.args.map((arg) => sql(arg)).join(", ")}]`;
				if (expr.name === "tuple" && expr.args.length > 1) return `(${expr.args.map((arg) => sql(arg)).join(", ")})`;
				const params = expr.params ? `(${expr.params.map((arg) => sql(arg)).join(", ")})` : "";
				const distinct = expr.distinct ? "DISTINCT " : "";
				return `${expr.name}${params}(${distinct}${expr.args.map((arg) => sql(arg)).join(", ")})`;
			}
		}
	})();
	return expr.alias ? `${text} AS ${quoteIdentifier(expr.alias)}` : text;
};
const wrap = (text, precedence, parent) => precedence < parent ? `(${text})` : text;
const selectSql = (select) => {
	const parts = [`SELECT ${select.distinct ? "DISTINCT " : ""}${select.columns.map((column) => sql(column)).join(", ")}`];
	if (select.from) {
		const from = select.from;
		const source = from.kind === "table" ? [from.database, from.name].filter(Boolean).map((name) => quoteIdentifier(name)).join(".") : from.kind === "subquery" ? `(${querySql(from.query)})` : `${from.name}(${from.args.map((arg) => sql(arg)).join(", ")})`;
		parts.push(`FROM ${source}${from.alias ? ` AS ${from.alias}` : ""}`);
	}
	if (select.where) parts.push(`WHERE ${sql(select.where)}`);
	if (select.groupBy.length > 0) parts.push(`GROUP BY ${select.groupBy.map((expr) => sql(expr)).join(", ")}`);
	if (select.having) parts.push(`HAVING ${sql(select.having)}`);
	if (select.orderBy.length > 0) parts.push(`ORDER BY ${select.orderBy.map((item) => `${sql(item.expr)}${item.direction === "DESC" ? " DESC" : " ASC"}`).join(", ")}`);
	if (select.limit !== void 0) parts.push(`LIMIT ${select.limit}`);
	if (select.offset !== void 0) parts.push(`OFFSET ${select.offset}`);
	return parts.join(" ");
};
const querySql = (query) => {
	return query.selects.map(selectSql).reduce((text, select, index) => `${text} UNION ${query.distinct[index - 1] ? "DISTINCT" : "ALL"} ${select}`);
};
//#endregion
//#region src/memory/catalog.ts
const MERGE_TREE$1 = /MergeTree$/;
const toColumn = (def) => {
	if (!def.type && !def.defaultExpr) throw unknownTable(`Column ${def.name} needs a type or a default expression`);
	return {
		name: def.name,
		type: parseType(def.type ?? "String"),
		defaultKind: def.defaultKind,
		defaultExpr: def.defaultExpr,
		codec: def.codec,
		comment: def.comment ?? ""
	};
};
const quoteString = (value) => `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
const formatSettingValue = (value) => typeof value === "string" ? quoteString(value) : typeof value === "boolean" ? value ? "1" : "0" : String(value);
const formatColumn = (column) => {
	return [
		`\`${column.name.replaceAll("`", "\\`")}\``,
		formatType(column.type),
		column.defaultKind && column.defaultExpr ? `${column.defaultKind} ${sql(column.defaultExpr)}` : column.defaultKind === "EPHEMERAL" ? "EPHEMERAL" : "",
		column.codec ? `CODEC(${column.codec})` : "",
		column.comment ? `COMMENT ${quoteString(column.comment)}` : ""
	].filter(Boolean).join(" ");
};
const keyText = (exprs) => exprs.map((expr) => sql(expr)).join(", ");
const orderByText = (exprs) => exprs.length === 0 ? "tuple()" : exprs.length === 1 ? sql(exprs[0]) : `(${keyText(exprs)})`;
const effectiveSettings = (table) => {
	if (!MERGE_TREE$1.test(table.engine.name) || table.settings.some(([key]) => key === "index_granularity")) return table.settings;
	return [["index_granularity", 8192], ...table.settings];
};
const engineText = (table) => {
	const args = table.engine.args.length > 0 ? `(${table.engine.args.map((arg) => sql(arg)).join(", ")})` : "";
	const settings = effectiveSettings(table);
	return [
		`${table.engine.name}${args}`,
		table.partitionBy ? `PARTITION BY ${sql(table.partitionBy)}` : "",
		table.primaryKey ? `PRIMARY KEY ${orderByText(table.primaryKey)}` : "",
		MERGE_TREE$1.test(table.engine.name) ? `ORDER BY ${orderByText(table.orderBy)}` : "",
		table.ttl ? `TTL ${sql(table.ttl)}` : "",
		settings.length > 0 ? `SETTINGS ${settings.map(([key, value]) => `${key} = ${formatSettingValue(value)}`).join(", ")}` : ""
	].filter(Boolean).join(" ");
};
const createTableQuery = (table) => {
	const items = [...table.columns.map(formatColumn), ...table.indexes.map((index) => `INDEX ${quoteIdentifier(index.name)} ${sql(index.expr)} TYPE ${index.type} GRANULARITY ${index.granularity}`)];
	return [`CREATE TABLE ${quoteIdentifier(table.database)}.${quoteIdentifier(table.name)} (${items.join(", ")}) ENGINE = ${engineText(table)}`, table.comment ? `COMMENT ${quoteString(table.comment)}` : ""].filter(Boolean).join(" ");
};
const sortingKey = (table) => keyText(table.orderBy);
const primaryKey = (table) => keyText(table.primaryKey ?? table.orderBy);
const partitionKey = (table) => table.partitionBy ? sql(table.partitionBy) : "";
var Catalog = class {
	databases = /* @__PURE__ */ new Map([["default", /* @__PURE__ */ new Map()]]);
	mutations = [];
	database(name) {
		const database = this.databases.get(name);
		if (!database) throw unknownDatabase(`Database ${name} does not exist`);
		return database;
	}
	find(database, name) {
		return this.databases.get(database)?.get(name);
	}
	get(database, name, scope) {
		const table = this.find(database, name);
		if (!table) {
			if (!this.databases.has(database)) throw unknownDatabase(`Database ${database} does not exist`);
			throw unknownTable(`Unknown table expression identifier '${database === "default" ? name : `${database}.${name}`}' in scope ${scope}`);
		}
		return table;
	}
	add(table, ifNotExists, replace = false) {
		const database = this.database(table.database);
		if (database.has(table.name) && !replace) {
			if (ifNotExists) return false;
			throw tableExists(`Table ${table.database}.${table.name} already exists`);
		}
		database.set(table.name, table);
		return true;
	}
	remove(database, name, ifExists) {
		const tables = this.databases.get(database);
		if (!tables?.has(name)) {
			if (ifExists) return;
			throw unknownTable(`Table ${database}.${name} does not exist`);
		}
		tables.delete(name);
	}
	tables() {
		return [...this.databases.values()].flatMap((tables) => [...tables.values()]);
	}
	clear() {
		this.databases.clear();
		this.databases.set("default", /* @__PURE__ */ new Map());
		this.mutations.length = 0;
	}
};
//#endregion
//#region src/memory/functions.ts
const functions = /* @__PURE__ */ new Map();
const caseInsensitive$1 = /* @__PURE__ */ new Map();
const define$1 = (names, fn, insensitive = false) => {
	for (const name of Array.isArray(names) ? names : [names]) {
		functions.set(name, fn);
		if (insensitive) caseInsensitive$1.set(name.toLowerCase(), name);
	}
};
const findFunction = (name) => {
	return functions.get(name) ?? functions.get(caseInsensitive$1.get(name.toLowerCase()) ?? "");
};
const functionNames = () => [...functions.keys()];
const tzArg = (value, fallback) => {
	if (value === void 0) return fallback;
	const zone = stringOf(value);
	if (!isTimeZone(zone)) throw badArguments(`Invalid time zone: ${zone}`);
	return zone;
};
const zoneOf = (value, ctx, override) => {
	return tzArg(override, value instanceof DateTimeValue ? value.timeZone ?? ctx.serverTimeZone : ctx.serverTimeZone);
};
const msOf = (value, timeZone) => {
	if (value instanceof DateTimeValue) return value.ms;
	if (value instanceof DateValue) return fromParts(1970, 1, 1 + value.days, 0, 0, 0, timeZone);
	if (typeof value === "string") return parseDateTime(value, timeZone);
	if (isNumeric(value)) return toNumber(value) * 1e3;
	throw illegalType(`Illegal type of argument: expected a date or date time, got ${stringOf(value)}`);
};
const integer = (value) => Math.trunc(toNumber(value));
const asArray = (value, name) => {
	if (Array.isArray(value)) return value;
	throw illegalType(`Argument for function ${name} must be an array`);
};
const asString = (value, name) => {
	if (typeof value === "string") return value;
	throw illegalType(`Illegal type of argument of function ${name}, expected String`);
};
const bool = (value) => value ? 1 : 0;
const truthy = (value) => {
	if (value === null) return false;
	if (typeof value === "boolean") return value;
	if (isNumeric(value)) return Number(value) !== 0;
	if (typeof value === "string") return value !== "" && value !== "0";
	return true;
};
const arithmetic = (a, b, op, big) => {
	const x = typeof a === "boolean" ? Number(a) : a;
	const y = typeof b === "boolean" ? Number(b) : b;
	if (!isNumeric(x) || !isNumeric(y)) throw illegalType(`Illegal types ${stringOf(a)} and ${stringOf(b)} of arguments of function`);
	if (typeof x === "bigint" || typeof y === "bigint") {
		if ((typeof x === "bigint" || Number.isInteger(x)) && (typeof y === "bigint" || Number.isInteger(y))) return normalizeNumber(big(BigInt(x), BigInt(y)));
		return op(Number(x), Number(y));
	}
	const result = op(x, y);
	if (Number.isInteger(x) && Number.isInteger(y) && !Number.isSafeInteger(result) && Number.isFinite(result)) return normalizeNumber(big(BigInt(x), BigInt(y)));
	return result;
};
const addMonths = (ms, months, timeZone) => {
	const p = partsIn(ms, timeZone);
	const total = p.year * 12 + (p.month - 1) + months;
	const year = Math.floor(total / 12);
	const month = total % 12 + 1;
	const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
	const subsecond = ms - Math.floor(ms / 1e3) * 1e3;
	return fromParts(year, month, Math.min(p.day, lastDay), p.hour, p.minute, p.second, timeZone) + subsecond;
};
const UNIT_MS = {
	Nanosecond: 1e-6,
	Microsecond: .001,
	Millisecond: 1,
	Second: 1e3,
	Minute: 6e4,
	Hour: 36e5
};
const addInterval = (value, interval, sign, ctx) => {
	const count = interval.count * sign;
	if (value instanceof DateValue) switch (interval.unit) {
		case "Day": return new DateValue(value.days + count, value.wide);
		case "Week": return new DateValue(value.days + count * 7, value.wide);
		case "Month":
		case "Quarter":
		case "Year": {
			const months = count * (interval.unit === "Month" ? 1 : interval.unit === "Quarter" ? 3 : 12);
			return new DateValue(dayNumberIn(addMonths(value.days * 864e5, months, "UTC"), "UTC"), value.wide);
		}
		default: return new DateTimeValue(fromParts(1970, 1, 1 + value.days, 0, 0, 0, ctx.serverTimeZone) + count * UNIT_MS[interval.unit], 0);
	}
	if (value instanceof DateTimeValue) {
		const timeZone = value.timeZone ?? ctx.serverTimeZone;
		const scale = Math.max(value.scale, interval.unit === "Millisecond" ? 3 : interval.unit === "Microsecond" ? 6 : interval.unit === "Nanosecond" ? 9 : 0);
		switch (interval.unit) {
			case "Day":
			case "Week": {
				const days = count * (interval.unit === "Week" ? 7 : 1);
				const p = partsIn(value.ms, timeZone);
				const subsecond = value.ms - Math.floor(value.ms / 1e3) * 1e3;
				return new DateTimeValue(fromParts(p.year, p.month, p.day + days, p.hour, p.minute, p.second, timeZone) + subsecond, value.scale, value.timeZone);
			}
			case "Month":
			case "Quarter":
			case "Year": {
				const months = count * (interval.unit === "Month" ? 1 : interval.unit === "Quarter" ? 3 : 12);
				return new DateTimeValue(addMonths(value.ms, months, timeZone), value.scale, value.timeZone);
			}
			default: return new DateTimeValue(value.ms + count * UNIT_MS[interval.unit], scale, value.timeZone);
		}
	}
	if (typeof value === "string") return addInterval(new DateTimeValue(parseDateTime(value, ctx.serverTimeZone), 0), interval, sign, ctx);
	throw illegalType(`Illegal types of arguments for adding an interval to ${stringOf(value)}`);
};
const startOf = (value, ctx, unit, override, mode = 0) => {
	const timeZone = zoneOf(value, ctx, override);
	const ms = msOf(value, timeZone);
	const p = value instanceof DateValue ? {
		...dayToParts(value.days),
		hour: 0,
		minute: 0,
		second: 0
	} : partsIn(ms, timeZone);
	switch (unit) {
		case "year": return new DateValue(partsToDay(p.year, 1, 1));
		case "quarter": return new DateValue(partsToDay(p.year, Math.floor((p.month - 1) / 3) * 3 + 1, 1));
		case "month": return new DateValue(partsToDay(p.year, p.month, 1));
		case "week": return new DateValue(partsToDay(p.year, p.month, p.day) - (mode % 2 === 1 ? p.weekday - 1 : p.weekday % 7));
		case "day": return new DateTimeValue(fromParts(p.year, p.month, p.day, 0, 0, 0, timeZone), 0, value instanceof DateTimeValue || override !== void 0 ? timeZone : void 0);
	}
};
const startOfTime = (value, ctx, seconds, override) => {
	const timeZone = zoneOf(value, ctx, override);
	const ms = msOf(value, timeZone);
	const offset = offsetMs(ms, timeZone);
	const local = ms + offset;
	const floored = Math.floor(local / (seconds * 1e3)) * seconds * 1e3;
	return new DateTimeValue(floored - offsetMs(floored - offset, timeZone), 0, value instanceof DateTimeValue || override !== void 0 ? timeZone : void 0);
};
const offsetMs = (ms, timeZone) => {
	const p = partsIn(ms, timeZone);
	const whole = Math.floor(ms / 1e3) * 1e3;
	return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - whole;
};
const datePart = (value, ctx, override) => {
	if (value instanceof DateValue && override === void 0) return {
		...dayToParts(value.days),
		hour: 0,
		minute: 0,
		second: 0
	};
	const timeZone = zoneOf(value, ctx, override);
	return partsIn(msOf(value, timeZone), timeZone);
};
const toInterval = (unit) => ({
	call: ([count]) => new IntervalValue(unit, toNumber(count)),
	min: 1,
	max: 1
});
const UNIT_ALIASES = {
	nanosecond: "Nanosecond",
	ns: "Nanosecond",
	microsecond: "Microsecond",
	us: "Microsecond",
	millisecond: "Millisecond",
	ms: "Millisecond",
	second: "Second",
	ss: "Second",
	s: "Second",
	minute: "Minute",
	mi: "Minute",
	n: "Minute",
	hour: "Hour",
	hh: "Hour",
	h: "Hour",
	day: "Day",
	dd: "Day",
	d: "Day",
	week: "Week",
	wk: "Week",
	ww: "Week",
	month: "Month",
	mm: "Month",
	m: "Month",
	quarter: "Quarter",
	qq: "Quarter",
	q: "Quarter",
	year: "Year",
	yyyy: "Year",
	yy: "Year"
};
const unitOf = (value) => {
	const text = stringOf(value).toLowerCase().replace(/s$/, "");
	const unit = UNIT_ALIASES[text] ?? UNIT_ALIASES[stringOf(value).toLowerCase()];
	if (!unit) throw badArguments(`Invalid unit '${stringOf(value)}'`);
	return unit;
};
const dateDiff = (unit, a, b, ctx, override) => {
	const timeZone = tzArg(override, a instanceof DateTimeValue ? a.timeZone ?? ctx.serverTimeZone : ctx.serverTimeZone);
	const x = msOf(a, timeZone);
	const y = msOf(b, timeZone);
	switch (unit) {
		case "Year":
		case "Quarter":
		case "Month": {
			const p = partsIn(x, timeZone);
			const q = partsIn(y, timeZone);
			const months = (q.year - p.year) * 12 + (q.month - p.month);
			return unit === "Month" ? months : unit === "Quarter" ? Math.floor((q.year * 12 + q.month - 1) / 3) - Math.floor((p.year * 12 + p.month - 1) / 3) : q.year - p.year;
		}
		case "Week": return Math.floor((dayNumberIn(y, timeZone) + 3) / 7) - Math.floor((dayNumberIn(x, timeZone) + 3) / 7);
		case "Day": return dayNumberIn(y, timeZone) - dayNumberIn(x, timeZone);
		case "Hour": return Math.floor(y / 36e5) - Math.floor(x / 36e5);
		case "Minute": return Math.floor(y / 6e4) - Math.floor(x / 6e4);
		case "Second": return Math.floor(y / 1e3) - Math.floor(x / 1e3);
		case "Millisecond": return Math.floor(y) - Math.floor(x);
		default: return Math.round((y - x) * 1e3);
	}
};
const FORMAT_CODES = {
	Y: (p) => String(p.year).padStart(4, "0"),
	y: (p) => String(p.year % 100).padStart(2, "0"),
	C: (p) => String(Math.floor(p.year / 100)).padStart(2, "0"),
	m: (p) => String(p.month).padStart(2, "0"),
	d: (p) => String(p.day).padStart(2, "0"),
	e: (p) => String(p.day).padStart(2, " "),
	H: (p) => String(p.hour).padStart(2, "0"),
	k: (p) => String(p.hour).padStart(2, " "),
	I: (p) => String((p.hour + 11) % 12 + 1).padStart(2, "0"),
	l: (p) => String((p.hour + 11) % 12 + 1).padStart(2, "0"),
	i: (p) => String(p.minute).padStart(2, "0"),
	M: (p) => [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December"
	][p.month - 1],
	b: (p) => [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec"
	][p.month - 1],
	h: (p) => FORMAT_CODES.I(p, 0),
	S: (p) => String(p.second).padStart(2, "0"),
	s: (p) => String(p.second).padStart(2, "0"),
	f: (_, ms) => String(Math.floor(ms - Math.floor(ms / 1e3) * 1e3) * 1e3).padStart(6, "0"),
	p: (p) => p.hour < 12 ? "AM" : "PM",
	u: (p) => String(p.weekday),
	w: (p) => String(p.weekday % 7),
	a: (p) => [
		"Mon",
		"Tue",
		"Wed",
		"Thu",
		"Fri",
		"Sat",
		"Sun"
	][p.weekday - 1],
	W: (p) => [
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
		"Sunday"
	][p.weekday - 1],
	j: (p) => String(dayOfYear(p)).padStart(3, "0"),
	F: (p) => `${FORMAT_CODES.Y(p, 0)}-${FORMAT_CODES.m(p, 0)}-${FORMAT_CODES.d(p, 0)}`,
	D: (p) => `${FORMAT_CODES.m(p, 0)}/${FORMAT_CODES.d(p, 0)}/${FORMAT_CODES.y(p, 0)}`,
	T: (p) => `${FORMAT_CODES.H(p, 0)}:${FORMAT_CODES.i(p, 0)}:${FORMAT_CODES.S(p, 0)}`,
	R: (p) => `${FORMAT_CODES.H(p, 0)}:${FORMAT_CODES.i(p, 0)}`,
	n: () => "\n",
	t: () => "	",
	"%": () => "%"
};
const dayOfYear = (p) => partsToDay(p.year, p.month, p.day) - partsToDay(p.year, 1, 1) + 1;
define$1("plus", {
	call: ([a, b], ctx) => {
		if (b instanceof IntervalValue) return addInterval(a, b, 1, ctx);
		if (a instanceof IntervalValue) return addInterval(b, a, 1, ctx);
		if (a instanceof DateValue && isNumeric(b)) return new DateValue(a.days + integer(b), a.wide);
		if (a instanceof DateTimeValue && isNumeric(b)) return new DateTimeValue(a.ms + toNumber(b) * 1e3, a.scale, a.timeZone);
		if (isNumeric(a) && b instanceof DateValue) return new DateValue(b.days + integer(a), b.wide);
		if (isNumeric(a) && b instanceof DateTimeValue) return new DateTimeValue(b.ms + toNumber(a) * 1e3, b.scale, b.timeZone);
		return arithmetic(a, b, (x, y) => x + y, (x, y) => x + y);
	},
	min: 2,
	max: 2
});
define$1("minus", {
	call: ([a, b], ctx) => {
		if (b instanceof IntervalValue) return addInterval(a, b, -1, ctx);
		if (a instanceof DateValue && b instanceof DateValue) return a.days - b.days;
		if (a instanceof DateTimeValue && b instanceof DateTimeValue) return Math.round((a.ms - b.ms) / 1e3);
		if (a instanceof DateValue && isNumeric(b)) return new DateValue(a.days - integer(b), a.wide);
		if (a instanceof DateTimeValue && isNumeric(b)) return new DateTimeValue(a.ms - toNumber(b) * 1e3, a.scale, a.timeZone);
		return arithmetic(a, b, (x, y) => x - y, (x, y) => x - y);
	},
	min: 2,
	max: 2
});
define$1("multiply", {
	call: ([a, b]) => b instanceof IntervalValue ? new IntervalValue(b.unit, b.count * toNumber(a)) : a instanceof IntervalValue ? new IntervalValue(a.unit, a.count * toNumber(b)) : arithmetic(a, b, (x, y) => x * y, (x, y) => x * y),
	min: 2,
	max: 2
});
define$1("divide", {
	call: ([a, b]) => toNumber(a) / toNumber(b),
	min: 2,
	max: 2
});
define$1("intDiv", {
	call: ([a, b]) => {
		if (toNumber(b) === 0) throw illegalDivision("Division by zero");
		return arithmetic(a, b, (x, y) => Math.trunc(x / y), (x, y) => x / y);
	},
	min: 2,
	max: 2
});
define$1("intDivOrZero", {
	call: ([a, b]) => toNumber(b) === 0 ? 0 : arithmetic(a, b, (x, y) => Math.trunc(x / y), (x, y) => x / y),
	min: 2,
	max: 2
});
define$1(["modulo", "mod"], {
	call: ([a, b]) => {
		if ((Number.isInteger(toNumber(a)) || typeof a === "bigint") && toNumber(b) === 0) throw illegalDivision("Division by zero");
		return arithmetic(a, b, (x, y) => x % y, (x, y) => x % y);
	},
	min: 2,
	max: 2
}, true);
define$1("moduloOrZero", {
	call: ([a, b]) => toNumber(b) === 0 ? 0 : arithmetic(a, b, (x, y) => x % y, (x, y) => x % y),
	min: 2,
	max: 2
});
define$1("positiveModulo", {
	call: ([a, b]) => {
		const m = toNumber(b);
		return (toNumber(a) % m + m) % m;
	},
	min: 2,
	max: 2
});
define$1("negate", {
	call: ([a]) => a instanceof IntervalValue ? new IntervalValue(a.unit, -a.count) : typeof a === "bigint" ? normalizeNumber(-a) : -toNumber(a),
	min: 1,
	max: 1
});
define$1("abs", {
	call: ([a]) => typeof a === "bigint" ? a < 0n ? -a : a : Math.abs(toNumber(a)),
	min: 1,
	max: 1
}, true);
define$1("sign", {
	call: ([a]) => Math.sign(toNumber(a)),
	min: 1,
	max: 1
}, true);
define$1(["sqrt"], {
	call: ([a]) => Math.sqrt(toNumber(a)),
	min: 1,
	max: 1
}, true);
define$1(["cbrt"], {
	call: ([a]) => Math.cbrt(toNumber(a)),
	min: 1,
	max: 1
});
define$1(["exp"], {
	call: ([a]) => Math.exp(toNumber(a)),
	min: 1,
	max: 1
}, true);
define$1(["log", "ln"], {
	call: ([a]) => Math.log(toNumber(a)),
	min: 1,
	max: 1
}, true);
define$1(["log2"], {
	call: ([a]) => Math.log2(toNumber(a)),
	min: 1,
	max: 1
}, true);
define$1(["log10"], {
	call: ([a]) => Math.log10(toNumber(a)),
	min: 1,
	max: 1
}, true);
define$1(["exp2"], {
	call: ([a]) => 2 ** toNumber(a),
	min: 1,
	max: 1
});
define$1(["exp10"], {
	call: ([a]) => 10 ** toNumber(a),
	min: 1,
	max: 1
});
define$1(["pow", "power"], {
	call: ([a, b]) => toNumber(a) ** toNumber(b),
	min: 2,
	max: 2
}, true);
define$1("pi", {
	call: () => Math.PI,
	min: 0,
	max: 0
}, true);
define$1("e", {
	call: () => Math.E,
	min: 0,
	max: 0
});
define$1([
	"sin",
	"cos",
	"tan",
	"asin",
	"acos",
	"atan"
].join(",").split(","), { call: () => 0 });
for (const name of [
	"sin",
	"cos",
	"tan",
	"asin",
	"acos",
	"atan"
]) define$1(name, {
	call: ([a]) => Math[name](toNumber(a)),
	min: 1,
	max: 1
}, true);
define$1("atan2", {
	call: ([a, b]) => Math.atan2(toNumber(a), toNumber(b)),
	min: 2,
	max: 2
}, true);
const roundTo = (value, digits, mode) => {
	const factor = 10 ** digits;
	return mode(value * factor) / factor;
};
const roundHalfEven = (x) => {
	const floor = Math.floor(x);
	const diff = x - floor;
	if (diff > .5) return floor + 1;
	if (diff < .5) return floor;
	return floor % 2 === 0 ? floor : floor + 1;
};
define$1("round", {
	call: ([a, n]) => typeof a === "bigint" ? a : roundTo(toNumber(a), n === void 0 ? 0 : integer(n), roundHalfEven),
	min: 1,
	max: 2
}, true);
define$1("roundBankers", {
	call: ([a, n]) => roundTo(toNumber(a), n === void 0 ? 0 : integer(n), roundHalfEven),
	min: 1,
	max: 2
});
define$1("floor", {
	call: ([a, n]) => typeof a === "bigint" ? a : roundTo(toNumber(a), n === void 0 ? 0 : integer(n), Math.floor),
	min: 1,
	max: 2
}, true);
define$1(["ceil", "ceiling"], {
	call: ([a, n]) => typeof a === "bigint" ? a : roundTo(toNumber(a), n === void 0 ? 0 : integer(n), Math.ceil),
	min: 1,
	max: 2
}, true);
define$1(["trunc", "truncate"], {
	call: ([a, n]) => typeof a === "bigint" ? a : roundTo(toNumber(a), n === void 0 ? 0 : integer(n), Math.trunc),
	min: 1,
	max: 2
}, true);
define$1("isNaN", {
	call: ([a]) => bool(Number.isNaN(toNumber(a))),
	min: 1,
	max: 1
});
define$1("isFinite", {
	call: ([a]) => bool(Number.isFinite(toNumber(a))),
	min: 1,
	max: 1
});
define$1("isInfinite", {
	call: ([a]) => bool(Math.abs(toNumber(a)) === Infinity),
	min: 1,
	max: 1
});
define$1("gcd", {
	call: ([a, b]) => {
		let x = Math.abs(integer(a));
		let y = Math.abs(integer(b));
		while (y) [x, y] = [y, x % y];
		return x;
	},
	min: 2,
	max: 2
});
define$1("lcm", {
	call: ([a, b]) => {
		const x = Math.abs(integer(a));
		const y = Math.abs(integer(b));
		let g = x;
		let h = y;
		while (h) [g, h] = [h, g % h];
		return g === 0 ? 0 : x / g * y;
	},
	min: 2,
	max: 2
});
define$1("bitAnd", {
	call: ([a, b]) => normalizeNumber(BigInt(integer(a)) & BigInt(integer(b))),
	min: 2,
	max: 2
});
define$1("bitOr", {
	call: ([a, b]) => normalizeNumber(BigInt(integer(a)) | BigInt(integer(b))),
	min: 2,
	max: 2
});
define$1("bitXor", {
	call: ([a, b]) => normalizeNumber(BigInt(integer(a)) ^ BigInt(integer(b))),
	min: 2,
	max: 2
});
define$1("bitNot", {
	call: ([a]) => normalizeNumber(~BigInt(integer(a))),
	min: 1,
	max: 1
});
define$1("bitShiftLeft", {
	call: ([a, b]) => normalizeNumber(BigInt(integer(a)) << BigInt(integer(b))),
	min: 2,
	max: 2
});
define$1("bitShiftRight", {
	call: ([a, b]) => normalizeNumber(BigInt(integer(a)) >> BigInt(integer(b))),
	min: 2,
	max: 2
});
define$1("bitTest", {
	call: ([a, b]) => Number(BigInt(integer(a)) >> BigInt(integer(b)) & 1n),
	min: 2,
	max: 2
});
define$1(["greatest"], {
	call: (args) => {
		if (args.some((arg) => arg === null)) return null;
		return args.reduce((best, arg) => compareValues(arg, best) > 0 ? arg : best);
	},
	handlesNull: true,
	min: 1
}, true);
define$1(["least"], {
	call: (args) => {
		if (args.some((arg) => arg === null)) return null;
		return args.reduce((best, arg) => compareValues(arg, best) < 0 ? arg : best);
	},
	handlesNull: true,
	min: 1
}, true);
const coerceForComparison = (a, b, ctx) => {
	if (a instanceof DateTimeValue && typeof b === "string") return [a, new DateTimeValue(parseDateTime(b, a.timeZone ?? ctx.serverTimeZone), a.scale)];
	if (b instanceof DateTimeValue && typeof a === "string") return [new DateTimeValue(parseDateTime(a, b.timeZone ?? ctx.serverTimeZone), b.scale), b];
	if (a instanceof DateValue && typeof b === "string") return [a, castValue(b, { name: "Date" })];
	if (b instanceof DateValue && typeof a === "string") return [castValue(a, { name: "Date" }), b];
	if (isNumeric(a) && typeof b === "string" && b.trim() !== "" && !Number.isNaN(Number(b))) return [a, Number(b)];
	if (isNumeric(b) && typeof a === "string" && a.trim() !== "" && !Number.isNaN(Number(a))) return [Number(a), b];
	if (typeof a === "boolean" && typeof b === "string") return [a, b === "true" || b === "1"];
	if (typeof b === "boolean" && typeof a === "string") return [a === "true" || a === "1", b];
	return [a, b];
};
const compare = (test) => ({
	call: ([a, b], ctx) => {
		const [x, y] = coerceForComparison(a, b, ctx);
		if (typeof x === "number" && Number.isNaN(x)) return 0;
		if (typeof y === "number" && Number.isNaN(y)) return 0;
		return bool(test(compareValues(x, y)));
	},
	min: 2,
	max: 2
});
define$1("equals", compare((result) => result === 0));
define$1("notEquals", compare((result) => result !== 0));
define$1("less", compare((result) => result < 0));
define$1("greater", compare((result) => result > 0));
define$1("lessOrEquals", compare((result) => result <= 0));
define$1("greaterOrEquals", compare((result) => result >= 0));
define$1("and", {
	call: (args) => {
		let unknown = false;
		for (const arg of args) if (arg === null) unknown = true;
		else if (!truthy(arg)) return 0;
		return unknown ? null : 1;
	},
	handlesNull: true,
	min: 2
});
define$1("or", {
	call: (args) => {
		let unknown = false;
		for (const arg of args) if (arg === null) unknown = true;
		else if (truthy(arg)) return 1;
		return unknown ? null : 0;
	},
	handlesNull: true,
	min: 2
});
define$1("xor", {
	call: (args) => bool(args.filter(truthy).length % 2 === 1),
	min: 2
});
define$1("not", {
	call: ([a]) => bool(!truthy(a)),
	min: 1,
	max: 1
}, true);
define$1("if", {
	call: ([condition, then, otherwise]) => truthy(condition) ? then : otherwise,
	handlesNull: true,
	min: 3,
	max: 3
}, true);
define$1("multiIf", {
	call: (args) => {
		for (let i = 0; i + 1 < args.length; i += 2) if (truthy(args[i])) return args[i + 1];
		return args.at(-1);
	},
	handlesNull: true,
	min: 3
});
define$1("caseWithExpression", {
	call: ([subject, ...rest], ctx) => {
		for (let i = 0; i + 1 < rest.length; i += 2) {
			const [x, y] = coerceForComparison(subject, rest[i], ctx);
			if (subject !== null && rest[i] !== null && compareValues(x, y) === 0) return rest[i + 1];
		}
		return rest.at(-1);
	},
	handlesNull: true,
	min: 3
});
define$1("coalesce", {
	call: (args) => args.find((arg) => arg !== null) ?? null,
	handlesNull: true,
	min: 1
}, true);
define$1("ifNull", {
	call: ([a, b]) => a === null ? b : a,
	handlesNull: true,
	min: 2,
	max: 2
}, true);
define$1("nullIf", {
	call: ([a, b], ctx) => a !== null && b !== null && compareValues(...coerceForComparison(a, b, ctx)) === 0 ? null : a,
	handlesNull: true,
	min: 2,
	max: 2
}, true);
define$1("isNull", {
	call: ([a]) => bool(a === null),
	handlesNull: true,
	min: 1,
	max: 1
}, true);
define$1("isNotNull", {
	call: ([a]) => bool(a !== null),
	handlesNull: true,
	min: 1,
	max: 1
}, true);
define$1("isZeroOrNull", {
	call: ([a]) => bool(a === null || toNumber(a) === 0),
	handlesNull: true,
	min: 1,
	max: 1
});
define$1("assumeNotNull", {
	call: ([a]) => a ?? 0,
	handlesNull: true,
	min: 1,
	max: 1
});
define$1("toNullable", {
	call: ([a]) => a,
	handlesNull: true,
	min: 1,
	max: 1
});
define$1(["materialize", "identity"], {
	call: ([a]) => a,
	handlesNull: true,
	min: 1,
	max: 1
});
define$1("ignore", {
	call: () => 0,
	handlesNull: true
});
define$1("throwIf", {
	call: ([condition, message]) => {
		if (truthy(condition)) throw new class extends Error {}(message === void 0 ? "Value passed to 'throwIf' function is non-zero" : stringOf(message));
		return 0;
	},
	min: 1,
	max: 2
});
const converter = (type, orNull = false, orZero = false) => ({
	call: ([value, ...rest]) => {
		try {
			const extra = type.startsWith("Decimal") ? `(${integer(rest[0] ?? 0)})` : "";
			return castValue(value, parseType(`${type}${extra}`));
		} catch (error) {
			if (orNull) return null;
			if (orZero) return defaultValue(parseType(type.startsWith("Decimal") ? `${type}(0)` : type));
			throw error;
		}
	},
	handlesNull: orNull || orZero,
	min: 1
});
for (const type of [
	"Int8",
	"Int16",
	"Int32",
	"Int64",
	"Int128",
	"Int256",
	"UInt8",
	"UInt16",
	"UInt32",
	"UInt64",
	"UInt128",
	"UInt256",
	"Float32",
	"Float64",
	"Decimal32",
	"Decimal64",
	"Decimal128",
	"Decimal256",
	"UUID",
	"Bool",
	"Date",
	"Date32"
]) {
	define$1(`to${type}`, converter(type));
	define$1(`to${type}OrNull`, converter(type, true));
	define$1(`to${type}OrZero`, converter(type, false, true));
	define$1(`to${type}OrDefault`, converter(type, false, true));
}
define$1("toBoolean", converter("Bool"));
define$1("toString", {
	call: ([value, tz]) => value instanceof DateTimeValue && tz !== void 0 ? formatDateTimeValue(new DateTimeValue(value.ms, value.scale, tzArg(tz))) : stringOf(value),
	min: 1,
	max: 2
});
define$1("toFixedString", {
	call: ([value]) => stringOf(value),
	min: 2,
	max: 2
});
const dateTimeOf = (value, scale, timeZone, ctx) => {
	if (value instanceof DateTimeValue) return new DateTimeValue(quantize(value.ms, scale), scale, timeZone ?? value.timeZone);
	if (value instanceof DateValue) return new DateTimeValue(fromParts(1970, 1, 1 + value.days, 0, 0, 0, timeZone ?? ctx.serverTimeZone), scale, timeZone);
	if (typeof value === "string") return new DateTimeValue(quantize(parseDateTime(value, timeZone ?? ctx.serverTimeZone), scale), scale, timeZone);
	return new DateTimeValue(quantize(toNumber(value) * 1e3, scale), scale, timeZone);
};
define$1("toDateTime", {
	call: ([value, tz], ctx) => dateTimeOf(value, 0, tzArg(tz), ctx),
	min: 1,
	max: 2
});
define$1("toDateTimeOrNull", {
	call: ([value, tz], ctx) => {
		try {
			return value === null ? null : dateTimeOf(value, 0, tzArg(tz), ctx);
		} catch {
			return null;
		}
	},
	handlesNull: true,
	min: 1,
	max: 2
});
define$1("toDateTimeOrZero", {
	call: ([value, tz], ctx) => {
		try {
			return dateTimeOf(value, 0, tzArg(tz), ctx);
		} catch {
			return new DateTimeValue(0, 0, tzArg(tz));
		}
	},
	min: 1,
	max: 2
});
define$1("toDateTime64", {
	call: ([value, scale, tz], ctx) => dateTimeOf(value, integer(scale), tzArg(tz), ctx),
	min: 2,
	max: 3
});
define$1("toDateTime64OrNull", {
	call: ([value, scale, tz], ctx) => {
		try {
			return value === null ? null : dateTimeOf(value, integer(scale ?? 3), tzArg(tz), ctx);
		} catch {
			return null;
		}
	},
	handlesNull: true,
	min: 1,
	max: 3
});
define$1(["parseDateTimeBestEffort", "parseDateTimeBestEffortUS"], {
	call: ([value, tz], ctx) => dateTimeOf(asString(value, "parseDateTimeBestEffort"), 0, tzArg(tz), ctx),
	min: 1,
	max: 2
});
define$1(["parseDateTimeBestEffortOrNull", "parseDateTimeBestEffortUSOrNull"], {
	call: ([value, tz], ctx) => {
		try {
			return dateTimeOf(stringOf(value), 0, tzArg(tz), ctx);
		} catch {
			return null;
		}
	},
	min: 1,
	max: 2
});
define$1(["parseDateTimeBestEffortOrZero"], {
	call: ([value, tz], ctx) => {
		try {
			return dateTimeOf(stringOf(value), 0, tzArg(tz), ctx);
		} catch {
			return new DateTimeValue(0, 0, tzArg(tz));
		}
	},
	min: 1,
	max: 2
});
define$1("parseDateTime64BestEffort", {
	call: ([value, scale, tz], ctx) => dateTimeOf(stringOf(value), integer(scale ?? 3), tzArg(tz), ctx),
	min: 1,
	max: 3
});
define$1("parseDateTime64BestEffortOrNull", {
	call: ([value, scale, tz], ctx) => {
		try {
			return dateTimeOf(stringOf(value), integer(scale ?? 3), tzArg(tz), ctx);
		} catch {
			return null;
		}
	},
	min: 1,
	max: 3
});
define$1(["toUnixTimestamp"], {
	call: ([value, tz], ctx) => typeof value === "string" ? Math.floor(parseDateTime(value, tzArg(tz, ctx.serverTimeZone)) / 1e3) : Math.floor(msOf(value, ctx.serverTimeZone) / 1e3),
	min: 1,
	max: 2
});
define$1("toUnixTimestamp64Milli", {
	call: ([value]) => Math.floor(value.ms),
	min: 1,
	max: 1
});
define$1("toUnixTimestamp64Micro", {
	call: ([value]) => Math.floor(value.ms * 1e3),
	min: 1,
	max: 1
});
define$1("toUnixTimestamp64Second", {
	call: ([value]) => Math.floor(value.ms / 1e3),
	min: 1,
	max: 1
});
define$1(["fromUnixTimestamp", "FROM_UNIXTIME"], {
	call: ([value, tz]) => new DateTimeValue(integer(value) * 1e3, 0, tzArg(tz)),
	min: 1,
	max: 2
}, true);
define$1("fromUnixTimestamp64Milli", {
	call: ([value, tz]) => new DateTimeValue(toNumber(value), 3, tzArg(tz)),
	min: 1,
	max: 2
});
define$1("fromUnixTimestamp64Micro", {
	call: ([value, tz]) => new DateTimeValue(toNumber(value) / 1e3, 6, tzArg(tz)),
	min: 1,
	max: 2
});
define$1([
	"CAST",
	"_CAST",
	"accurateCast"
], {
	call: ([value, type]) => castValue(value, parseType(stringOf(type))),
	handlesNull: true,
	min: 2,
	max: 2
}, true);
define$1("accurateCastOrNull", {
	call: ([value, type]) => {
		try {
			return castValue(value, {
				name: "Nullable",
				inner: parseType(stringOf(type))
			});
		} catch {
			return null;
		}
	},
	handlesNull: true,
	min: 2,
	max: 2
});
define$1("reinterpretAsString", {
	call: ([value]) => stringOf(value),
	min: 1,
	max: 1
});
define$1("now", {
	call: ([tz], ctx) => new DateTimeValue(Math.floor(ctx.now / 1e3) * 1e3, 0, tzArg(tz)),
	min: 0,
	max: 1
}, true);
define$1(["now64"], {
	call: ([scale, tz], ctx) => new DateTimeValue(ctx.now, scale === void 0 ? 3 : integer(scale), tzArg(tz)),
	min: 0,
	max: 2
});
define$1([
	"today",
	"curdate",
	"current_date"
], {
	call: (_, ctx) => new DateValue(dayNumberIn(ctx.now, ctx.serverTimeZone)),
	min: 0,
	max: 0
}, true);
define$1("yesterday", {
	call: (_, ctx) => new DateValue(dayNumberIn(ctx.now, ctx.serverTimeZone) - 1),
	min: 0,
	max: 0
});
define$1([
	"timeZone",
	"timezone",
	"serverTimeZone",
	"serverTimezone"
], {
	call: (_, ctx) => ctx.serverTimeZone,
	min: 0,
	max: 0
});
define$1(["toTimeZone", "toTimezone"], {
	call: ([value, tz], ctx) => new DateTimeValue(msOf(value, ctx.serverTimeZone), value instanceof DateTimeValue ? value.scale : 0, tzArg(tz)),
	min: 2,
	max: 2
});
define$1(["timeZoneOf", "timezoneOf"], {
	call: ([value], ctx) => value instanceof DateTimeValue ? value.timeZone ?? ctx.serverTimeZone : ctx.serverTimeZone,
	min: 1,
	max: 1
});
define$1(["toYear", "YEAR"], {
	call: ([value, tz], ctx) => datePart(value, ctx, tz).year,
	min: 1,
	max: 2
}, true);
define$1(["toQuarter", "QUARTER"], {
	call: ([value, tz], ctx) => Math.floor((datePart(value, ctx, tz).month - 1) / 3) + 1,
	min: 1,
	max: 2
}, true);
define$1(["toMonth", "MONTH"], {
	call: ([value, tz], ctx) => datePart(value, ctx, tz).month,
	min: 1,
	max: 2
}, true);
define$1([
	"toDayOfMonth",
	"DAY",
	"DAYOFMONTH"
], {
	call: ([value, tz], ctx) => datePart(value, ctx, tz).day,
	min: 1,
	max: 2
}, true);
define$1(["toDayOfYear", "DAYOFYEAR"], {
	call: ([value, tz], ctx) => dayOfYear(datePart(value, ctx, tz)),
	min: 1,
	max: 2
}, true);
define$1(["toHour", "HOUR"], {
	call: ([value, tz], ctx) => datePart(value, ctx, tz).hour,
	min: 1,
	max: 2
}, true);
define$1(["toMinute", "MINUTE"], {
	call: ([value, tz], ctx) => datePart(value, ctx, tz).minute,
	min: 1,
	max: 2
}, true);
define$1(["toSecond", "SECOND"], {
	call: ([value, tz], ctx) => datePart(value, ctx, tz).second,
	min: 1,
	max: 2
}, true);
define$1("toMillisecond", {
	call: ([value]) => value instanceof DateTimeValue ? Math.floor(value.ms - Math.floor(value.ms / 1e3) * 1e3) : 0,
	min: 1,
	max: 2
});
define$1(["toDayOfWeek", "DAYOFWEEK"], {
	call: ([value, mode, tz], ctx) => {
		const { weekday } = datePart(value, ctx, tz);
		const m = mode === void 0 ? 0 : integer(mode);
		const base = m >= 2 ? weekday % 7 : weekday - 1;
		return m % 2 === 1 ? base : base + 1;
	},
	min: 1,
	max: 3
}, true);
define$1("toISOWeek", {
	call: ([value, tz], ctx) => {
		const p = datePart(value, ctx, tz);
		const date = new Date(Date.UTC(p.year, p.month - 1, p.day));
		date.setUTCDate(date.getUTCDate() + 4 - p.weekday);
		const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
		return Math.ceil(((date.getTime() - start.getTime()) / 864e5 + 1) / 7);
	},
	min: 1,
	max: 2
});
define$1("toISOYear", {
	call: ([value, tz], ctx) => {
		const p = datePart(value, ctx, tz);
		const date = new Date(Date.UTC(p.year, p.month - 1, p.day));
		date.setUTCDate(date.getUTCDate() + 4 - p.weekday);
		return date.getUTCFullYear();
	},
	min: 1,
	max: 2
});
define$1("toYYYYMM", {
	call: ([value, tz], ctx) => {
		const p = datePart(value, ctx, tz);
		return p.year * 100 + p.month;
	},
	min: 1,
	max: 2
});
define$1("toYYYYMMDD", {
	call: ([value, tz], ctx) => {
		const p = datePart(value, ctx, tz);
		return p.year * 1e4 + p.month * 100 + p.day;
	},
	min: 1,
	max: 2
});
define$1("toYYYYMMDDhhmmss", {
	call: ([value, tz], ctx) => {
		const p = datePart(value, ctx, tz);
		return normalizeNumber(BigInt(p.year * 1e4 + p.month * 100 + p.day) * 1000000n + BigInt(p.hour * 1e4 + p.minute * 100 + p.second));
	},
	min: 1,
	max: 2
});
define$1("toDate", {
	call: ([value, tz], ctx) => {
		if (value instanceof DateValue) return new DateValue(value.days);
		if (value instanceof DateTimeValue) return new DateValue(dayNumberIn(value.ms, tzArg(tz, value.timeZone ?? ctx.serverTimeZone)));
		if (typeof value === "string") {
			if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value.trim())) return castValue(value, { name: "Date" });
			return new DateValue(dayNumberIn(parseDateTime(value, tzArg(tz, ctx.serverTimeZone)), tzArg(tz, ctx.serverTimeZone)));
		}
		const number = toNumber(value);
		return new DateValue(number <= 65535 ? Math.trunc(number) : dayNumberIn(number * 1e3, tzArg(tz, ctx.serverTimeZone)));
	},
	min: 1,
	max: 2
});
define$1("toDate32", {
	call: ([value, tz], ctx) => {
		return new DateValue(findFunction("toDate").call([value, ...tz === void 0 ? [] : [tz]], ctx).days, true);
	},
	min: 1,
	max: 2
});
define$1(["toStartOfYear"], {
	call: ([value, tz], ctx) => startOf(value, ctx, "year", tz),
	min: 1,
	max: 2
});
define$1(["toStartOfQuarter"], {
	call: ([value, tz], ctx) => startOf(value, ctx, "quarter", tz),
	min: 1,
	max: 2
});
define$1(["toStartOfMonth"], {
	call: ([value, tz], ctx) => startOf(value, ctx, "month", tz),
	min: 1,
	max: 2
});
define$1(["toMonday"], {
	call: ([value, tz], ctx) => startOf(value, ctx, "week", tz, 1),
	min: 1,
	max: 2
});
define$1(["toStartOfWeek"], {
	call: ([value, mode, tz], ctx) => startOf(value, ctx, "week", tz, mode === void 0 ? 0 : integer(mode)),
	min: 1,
	max: 3
});
define$1(["toStartOfDay"], {
	call: ([value, tz], ctx) => startOf(value, ctx, "day", tz),
	min: 1,
	max: 2
});
define$1(["toStartOfHour"], {
	call: ([value, tz], ctx) => startOfTime(value, ctx, 3600, tz),
	min: 1,
	max: 2
});
define$1(["toStartOfMinute"], {
	call: ([value, tz], ctx) => startOfTime(value, ctx, 60, tz),
	min: 1,
	max: 2
});
define$1(["toStartOfSecond"], {
	call: ([value]) => new DateTimeValue(Math.floor(value.ms / 1e3) * 1e3, value.scale, value.timeZone),
	min: 1,
	max: 2
});
define$1(["toStartOfFiveMinutes", "toStartOfFiveMinute"], {
	call: ([value, tz], ctx) => startOfTime(value, ctx, 300, tz),
	min: 1,
	max: 2
});
define$1(["toStartOfTenMinutes"], {
	call: ([value, tz], ctx) => startOfTime(value, ctx, 600, tz),
	min: 1,
	max: 2
});
define$1(["toStartOfFifteenMinutes"], {
	call: ([value, tz], ctx) => startOfTime(value, ctx, 900, tz),
	min: 1,
	max: 2
});
define$1(["toStartOfInterval", "time_bucket"], {
	call: ([value, interval, tz], ctx) => {
		if (!(interval instanceof IntervalValue)) throw illegalType("The second argument of toStartOfInterval must be an interval");
		const count = interval.count;
		switch (interval.unit) {
			case "Year": {
				const year = datePart(value, ctx, tz).year;
				return new DateValue(partsToDay(year - year % count, 1, 1));
			}
			case "Quarter":
			case "Month": {
				const p = datePart(value, ctx, tz);
				const months = p.year * 12 + p.month - 1;
				const start = months - months % (count * (interval.unit === "Quarter" ? 3 : 1));
				return new DateValue(partsToDay(Math.floor(start / 12), start % 12 + 1, 1));
			}
			case "Week": {
				const monday = startOf(value, ctx, "week", tz, 1);
				const weeks = Math.floor((monday.days + 3) / 7);
				return new DateValue((weeks - weeks % count) * 7 - 3);
			}
			case "Day": {
				const timeZone = zoneOf(value, ctx, tz);
				const day = value instanceof DateValue ? value.days : dayNumberIn(msOf(value, timeZone), timeZone);
				const start = day - day % count;
				return new DateTimeValue(fromParts(1970, 1, 1 + start, 0, 0, 0, timeZone), 0, value instanceof DateTimeValue || tz !== void 0 ? timeZone : void 0);
			}
			default: return startOfTime(value, ctx, UNIT_MS[interval.unit] * count / 1e3, tz);
		}
	},
	min: 2,
	max: 3
});
define$1([
	"date_trunc",
	"dateTrunc",
	"DATE_TRUNC"
], {
	call: ([unit, value, tz], ctx) => {
		const which = unitOf(unit);
		if (which === "Year") return startOf(value, ctx, "year", tz);
		if (which === "Quarter") return startOf(value, ctx, "quarter", tz);
		if (which === "Month") return startOf(value, ctx, "month", tz);
		if (which === "Week") return startOf(value, ctx, "week", tz, 1);
		if (which === "Day") return startOf(value, ctx, "day", tz);
		if (which === "Hour") return startOfTime(value, ctx, 3600, tz);
		if (which === "Minute") return startOfTime(value, ctx, 60, tz);
		return startOfTime(value, ctx, 1, tz);
	},
	min: 2,
	max: 3
}, true);
for (const unit of [
	"Nanosecond",
	"Microsecond",
	"Millisecond",
	"Second",
	"Minute",
	"Hour",
	"Day",
	"Week",
	"Month",
	"Quarter",
	"Year"
]) {
	define$1(`toInterval${unit}`, toInterval(unit));
	define$1(`add${unit}s`, {
		call: ([value, count], ctx) => addInterval(value, new IntervalValue(unit, toNumber(count)), 1, ctx),
		min: 2,
		max: 2
	});
	define$1(`subtract${unit}s`, {
		call: ([value, count], ctx) => addInterval(value, new IntervalValue(unit, toNumber(count)), -1, ctx),
		min: 2,
		max: 2
	});
}
define$1([
	"dateAdd",
	"date_add",
	"DATE_ADD",
	"timestampAdd",
	"timestamp_add"
], {
	call: (args, ctx) => {
		if (args.length === 2) return addInterval(args[0], args[1], 1, ctx);
		return addInterval(args[2], new IntervalValue(unitOf(args[0]), toNumber(args[1])), 1, ctx);
	},
	min: 2,
	max: 3
}, true);
define$1([
	"dateSub",
	"date_sub",
	"DATE_SUB",
	"timestampSub",
	"timestamp_sub"
], {
	call: (args, ctx) => {
		if (args.length === 2) return addInterval(args[0], args[1], -1, ctx);
		return addInterval(args[2], new IntervalValue(unitOf(args[0]), toNumber(args[1])), -1, ctx);
	},
	min: 2,
	max: 3
}, true);
define$1([
	"dateDiff",
	"date_diff",
	"DATE_DIFF",
	"timestampDiff",
	"timestamp_diff"
], {
	call: ([unit, a, b, tz], ctx) => dateDiff(unitOf(unit), a, b, ctx, tz),
	min: 3,
	max: 4
}, true);
define$1("age", {
	call: ([unit, a, b, tz], ctx) => {
		const u = unitOf(unit);
		return dateDiff(u, a, b, ctx, tz);
	},
	min: 3,
	max: 4
});
define$1(["formatDateTime", "DATE_FORMAT"], {
	call: ([value, format, tz], ctx) => {
		const timeZone = zoneOf(value, ctx, tz);
		const ms = msOf(value, timeZone);
		const p = partsIn(ms, timeZone);
		return asString(format, "formatDateTime").replace(/%(.)/g, (match, code) => FORMAT_CODES[code]?.(p, ms) ?? match);
	},
	min: 2,
	max: 3
}, true);
define$1("makeDate", {
	call: ([year, month, day]) => new DateValue(partsToDay(integer(year), integer(month), integer(day))),
	min: 3,
	max: 3
});
define$1("makeDateTime", {
	call: ([year, month, day, hour, minute, second, tz], ctx) => new DateTimeValue(fromParts(integer(year), integer(month), integer(day), integer(hour), integer(minute), integer(second), tzArg(tz, ctx.serverTimeZone)), 0, tzArg(tz)),
	min: 6,
	max: 7
});
define$1("toRelativeDayNum", {
	call: ([value, tz], ctx) => value instanceof DateValue ? value.days : dayNumberIn(msOf(value, zoneOf(value, ctx, tz)), zoneOf(value, ctx, tz)),
	min: 1,
	max: 2
});
define$1("toRelativeHourNum", {
	call: ([value]) => Math.floor(msOf(value, "UTC") / 36e5),
	min: 1,
	max: 2
});
define$1(["length", "OCTET_LENGTH"], {
	call: ([value]) => {
		if (Array.isArray(value)) return value.length;
		if (value instanceof Map) return value.size;
		return Buffer.byteLength(stringOf(value));
	},
	min: 1,
	max: 1
}, true);
define$1([
	"lengthUTF8",
	"char_length",
	"character_length",
	"CHAR_LENGTH",
	"CHARACTER_LENGTH"
], {
	call: ([value]) => [...stringOf(value)].length,
	min: 1,
	max: 1
}, true);
define$1("empty", {
	call: ([value]) => {
		if (Array.isArray(value)) return bool(value.length === 0);
		if (value instanceof Map) return bool(value.size === 0);
		if (typeof value === "string") return bool(value === "");
		if (value instanceof TupleValue) return bool(value.items.length === 0);
		return bool(stringOf(value) === "");
	},
	min: 1,
	max: 1
});
define$1("notEmpty", {
	call: (args, ctx) => bool(!findFunction("empty").call(args, ctx)),
	min: 1,
	max: 1
});
define$1([
	"lower",
	"lcase",
	"lowerUTF8"
], {
	call: ([value]) => asString(value, "lower").toLowerCase(),
	min: 1,
	max: 1
}, true);
define$1([
	"upper",
	"ucase",
	"upperUTF8"
], {
	call: ([value]) => asString(value, "upper").toUpperCase(),
	min: 1,
	max: 1
}, true);
define$1(["reverse", "reverseUTF8"], {
	call: ([value]) => Array.isArray(value) ? [...value].reverse() : [...stringOf(value)].reverse().join(""),
	min: 1,
	max: 1
}, true);
define$1(["concat"], {
	call: (args) => {
		if (args.some((arg) => arg === null)) return null;
		return args.map((arg) => stringOf(arg)).join("");
	},
	handlesNull: true
}, true);
define$1(["concatWithSeparator", "concat_ws"], {
	call: ([separator, ...args]) => args.filter((arg) => arg !== null).map((arg) => stringOf(arg)).join(stringOf(separator)),
	handlesNull: true,
	min: 1
}, true);
const substringBytes = (text, offset, length) => {
	const bytes = Buffer.from(text);
	const start = offset > 0 ? offset - 1 : offset < 0 ? Math.max(bytes.length + offset, 0) : 0;
	const end = length === void 0 ? bytes.length : length < 0 ? bytes.length + length : start + length;
	if (offset === 0) return "";
	return bytes.subarray(start, Math.max(start, end)).toString();
};
define$1([
	"substring",
	"substr",
	"mid",
	"byteSlice"
], {
	call: ([value, offset, length]) => substringBytes(stringOf(value), integer(offset), length === void 0 ? void 0 : integer(length)),
	min: 2,
	max: 3
}, true);
define$1(["substringUTF8"], {
	call: ([value, offset, length]) => {
		const chars = [...stringOf(value)];
		const o = integer(offset);
		const start = o > 0 ? o - 1 : o < 0 ? Math.max(chars.length + o, 0) : 0;
		const end = length === void 0 ? chars.length : integer(length) < 0 ? chars.length + integer(length) : start + integer(length);
		return o === 0 ? "" : chars.slice(start, end).join("");
	},
	min: 2,
	max: 3
});
define$1(["left", "leftUTF8"], {
	call: ([value, n]) => [...stringOf(value)].slice(0, integer(n) < 0 ? integer(n) : integer(n)).join(""),
	min: 2,
	max: 2
}, true);
define$1(["right", "rightUTF8"], {
	call: ([value, n]) => {
		const chars = [...stringOf(value)];
		const count = integer(n);
		return count <= 0 ? chars.slice(-count || chars.length).join("") : chars.slice(-count).join("");
	},
	min: 2,
	max: 2
}, true);
define$1(["trimBoth"], {
	call: ([value, chars]) => chars === void 0 ? stringOf(value).replace(/^ +| +$/g, "") : trimChars(stringOf(value), stringOf(chars), true, true),
	min: 1,
	max: 2
}, true);
define$1(["trimLeft"], {
	call: ([value]) => stringOf(value).replace(/^ +/, ""),
	min: 1,
	max: 1
}, true);
define$1(["trimRight"], {
	call: ([value]) => stringOf(value).replace(/ +$/, ""),
	min: 1,
	max: 1
}, true);
const trimChars = (text, chars, left, right) => {
	let start = 0;
	let end = text.length;
	while (left && start < end && chars.includes(text[start])) start++;
	while (right && end > start && chars.includes(text[end - 1])) end--;
	return text.slice(start, end);
};
define$1("startsWith", {
	call: ([value, prefix]) => bool(stringOf(value).startsWith(stringOf(prefix))),
	min: 2,
	max: 2
});
define$1("endsWith", {
	call: ([value, suffix]) => bool(stringOf(value).endsWith(stringOf(suffix))),
	min: 2,
	max: 2
});
define$1(["position", "locate"], {
	call: ([haystack, needle, start]) => {
		return Buffer.from(stringOf(haystack)).indexOf(Buffer.from(stringOf(needle)), start === void 0 ? 0 : integer(start) - 1) + 1;
	},
	min: 2,
	max: 3
}, true);
define$1(["positionCaseInsensitive", "positionCaseInsensitiveUTF8"], {
	call: ([haystack, needle]) => stringOf(haystack).toLowerCase().indexOf(stringOf(needle).toLowerCase()) + 1,
	min: 2,
	max: 2
});
define$1("positionUTF8", {
	call: ([haystack, needle]) => {
		const index = stringOf(haystack).indexOf(stringOf(needle));
		return index === -1 ? 0 : [...stringOf(haystack).slice(0, index)].length + 1;
	},
	min: 2,
	max: 3
});
define$1("countSubstrings", {
	call: ([haystack, needle]) => {
		const n = stringOf(needle);
		if (!n) return 0;
		return stringOf(haystack).split(n).length - 1;
	},
	min: 2,
	max: 3
});
const likePattern = (pattern, insensitive) => {
	let source = "^";
	for (let i = 0; i < pattern.length; i++) {
		const char = pattern[i];
		if (char === "\\" && i + 1 < pattern.length) source += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		else if (char === "%") source += "[\\s\\S]*";
		else if (char === "_") source += "[\\s\\S]";
		else source += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
	return new RegExp(`${source}$`, insensitive ? "is" : "s");
};
const regexCache = /* @__PURE__ */ new Map();
const regex = (pattern, flags = "") => {
	const key = `${flags}/${pattern}`;
	let compiled = regexCache.get(key);
	if (!compiled) {
		try {
			compiled = new RegExp(pattern.replace(/\(\?i\)/g, ""), (pattern.includes("(?i)") ? "i" : "") + flags);
		} catch {
			throw badArguments(`Invalid regular expression: ${pattern}`);
		}
		regexCache.set(key, compiled);
	}
	return compiled;
};
define$1("like", {
	call: ([value, pattern]) => bool(likePattern(stringOf(pattern), false).test(stringOf(value))),
	min: 2,
	max: 2
});
define$1("notLike", {
	call: ([value, pattern]) => bool(!likePattern(stringOf(pattern), false).test(stringOf(value))),
	min: 2,
	max: 2
});
define$1("ilike", {
	call: ([value, pattern]) => bool(likePattern(stringOf(pattern), true).test(stringOf(value))),
	min: 2,
	max: 2
});
define$1("notILike", {
	call: ([value, pattern]) => bool(!likePattern(stringOf(pattern), true).test(stringOf(value))),
	min: 2,
	max: 2
});
define$1(["match", "REGEXP_MATCHES"], {
	call: ([value, pattern]) => bool(regex(stringOf(pattern)).test(stringOf(value))),
	min: 2,
	max: 2
});
define$1("extract", {
	call: ([value, pattern]) => {
		const match = regex(stringOf(pattern)).exec(stringOf(value));
		if (!match) return "";
		return match[1] ?? match[0];
	},
	min: 2,
	max: 2
});
define$1("extractAll", {
	call: ([value, pattern]) => [...stringOf(value).matchAll(regex(stringOf(pattern), "g"))].map((match) => match[1] ?? match[0]),
	min: 2,
	max: 2
});
define$1("extractGroups", {
	call: ([value, pattern]) => {
		const match = regex(stringOf(pattern)).exec(stringOf(value));
		return match ? match.slice(1).map((group) => group ?? "") : [];
	},
	min: 2,
	max: 2
});
define$1("replaceOne", {
	call: ([value, from, to]) => stringOf(value).replace(stringOf(from), () => stringOf(to)),
	min: 3,
	max: 3
});
define$1(["replaceAll", "replace"], {
	call: ([value, from, to]) => stringOf(from) === "" ? stringOf(value) : stringOf(value).replaceAll(stringOf(from), () => stringOf(to)),
	min: 3,
	max: 3
}, true);
const replacement = (text) => text.replace(/\$/g, "$$$$").replace(/\\(\d)/g, "$$$1");
define$1("replaceRegexpOne", {
	call: ([value, pattern, to]) => stringOf(value).replace(regex(stringOf(pattern)), replacement(stringOf(to))),
	min: 3,
	max: 3
});
define$1(["replaceRegexpAll", "REGEXP_REPLACE"], {
	call: ([value, pattern, to]) => stringOf(value).replace(regex(stringOf(pattern), "g"), replacement(stringOf(to))),
	min: 3,
	max: 3
});
define$1("splitByChar", {
	call: ([separator, value]) => stringOf(value).split(stringOf(separator)),
	min: 2,
	max: 3
});
define$1("splitByString", {
	call: ([separator, value]) => stringOf(separator) === "" ? [...stringOf(value)] : stringOf(value).split(stringOf(separator)),
	min: 2,
	max: 3
});
define$1("splitByRegexp", {
	call: ([pattern, value]) => stringOf(value).split(regex(stringOf(pattern))),
	min: 2,
	max: 3
});
define$1("splitByWhitespace", {
	call: ([value]) => stringOf(value).split(/\s+/).filter(Boolean),
	min: 1,
	max: 2
});
define$1("splitByNonAlpha", {
	call: ([value]) => stringOf(value).split(/[^a-zA-Z0-9]+/).filter(Boolean),
	min: 1,
	max: 2
});
define$1("arrayStringConcat", {
	call: ([array, separator]) => asArray(array, "arrayStringConcat").filter((item) => item !== null).map((item) => stringOf(item)).join(separator === void 0 ? "" : stringOf(separator)),
	min: 1,
	max: 2
});
define$1(["repeat"], {
	call: ([value, count]) => stringOf(value).repeat(Math.max(0, integer(count))),
	min: 2,
	max: 2
}, true);
define$1([
	"leftPad",
	"lpad",
	"leftPadUTF8"
], {
	call: ([value, length, pad]) => padText(stringOf(value), integer(length), pad === void 0 ? " " : stringOf(pad), true),
	min: 2,
	max: 3
}, true);
define$1([
	"rightPad",
	"rpad",
	"rightPadUTF8"
], {
	call: ([value, length, pad]) => padText(stringOf(value), integer(length), pad === void 0 ? " " : stringOf(pad), false),
	min: 2,
	max: 3
}, true);
const padText = (text, length, pad, left) => {
	if (text.length >= length) return text.slice(0, length);
	const fill = pad.repeat(Math.ceil((length - text.length) / Math.max(pad.length, 1))).slice(0, length - text.length);
	return left ? fill + text : text + fill;
};
define$1(["base64Encode", "TO_BASE64"], {
	call: ([value]) => Buffer.from(stringOf(value)).toString("base64"),
	min: 1,
	max: 1
}, true);
define$1(["base64Decode", "FROM_BASE64"], {
	call: ([value]) => Buffer.from(stringOf(value), "base64").toString(),
	min: 1,
	max: 1
}, true);
define$1("tryBase64Decode", {
	call: ([value]) => Buffer.from(stringOf(value), "base64").toString(),
	min: 1,
	max: 1
});
define$1("hex", {
	call: ([value]) => isNumeric(value) ? BigInt(integer(value)).toString(16).toUpperCase().padStart(2, "0") : Buffer.from(stringOf(value), "latin1").toString("hex").toUpperCase(),
	min: 1,
	max: 1
}, true);
define$1("unhex", {
	call: ([value]) => Buffer.from(stringOf(value), "hex").toString("latin1"),
	min: 1,
	max: 1
}, true);
define$1(["MD5"], {
	call: ([value]) => (0, crypto.createHash)("md5").update(stringOf(value)).digest("latin1"),
	min: 1,
	max: 1
}, true);
define$1(["SHA1"], {
	call: ([value]) => (0, crypto.createHash)("sha1").update(stringOf(value)).digest("latin1"),
	min: 1,
	max: 1
}, true);
define$1(["SHA224"], {
	call: ([value]) => (0, crypto.createHash)("sha224").update(stringOf(value)).digest("latin1"),
	min: 1,
	max: 1
}, true);
define$1(["SHA256"], {
	call: ([value]) => (0, crypto.createHash)("sha256").update(stringOf(value)).digest("latin1"),
	min: 1,
	max: 1
}, true);
define$1(["SHA512"], {
	call: ([value]) => (0, crypto.createHash)("sha512").update(stringOf(value)).digest("latin1"),
	min: 1,
	max: 1
}, true);
define$1("isValidUTF8", {
	call: ([value]) => bool(!stringOf(value).includes("�")),
	min: 1,
	max: 1
});
define$1("toValidUTF8", {
	call: ([value]) => stringOf(value),
	min: 1,
	max: 1
});
define$1("format", {
	call: ([pattern, ...args]) => stringOf(pattern).replace(/\{(\d*)\}/g, (_, index, offset) => stringOf(args[index === "" ? offset : Number(index)] ?? "")),
	min: 1
});
const jsonPath = (value, keys) => {
	let current;
	try {
		current = JSON.parse(stringOf(value));
	} catch {
		return;
	}
	for (const key of keys) {
		if (current === null || typeof current !== "object") return void 0;
		if (Array.isArray(current) && isNumeric(key)) {
			const index = integer(key);
			current = index > 0 ? current[index - 1] : current[current.length + index];
		} else current = current[stringOf(key)];
	}
	return current;
};
define$1([
	"JSONExtractString",
	"visitParamExtractString",
	"simpleJSONExtractString"
], {
	call: ([json, ...keys]) => {
		const value = jsonPath(json, keys);
		return typeof value === "string" ? value : "";
	},
	min: 1
});
define$1([
	"JSONExtractInt",
	"JSONExtractUInt",
	"visitParamExtractInt",
	"visitParamExtractUInt",
	"simpleJSONExtractInt",
	"simpleJSONExtractUInt"
], {
	call: ([json, ...keys]) => {
		const value = jsonPath(json, keys);
		return typeof value === "number" ? Math.trunc(value) : typeof value === "string" && !Number.isNaN(Number(value)) ? Math.trunc(Number(value)) : 0;
	},
	min: 1
});
define$1([
	"JSONExtractFloat",
	"visitParamExtractFloat",
	"simpleJSONExtractFloat"
], {
	call: ([json, ...keys]) => {
		const value = jsonPath(json, keys);
		return typeof value === "number" ? value : 0;
	},
	min: 1
});
define$1([
	"JSONExtractBool",
	"visitParamExtractBool",
	"simpleJSONExtractBool"
], {
	call: ([json, ...keys]) => bool(jsonPath(json, keys) === true),
	min: 1
});
define$1([
	"JSONExtractRaw",
	"visitParamExtractRaw",
	"simpleJSONExtractRaw"
], {
	call: ([json, ...keys]) => {
		const value = jsonPath(json, keys);
		return value === void 0 ? "" : JSON.stringify(value);
	},
	min: 1
});
define$1([
	"JSONHas",
	"visitParamHas",
	"simpleJSONHas"
], {
	call: ([json, ...keys]) => bool(jsonPath(json, keys) !== void 0),
	min: 1
});
define$1("JSONLength", {
	call: ([json, ...keys]) => {
		const value = jsonPath(json, keys);
		return Array.isArray(value) ? value.length : value && typeof value === "object" ? Object.keys(value).length : 0;
	},
	min: 1
});
define$1("JSONExtractKeys", {
	call: ([json, ...keys]) => {
		const value = jsonPath(json, keys);
		return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [];
	},
	min: 1
});
define$1("JSONExtractArrayRaw", {
	call: ([json, ...keys]) => {
		const value = jsonPath(json, keys);
		return Array.isArray(value) ? value.map((item) => JSON.stringify(item)) : [];
	},
	min: 1
});
define$1("isValidJSON", {
	call: ([json]) => {
		try {
			JSON.parse(stringOf(json));
			return 1;
		} catch {
			return 0;
		}
	},
	min: 1,
	max: 1
});
define$1("toJSONString", {
	call: ([value]) => JSON.stringify(value instanceof Map ? Object.fromEntries(value) : value),
	min: 1,
	max: 1
});
define$1("array", {
	call: (args) => args,
	handlesNull: true
});
const arrayElement = (container, index) => {
	if (container instanceof Map) {
		for (const [key, value] of container) if (valuesEqual(key, index)) return value;
		const sample = container.values().next().value;
		return sample === void 0 ? "" : emptyLike(sample);
	}
	if (container !== null && typeof container === "object" && !Array.isArray(container) && !(container instanceof TupleValue) && !(container instanceof DateTimeValue) && !(container instanceof DateValue) && !(container instanceof IntervalValue)) return container[stringOf(index)] ?? null;
	const array = asArray(container, "arrayElement");
	const i = integer(index);
	const item = i > 0 ? array[i - 1] : i < 0 ? array[array.length + i] : void 0;
	if (item === void 0) return array.length > 0 ? emptyLike(array[0]) : "";
	return item;
};
const emptyLike = (value) => {
	if (typeof value === "string") return "";
	if (typeof value === "number" || typeof value === "bigint") return 0;
	if (typeof value === "boolean") return false;
	if (Array.isArray(value)) return [];
	if (value instanceof DateTimeValue) return new DateTimeValue(0, value.scale, value.timeZone);
	if (value instanceof DateValue) return new DateValue(0);
	if (value === null) return null;
	return null;
};
define$1("arrayElement", {
	call: ([container, index]) => arrayElement(container, index),
	min: 2,
	max: 2
});
define$1("arrayElementOrNull", {
	call: ([container, index]) => {
		const array = asArray(container, "arrayElementOrNull");
		const i = integer(index);
		return (i > 0 ? array[i - 1] : array[array.length + i]) ?? null;
	},
	min: 2,
	max: 2
});
define$1("tupleElement", {
	call: ([tuple, index, fallback]) => {
		if (tuple instanceof TupleValue) {
			if (typeof index === "string") {
				const position = tuple.names?.indexOf(index) ?? -1;
				if (position === -1) {
					if (fallback !== void 0) return fallback;
					throw badArguments(`Tuple doesn't have element with name '${index}'`);
				}
				return tuple.items[position];
			}
			const item = tuple.items[integer(index) - 1];
			if (item === void 0) {
				if (fallback !== void 0) return fallback;
				throw badArguments(`Index for tuple element is out of range`);
			}
			return item;
		}
		if (Array.isArray(tuple)) return tuple[integer(index) - 1] ?? null;
		return arrayElement(tuple, index);
	},
	handlesNull: true,
	min: 2,
	max: 3
});
define$1("tuple", {
	call: (args) => new TupleValue(args),
	handlesNull: true
});
define$1("has", {
	call: ([array, value], ctx) => {
		if (array === null) return 0;
		return bool(asArray(array, "has").some((item) => item === null ? value === null : value !== null && compareValues(...coerceForComparison(item, value, ctx)) === 0));
	},
	handlesNull: true,
	min: 2,
	max: 2
});
define$1("hasAny", {
	call: ([a, b]) => bool(asArray(b, "hasAny").some((item) => asArray(a, "hasAny").some((other) => valuesEqual(item, other)))),
	min: 2,
	max: 2
});
define$1("hasAll", {
	call: ([a, b]) => bool(asArray(b, "hasAll").every((item) => asArray(a, "hasAll").some((other) => valuesEqual(item, other)))),
	min: 2,
	max: 2
});
define$1("hasSubstr", {
	call: ([a, b]) => {
		const x = asArray(a, "hasSubstr");
		const y = asArray(b, "hasSubstr");
		if (y.length === 0) return 1;
		for (let i = 0; i + y.length <= x.length; i++) if (y.every((item, j) => valuesEqual(item, x[i + j]))) return 1;
		return 0;
	},
	min: 2,
	max: 2
});
define$1("indexOf", {
	call: ([array, value]) => asArray(array, "indexOf").findIndex((item) => valuesEqual(item, value)) + 1,
	handlesNull: true,
	min: 2,
	max: 2
});
define$1("countEqual", {
	call: ([array, value]) => asArray(array, "countEqual").filter((item) => valuesEqual(item, value)).length,
	handlesNull: true,
	min: 2,
	max: 2
});
define$1("arrayConcat", {
	call: (args) => args.flatMap((arg) => asArray(arg, "arrayConcat")),
	min: 1
});
define$1("arraySlice", {
	call: ([array, offset, length]) => {
		const items = asArray(array, "arraySlice");
		const o = integer(offset);
		const start = o > 0 ? o - 1 : o < 0 ? Math.max(items.length + o, 0) : 0;
		if (o === 0) return [];
		const end = length === void 0 || length === null ? items.length : integer(length) < 0 ? items.length + integer(length) : start + integer(length);
		return items.slice(start, end);
	},
	handlesNull: true,
	min: 2,
	max: 3
});
define$1("arrayReverse", {
	call: ([array]) => [...asArray(array, "arrayReverse")].reverse(),
	min: 1,
	max: 1
});
define$1("arrayDistinct", {
	call: ([array]) => {
		const seen = /* @__PURE__ */ new Set();
		return asArray(array, "arrayDistinct").filter((item) => {
			const key = valueKey(item);
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	},
	min: 1,
	max: 1
});
define$1("arrayUniq", {
	call: (args) => {
		const seen = /* @__PURE__ */ new Set();
		const arrays = args.map((arg) => asArray(arg, "arrayUniq"));
		for (let i = 0; i < (arrays[0]?.length ?? 0); i++) seen.add(arrays.map((array) => valueKey(array[i])).join("|"));
		return seen.size;
	},
	min: 1
});
define$1("arrayCompact", {
	call: ([array]) => asArray(array, "arrayCompact").filter((item, index, items) => index === 0 || !valuesEqual(item, items[index - 1])),
	min: 1,
	max: 1
});
define$1("arrayEnumerate", {
	call: ([array]) => asArray(array, "arrayEnumerate").map((_, index) => index + 1),
	min: 1,
	max: 1
});
define$1("arrayEnumerateUniq", {
	call: ([array]) => {
		const counts = /* @__PURE__ */ new Map();
		return asArray(array, "arrayEnumerateUniq").map((item) => {
			const key = valueKey(item);
			const count = (counts.get(key) ?? 0) + 1;
			counts.set(key, count);
			return count;
		});
	},
	min: 1
});
define$1("arrayPushBack", {
	call: ([array, value]) => [...asArray(array, "arrayPushBack"), value],
	handlesNull: true,
	min: 2,
	max: 2
});
define$1("arrayPushFront", {
	call: ([array, value]) => [value, ...asArray(array, "arrayPushFront")],
	handlesNull: true,
	min: 2,
	max: 2
});
define$1("arrayPopBack", {
	call: ([array]) => asArray(array, "arrayPopBack").slice(0, -1),
	min: 1,
	max: 1
});
define$1("arrayPopFront", {
	call: ([array]) => asArray(array, "arrayPopFront").slice(1),
	min: 1,
	max: 1
});
define$1("arrayIntersect", {
	call: (args) => {
		const [first = [], ...rest] = args.map((arg) => asArray(arg, "arrayIntersect"));
		const seen = /* @__PURE__ */ new Set();
		return first.filter((item) => {
			const key = valueKey(item);
			if (seen.has(key)) return false;
			seen.add(key);
			return rest.every((array) => array.some((other) => valuesEqual(item, other)));
		});
	},
	min: 1
});
define$1(["arrayFlatten", "flatten"], {
	call: ([array]) => {
		const flat = (items) => items.flatMap((item) => Array.isArray(item) ? flat(item) : [item]);
		return flat(asArray(array, "arrayFlatten"));
	},
	min: 1,
	max: 1
});
define$1("arrayZip", {
	call: (args) => {
		const arrays = args.map((arg) => asArray(arg, "arrayZip"));
		if (new Set(arrays.map((array) => array.length)).size > 1) throw badArguments("The argument 1 and argument 2 of function arrayZip have different array sizes");
		return (arrays[0] ?? []).map((_, index) => new TupleValue(arrays.map((array) => array[index])));
	},
	min: 1
});
define$1("arraySum", {
	call: ([array]) => asArray(array, "arraySum").reduce((sum, item) => arithmetic(sum, item ?? 0, (x, y) => x + y, (x, y) => x + y), 0),
	min: 1,
	max: 1
});
define$1("arrayAvg", {
	call: ([array]) => {
		const items = asArray(array, "arrayAvg");
		return items.length === 0 ? NaN : items.reduce((sum, item) => sum + toNumber(item), 0) / items.length;
	},
	min: 1,
	max: 1
});
define$1("arrayProduct", {
	call: ([array]) => asArray(array, "arrayProduct").reduce((product, item) => product * toNumber(item), 1),
	min: 1,
	max: 1
});
define$1("arrayMin", {
	call: ([array]) => {
		const items = asArray(array, "arrayMin");
		return items.length === 0 ? 0 : items.reduce((best, item) => compareValues(item, best) < 0 ? item : best);
	},
	min: 1,
	max: 1
});
define$1("arrayMax", {
	call: ([array]) => {
		const items = asArray(array, "arrayMax");
		return items.length === 0 ? 0 : items.reduce((best, item) => compareValues(item, best) > 0 ? item : best);
	},
	min: 1,
	max: 1
});
define$1("arraySort", {
	call: ([array]) => [...asArray(array, "arraySort")].sort(sortWithNullsLast),
	min: 1
});
define$1("arrayReverseSort", {
	call: ([array]) => [...asArray(array, "arrayReverseSort")].sort((a, b) => a === null ? 1 : b === null ? -1 : compareValues(b, a)),
	min: 1
});
define$1("arrayResize", {
	call: ([array, size, extend]) => {
		const items = asArray(array, "arrayResize");
		const n = integer(size);
		if (n <= items.length) return items.slice(0, n);
		return [...items, ...Array.from({ length: n - items.length }, () => extend ?? (items[0] !== void 0 ? emptyLike(items[0]) : 0))];
	},
	handlesNull: true,
	min: 2,
	max: 3
});
define$1("emptyArrayString", {
	call: () => [],
	min: 0,
	max: 0
});
define$1([
	"emptyArrayUInt8",
	"emptyArrayUInt16",
	"emptyArrayUInt32",
	"emptyArrayUInt64",
	"emptyArrayInt8",
	"emptyArrayInt16",
	"emptyArrayInt32",
	"emptyArrayInt64",
	"emptyArrayFloat32",
	"emptyArrayFloat64",
	"emptyArrayDate",
	"emptyArrayDateTime"
], {
	call: () => [],
	min: 0,
	max: 0
});
define$1("range", {
	call: (args) => {
		const [start, end, step] = args.length === 1 ? [
			0,
			integer(args[0]),
			1
		] : [
			integer(args[0]),
			integer(args[1]),
			args[2] === void 0 ? 1 : integer(args[2])
		];
		if (step === 0) throw badArguments("A call to function range would produce an infinite array");
		const items = [];
		for (let i = start; step > 0 ? i < end : i > end; i += step) {
			items.push(i);
			if (items.length > 1e8) throw badArguments("A call to function range would produce too large an array");
		}
		return items;
	},
	min: 1,
	max: 3
});
const sortWithNullsLast = (a, b) => a === null ? b === null ? 0 : 1 : b === null ? -1 : compareValues(a, b);
define$1("map", {
	call: (args) => {
		const map = /* @__PURE__ */ new Map();
		for (let i = 0; i + 1 < args.length; i += 2) map.set(args[i], args[i + 1]);
		return map;
	},
	handlesNull: true
});
define$1("mapFromArrays", {
	call: ([keys, values]) => new Map(asArray(keys, "mapFromArrays").map((key, index) => [key, asArray(values, "mapFromArrays")[index]])),
	min: 2,
	max: 2
});
define$1("mapKeys", {
	call: ([map]) => [...map.keys()],
	min: 1,
	max: 1
});
define$1("mapValues", {
	call: ([map]) => [...map.values()],
	min: 1,
	max: 1
});
define$1("mapContains", {
	call: ([map, key]) => bool([...map.keys()].some((item) => valuesEqual(item, key))),
	min: 2,
	max: 2
});
define$1([
	"currentDatabase",
	"database",
	"DATABASE",
	"schema",
	"current_database"
], {
	call: (_, ctx) => ctx.database,
	min: 0,
	max: 0
}, true);
define$1([
	"currentUser",
	"user",
	"current_user"
], {
	call: () => "default",
	min: 0,
	max: 0
}, true);
define$1(["version", "VERSION"], {
	call: () => "26.8.33.10",
	min: 0,
	max: 0
}, true);
define$1(["hostName", "hostname"], {
	call: () => "localhost",
	min: 0,
	max: 0
});
define$1(["uptime"], {
	call: () => Math.floor(process.uptime()),
	min: 0,
	max: 0
});
define$1(["generateUUIDv4", "UUIDv4"], {
	call: () => (0, crypto.randomUUID)(),
	min: 0,
	max: 1
});
define$1(["rand", "rand32"], {
	call: () => Math.floor(Math.random() * 2 ** 32),
	min: 0,
	max: 1
}, true);
define$1(["rand64"], {
	call: () => normalizeNumber(BigInt(Math.floor(Math.random() * 2 ** 32)) * 2n ** 32n + BigInt(Math.floor(Math.random() * 2 ** 32))),
	min: 0,
	max: 1
});
define$1(["randCanonical"], {
	call: () => Math.random(),
	min: 0,
	max: 1
});
define$1("sleep", {
	call: () => 0,
	min: 1,
	max: 1
});
define$1("sleepEachRow", {
	call: () => 0,
	min: 1,
	max: 1
});
define$1("getSetting", {
	call: ([name], ctx) => ctx.settings[stringOf(name)] ?? null,
	min: 1,
	max: 1
});
define$1("toTypeName", {
	call: () => "Unknown",
	handlesNull: true,
	min: 1,
	max: 1
});
define$1("defaultValueOfArgumentType", {
	call: ([value]) => emptyLike(value),
	handlesNull: true,
	min: 1,
	max: 1
});
define$1("bar", {
	call: ([value, min, max, width]) => {
		const w = width === void 0 ? 80 : toNumber(width);
		const ratio = (toNumber(value) - toNumber(min)) / (toNumber(max) - toNumber(min));
		return "█".repeat(Math.max(0, Math.round(ratio * w)));
	},
	min: 3,
	max: 4
});
define$1("formatReadableSize", {
	call: ([value]) => readable(toNumber(value), 1024, [
		"B",
		"KiB",
		"MiB",
		"GiB",
		"TiB",
		"PiB"
	]),
	min: 1,
	max: 1
});
define$1("formatReadableDecimalSize", {
	call: ([value]) => readable(toNumber(value), 1e3, [
		"B",
		"KB",
		"MB",
		"GB",
		"TB",
		"PB"
	]),
	min: 1,
	max: 1
});
define$1("formatReadableQuantity", {
	call: ([value]) => readable(toNumber(value), 1e3, [
		"",
		" thousand",
		" million",
		" billion",
		" trillion",
		" quadrillion"
	]),
	min: 1,
	max: 1
});
const readable = (value, base, units) => {
	let index = 0;
	let current = value;
	while (Math.abs(current) >= base && index < units.length - 1) {
		current /= base;
		index++;
	}
	return `${current.toFixed(2)}${units[index].startsWith(" ") || units[index] === "" ? "" : " "}${units[index]}`;
};
define$1("IPv4NumToString", {
	call: ([value]) => {
		const n = integer(value) >>> 0;
		return [
			24,
			16,
			8,
			0
		].map((shift) => n >>> shift & 255).join(".");
	},
	min: 1,
	max: 1
});
define$1("IPv4StringToNum", {
	call: ([value]) => stringOf(value).split(".").reduce((n, part) => n * 256 + Number(part), 0),
	min: 1,
	max: 1
});
define$1("isIPv4String", {
	call: ([value]) => bool(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(stringOf(value)) && stringOf(value).split(".").every((part) => Number(part) <= 255)),
	min: 1,
	max: 1
});
define$1("isIPv6String", {
	call: ([value]) => bool(stringOf(value).includes(":")),
	min: 1,
	max: 1
});
define$1("isIPAddressInRange", {
	call: ([address, cidr]) => {
		const [network, bits] = stringOf(cidr).split("/");
		const toNum = (ip) => ip.split(".").reduce((n, part) => n * 256 + Number(part), 0);
		if (!stringOf(address).includes(".") || !network?.includes(".")) return 0;
		const shift = 32 - (bits === void 0 ? 32 : Number(bits));
		return bool(Math.floor(toNum(stringOf(address)) / 2 ** shift) === Math.floor(toNum(network) / 2 ** shift));
	},
	min: 2,
	max: 2
});
define$1("IPv4CIDRToRange", {
	call: ([address, bits]) => {
		const n = stringOf(address).split(".").reduce((total, part) => total * 256 + Number(part), 0);
		const size = 2 ** (32 - integer(bits));
		const start = Math.floor(n / size) * size;
		const text = (value) => [
			24,
			16,
			8,
			0
		].map((shift) => Math.floor(value / 2 ** shift) % 256).join(".");
		return new TupleValue([text(start), text(start + size - 1)]);
	},
	min: 2,
	max: 2
});
define$1("toIPv4", {
	call: ([value]) => stringOf(value),
	min: 1,
	max: 1
});
define$1("toIPv6", {
	call: ([value]) => stringOf(value),
	min: 1,
	max: 1
});
define$1("domain", {
	call: ([url]) => {
		try {
			return new URL(stringOf(url)).hostname;
		} catch {
			return "";
		}
	},
	min: 1,
	max: 1
});
define$1("domainWithoutWWW", {
	call: ([url]) => {
		try {
			return new URL(stringOf(url)).hostname.replace(/^www\./, "");
		} catch {
			return "";
		}
	},
	min: 1,
	max: 1
});
define$1("protocol", {
	call: ([url]) => {
		try {
			return new URL(stringOf(url)).protocol.replace(/:$/, "");
		} catch {
			return "";
		}
	},
	min: 1,
	max: 1
});
define$1("path", {
	call: ([url]) => {
		try {
			return new URL(stringOf(url)).pathname;
		} catch {
			return "";
		}
	},
	min: 1,
	max: 1
});
define$1("queryString", {
	call: ([url]) => {
		try {
			return new URL(stringOf(url)).search.slice(1);
		} catch {
			return "";
		}
	},
	min: 1,
	max: 1
});
define$1("cutQueryString", {
	call: ([url]) => stringOf(url).replace(/\?[^#]*/, ""),
	min: 1,
	max: 1
});
define$1("extractURLParameter", {
	call: ([url, name]) => {
		try {
			return new URL(stringOf(url)).searchParams.get(stringOf(name)) ?? "";
		} catch {
			return "";
		}
	},
	min: 2,
	max: 2
});
define$1(["decodeURLComponent"], {
	call: ([value]) => {
		try {
			return decodeURIComponent(stringOf(value));
		} catch {
			return stringOf(value);
		}
	},
	min: 1,
	max: 1
});
define$1(["encodeURLComponent"], {
	call: ([value]) => encodeURIComponent(stringOf(value)),
	min: 1,
	max: 1
});
const checkArguments = (name, fn, count) => {
	if (fn.min !== void 0 && count < fn.min || fn.max !== void 0 && count > fn.max) {
		const expected = fn.min === fn.max ? `${fn.min}` : fn.max === void 0 ? `at least ${fn.min}` : `${fn.min} to ${fn.max}`;
		throw argumentCount(`Number of arguments for function ${name} doesn't match: passed ${count}, should be ${expected}`);
	}
};
//#endregion
//#region src/memory/aggregates.ts
const aggregates = /* @__PURE__ */ new Map();
const caseInsensitive = /* @__PURE__ */ new Map();
const define = (names, fn, insensitive = false) => {
	for (const name of Array.isArray(names) ? names : [names]) {
		aggregates.set(name, fn);
		if (insensitive) caseInsensitive.set(name.toLowerCase(), name);
	}
};
const countsRows = (base) => /^(count|uniq)/.test(base) || base === "countDistinct" || base === "count_distinct";
const lookup = (name) => aggregates.get(name) ?? aggregates.get(caseInsensitive.get(name.toLowerCase()) ?? "");
const findAggregate = (name) => {
	const combinators = [];
	let base = name;
	while (!lookup(base)) {
		const combinator = [
			"If",
			"Distinct",
			"OrNull",
			"OrDefault",
			"Array",
			"State",
			"Merge",
			"ForEach",
			"Resample"
		].find((suffix) => base.endsWith(suffix) && base.length > suffix.length);
		if (!combinator) return;
		if ([
			"State",
			"Merge",
			"ForEach",
			"Resample"
		].includes(combinator)) throw illegalType(`The -${combinator} combinator is not supported by the in-memory ClickHouse`);
		combinators.unshift(combinator);
		base = base.slice(0, -combinator.length);
	}
	return {
		fn: lookup(base),
		combinators,
		base
	};
};
const isAggregate = (name) => {
	try {
		return findAggregate(name) !== void 0;
	} catch {
		return true;
	}
};
const createAccumulator = (name, params, argCount, distinct, nullable = false) => {
	const found = findAggregate(name);
	if (!found) throw illegalType(`Unknown aggregate function ${name}`);
	const { fn, combinators, base } = found;
	const conditional = combinators.includes("If");
	const array = combinators.includes("Array");
	const orNull = combinators.includes("OrNull");
	const orDefault = combinators.includes("OrDefault");
	const nullableResult = nullable && !countsRows(base);
	const valueArgs = conditional ? argCount - 1 : argCount;
	if (fn.min !== void 0 && valueArgs < fn.min || fn.max !== void 0 && valueArgs > fn.max) throw badArguments(`Aggregate function ${name} requires ${fn.min === fn.max ? fn.min : `${fn.min} to ${fn.max ?? "any"}`} arguments, got ${valueArgs}`);
	let inner = fn.create(params, valueArgs);
	let accepted = 0;
	const accept = (values) => {
		if (valueArgs === 0 || !values.includes(null)) accepted++;
		inner.add(values);
	};
	if (distinct || combinators.includes("Distinct")) {
		const seen = /* @__PURE__ */ new Set();
		const base = inner;
		inner = {
			add: (args) => {
				const key = args.map(valueKey).join("|");
				if (seen.has(key)) return;
				seen.add(key);
				base.add(args);
			},
			result: base.result
		};
	}
	return {
		add: (args) => {
			let values = args;
			if (conditional) {
				const condition = values.at(-1);
				if (!truthy(condition)) return;
				values = values.slice(0, -1);
			}
			if (array) {
				const arrays = values;
				for (let i = 0; i < (arrays[0]?.length ?? 0); i++) accept(arrays.map((item) => item[i]));
				return;
			}
			accept(values);
		},
		result: () => (orNull || orDefault || nullableResult) && accepted === 0 ? null : inner.result()
	};
};
const skipNulls = (accumulator) => ({
	add: (args) => {
		if (args.some((arg) => arg === null)) return;
		accumulator.add(args);
	},
	result: accumulator.result
});
const add = (a, b) => {
	if (typeof a === "bigint" || typeof b === "bigint") {
		if ((typeof a === "bigint" || Number.isInteger(a)) && (typeof b === "bigint" || Number.isInteger(b))) return normalizeNumber(BigInt(a) + BigInt(b));
		return Number(a) + Number(b);
	}
	const sum = toNumber(a) + toNumber(b);
	if (Number.isInteger(a) && Number.isInteger(b) && !Number.isSafeInteger(sum)) return normalizeNumber(BigInt(a) + BigInt(b));
	return sum;
};
define("count", {
	create: (_, args) => {
		let count = 0;
		return {
			add: (values) => {
				if (args === 0 || values[0] !== null) count++;
			},
			result: () => count
		};
	},
	max: 1
}, true);
define([
	"sum",
	"sumWithOverflow",
	"sumKahan"
], {
	create: () => {
		let total = 0;
		return skipNulls({
			add: ([value]) => {
				if (!isNumeric(value) && typeof value !== "boolean") throw illegalType(`Illegal type of argument for aggregate function sum`);
				total = add(total, typeof value === "boolean" ? Number(value) : value);
			},
			result: () => total
		});
	},
	min: 1,
	max: 1
}, true);
define("avg", {
	create: () => {
		let total = 0;
		let count = 0;
		return skipNulls({
			add: ([value]) => {
				total += toNumber(value);
				count++;
			},
			result: () => count === 0 ? NaN : total / count
		});
	},
	min: 1,
	max: 1
}, true);
define("avgWeighted", {
	create: () => {
		let total = 0;
		let weights = 0;
		return skipNulls({
			add: ([value, weight]) => {
				total += toNumber(value) * toNumber(weight);
				weights += toNumber(weight);
			},
			result: () => weights === 0 ? NaN : total / weights
		});
	},
	min: 2,
	max: 2
});
const extreme = (pick) => ({
	create: () => {
		let best;
		return skipNulls({
			add: ([value]) => {
				if (best === void 0 || pick(compareValues(value, best))) best = value;
			},
			result: () => best ?? null
		});
	},
	min: 1,
	max: 1
});
define("min", extreme((result) => result < 0), true);
define("max", extreme((result) => result > 0), true);
define([
	"any",
	"first_value",
	"any_value"
], {
	create: () => {
		let value;
		return skipNulls({
			add: ([item]) => {
				if (value === void 0) value = item;
			},
			result: () => value ?? null
		});
	},
	min: 1,
	max: 1
}, true);
define(["anyLast", "last_value"], {
	create: () => {
		let value;
		return skipNulls({
			add: ([item]) => void (value = item),
			result: () => value ?? null
		});
	},
	min: 1,
	max: 1
});
define("anyHeavy", {
	create: () => {
		const counts = /* @__PURE__ */ new Map();
		return skipNulls({
			add: ([value]) => {
				const key = valueKey(value);
				const entry = counts.get(key) ?? {
					value,
					count: 0
				};
				entry.count++;
				counts.set(key, entry);
			},
			result: () => [...counts.values()].sort((a, b) => b.count - a.count)[0]?.value ?? null
		});
	},
	min: 1,
	max: 1
});
const arg = (pick) => ({
	create: () => {
		let best;
		return skipNulls({
			add: ([value, key]) => {
				if (best === void 0 || pick(compareValues(key, best.key))) best = {
					value,
					key
				};
			},
			result: () => best?.value ?? null
		});
	},
	min: 2,
	max: 2
});
define("argMin", arg((result) => result < 0));
define("argMax", arg((result) => result > 0));
define([
	"uniq",
	"uniqExact",
	"uniqCombined",
	"uniqCombined64",
	"uniqHLL12",
	"uniqTheta",
	"countDistinct",
	"count_distinct"
], {
	create: () => {
		const seen = /* @__PURE__ */ new Set();
		return skipNulls({
			add: (values) => void seen.add(values.length === 1 ? valueKey(values[0]) : values.map(valueKey).join("|")),
			result: () => seen.size
		});
	},
	min: 1
});
define([
	"groupArray",
	"array_agg",
	"groupArrayLast"
], {
	create: (params) => {
		const limit = params[0] === void 0 ? Infinity : toNumber(params[0]);
		const items = [];
		return skipNulls({
			add: ([value]) => {
				if (items.length < limit) items.push(value);
			},
			result: () => items
		});
	},
	min: 1,
	max: 1
}, true);
define(["groupUniqArray", "groupArrayDistinct"], {
	create: (params) => {
		const limit = params[0] === void 0 ? Infinity : toNumber(params[0]);
		const items = /* @__PURE__ */ new Map();
		return skipNulls({
			add: ([value]) => {
				const key = valueKey(value);
				if (!items.has(key) && items.size < limit) items.set(key, value);
			},
			result: () => [...items.values()]
		});
	},
	min: 1,
	max: 1
});
define("groupArraySorted", {
	create: (params) => {
		const limit = params[0] === void 0 ? Infinity : toNumber(params[0]);
		const items = [];
		return skipNulls({
			add: ([value]) => void items.push(value),
			result: () => items.sort(sortWithNullsLast).slice(0, limit)
		});
	},
	min: 1,
	max: 1
});
const bitwise = (op, initial) => ({
	create: () => {
		let result = initial;
		return skipNulls({
			add: ([value]) => void (result = op(result, BigInt(Math.trunc(toNumber(value))))),
			result: () => normalizeNumber(result)
		});
	},
	min: 1,
	max: 1
});
define("groupBitOr", bitwise((a, b) => a | b, 0n));
define("groupBitAnd", bitwise((a, b) => a & b, -1n));
define("groupBitXor", bitwise((a, b) => a ^ b, 0n));
const interpolate = (sorted, level) => {
	if (sorted.length === 0) return NaN;
	const position = level * (sorted.length - 1);
	const lower = Math.floor(position);
	const upper = Math.ceil(position);
	return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};
const exact = (sorted, level) => {
	if (sorted.length === 0) return 0;
	return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(level * sorted.length)))];
};
const quantiles = (exactly, multiple) => ({
	create: (params) => {
		const levels = params.length === 0 ? [.5] : params.map(toNumber);
		const values = [];
		return skipNulls({
			add: ([value]) => void values.push(value),
			result: () => {
				if (exactly || values.some((value) => value instanceof DateTimeValue || value instanceof DateValue)) {
					const sorted = [...values].sort(compareValues);
					const answers = levels.map((level) => exact(sorted, level));
					return multiple ? answers : answers[0];
				}
				const sorted = values.map(toNumber).sort((a, b) => a - b);
				const answers = levels.map((level) => interpolate(sorted, level));
				return multiple ? answers : answers[0];
			}
		});
	},
	min: 1,
	max: 1
});
define([
	"quantile",
	"median",
	"quantileTDigest",
	"medianTDigest",
	"quantileTiming",
	"medianTiming",
	"quantileReservoirSampling",
	"quantileDeterministic",
	"quantileBFloat16",
	"quantileDD"
], quantiles(false, false));
define([
	"quantiles",
	"quantilesTDigest",
	"quantilesTiming",
	"quantilesReservoirSampling",
	"quantilesDeterministic",
	"quantilesBFloat16",
	"quantilesDD"
], quantiles(false, true));
define([
	"quantileExact",
	"medianExact",
	"quantileExactLow",
	"medianExactLow"
], quantiles(true, false));
define(["quantilesExact", "quantilesExactLow"], quantiles(true, true));
define(["quantileExactHigh", "medianExactHigh"], {
	create: (params) => {
		const level = params[0] === void 0 ? .5 : toNumber(params[0]);
		const values = [];
		return skipNulls({
			add: ([value]) => void values.push(value),
			result: () => {
				const sorted = [...values].sort(compareValues);
				if (sorted.length === 0) return 0;
				return sorted[Math.min(sorted.length - 1, Math.ceil(level * sorted.length) - (level * sorted.length === Math.floor(level * sorted.length) && level !== 0 ? 0 : 1))];
			}
		});
	},
	min: 1,
	max: 1
});
const moments = (fn) => ({
	create: () => {
		const values = [];
		return skipNulls({
			add: ([value]) => void values.push(toNumber(value)),
			result: () => fn(values)
		});
	},
	min: 1,
	max: 1
});
const variance = (values, sample) => {
	const n = values.length;
	if (n === 0 || sample && n === 1) return sample ? Infinity : NaN;
	const mean = values.reduce((sum, value) => sum + value, 0) / n;
	return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (sample ? n - 1 : n);
};
define(["varPop", "VAR_POP"], moments((values) => variance(values, false)), true);
define(["varSamp", "VAR_SAMP"], moments((values) => variance(values, true)), true);
define([
	"stddevPop",
	"STDDEV_POP",
	"std"
], moments((values) => Math.sqrt(variance(values, false))), true);
define(["stddevSamp", "STDDEV_SAMP"], moments((values) => Math.sqrt(variance(values, true))), true);
define(["corr"], {
	create: () => {
		const xs = [];
		const ys = [];
		return skipNulls({
			add: ([x, y]) => {
				xs.push(toNumber(x));
				ys.push(toNumber(y));
			},
			result: () => {
				const n = xs.length;
				const mx = xs.reduce((a, b) => a + b, 0) / n;
				const my = ys.reduce((a, b) => a + b, 0) / n;
				let sxy = 0;
				let sxx = 0;
				let syy = 0;
				for (let i = 0; i < n; i++) {
					sxy += (xs[i] - mx) * (ys[i] - my);
					sxx += (xs[i] - mx) ** 2;
					syy += (ys[i] - my) ** 2;
				}
				return sxy / Math.sqrt(sxx * syy);
			}
		});
	},
	min: 2,
	max: 2
});
define(["topK", "topKWeighted"], {
	create: (params, args) => {
		const limit = params[0] === void 0 ? 10 : toNumber(params[0]);
		const counts = /* @__PURE__ */ new Map();
		return skipNulls({
			add: ([value, weight]) => {
				const key = valueKey(value);
				const entry = counts.get(key) ?? {
					value,
					count: 0,
					order: counts.size
				};
				entry.count += args === 2 ? toNumber(weight) : 1;
				counts.set(key, entry);
			},
			result: () => [...counts.values()].sort((a, b) => b.count - a.count || a.order - b.order).slice(0, limit).map((entry) => entry.value)
		});
	},
	min: 1,
	max: 2
});
define("sumMap", {
	create: () => {
		const totals = /* @__PURE__ */ new Map();
		return {
			add: ([keys, values]) => {
				keys.forEach((key, index) => {
					const id = valueKey(key);
					const entry = totals.get(id) ?? {
						key,
						value: 0
					};
					entry.value = add(entry.value, values[index] ?? 0);
					totals.set(id, entry);
				});
			},
			result: () => {
				const entries = [...totals.values()].sort((a, b) => compareValues(a.key, b.key));
				return [entries.map((entry) => entry.key), entries.map((entry) => entry.value)];
			}
		};
	},
	min: 2,
	max: 2
});
define("windowFunnel", {
	create: (params) => {
		const window = toNumber(params[0] ?? 0);
		const modes = new Set(params.slice(1).map((mode) => String(mode)));
		const strictOrder = modes.has("strict_order");
		const strictDeduplication = modes.has("strict_deduplication");
		const strictIncrease = modes.has("strict_increase");
		const strictOnce = modes.has("strict_once");
		const events = [];
		let steps = 0;
		return {
			add: ([time, ...conditions]) => {
				steps = conditions.length;
				const seconds = time instanceof DateTimeValue ? time.ms / 1e3 : time instanceof DateValue ? time.days * 86400 : toNumber(time);
				let matched = false;
				for (let step = 0; step < conditions.length; step++) {
					if (!truthy(conditions[step])) continue;
					events.push({
						time: seconds,
						step
					});
					matched = true;
					if (strictOnce) break;
				}
				if (strictOrder && !matched) events.push({
					time: seconds,
					step: -1
				});
			},
			result: () => {
				const sorted = [...events].sort((a, b) => a.time - b.time || a.step - b.step);
				const reached = Array.from({ length: steps }, () => void 0);
				let started = false;
				for (const { time, step } of sorted) {
					if (strictOrder && step === -1) {
						if (started) break;
						continue;
					}
					if (step === 0) {
						reached[0] = {
							start: time,
							last: time
						};
						started = true;
					} else if (strictDeduplication && reached[step]) return step + 1;
					else if (strictOrder && started && !reached[step - 1]) return reached.findIndex((level) => !level);
					else if (reached[step - 1]) {
						const previous = reached[step - 1];
						if (time <= previous.start + window && (!strictIncrease || previous.last < time)) {
							reached[step] = {
								start: previous.start,
								last: time
							};
							if (step + 1 === steps) return steps;
						}
					}
				}
				for (let level = steps; level > 0; level--) if (reached[level - 1]) return level;
				return 0;
			}
		};
	},
	min: 2
});
define("retention", {
	create: (_, args) => {
		const seen = Array.from({ length: args }, () => false);
		return {
			add: (conditions) => {
				conditions.forEach((condition, index) => {
					if (truthy(condition)) seen[index] = true;
				});
			},
			result: () => seen.map((value, index) => index === 0 ? Number(value) : Number(seen[0] && value))
		};
	},
	min: 1
});
define(["boundingRatio"], {
	create: () => {
		let first;
		let last;
		return skipNulls({
			add: ([x, y]) => {
				const point = [toNumber(x), toNumber(y)];
				if (!first || point[0] < first[0]) first = point;
				if (!last || point[0] > last[0]) last = point;
			},
			result: () => first && last && last[0] !== first[0] ? (last[1] - first[1]) / (last[0] - first[0]) : NaN
		});
	},
	min: 2,
	max: 2
});
const aggregateNames = () => [...aggregates.keys()];
//#endregion
//#region src/memory/evaluate.ts
const LAZY = /* @__PURE__ */ new Set([
	"if",
	"multiIf",
	"and",
	"or",
	"caseWithExpression",
	"coalesce",
	"ifNull"
]);
const SPECIAL = /* @__PURE__ */ new Set([
	"arrayJoin",
	"in",
	"notIn",
	"globalIn",
	"globalNotIn",
	"exists",
	"toTypeName",
	"toColumnTypeName",
	"if",
	"multiIf",
	"and",
	"or",
	"coalesce",
	"ifNull",
	"arrayElement",
	"CAST",
	"_CAST",
	"cast"
]);
const LAMBDA_FUNCTIONS = /* @__PURE__ */ new Set([
	"arrayMap",
	"arrayFilter",
	"arrayExists",
	"arrayAll",
	"arrayCount",
	"arraySum",
	"arrayAvg",
	"arrayMin",
	"arrayMax",
	"arrayFirst",
	"arrayLast",
	"arrayFirstIndex",
	"arrayLastIndex",
	"arraySort",
	"arrayReverseSort",
	"arraySplit",
	"arrayFold",
	"arrayCumSum"
]);
const withRow = (scope, row) => ({
	...scope,
	row,
	aliasValues: void 0,
	resolving: void 0
});
const collectAggregates = (expr, found = [], inside = false) => {
	if (expr.kind === "function") {
		if (!expr.over && isAggregateCall(expr)) {
			if (inside) throw illegalAggregation(`Aggregate function ${columnName(expr)} is found inside another aggregate function in query`);
			found.push(expr);
			expr.args.forEach((arg) => collectAggregates(arg, [], true));
			return found;
		}
		expr.args.forEach((arg) => collectAggregates(arg, found, inside));
		expr.params?.forEach((param) => collectAggregates(param, found, inside));
	}
	return found;
};
const isAggregateCall = (expr) => {
	return expr.kind === "function" && (expr.distinct === true || isAggregate(expr.name)) && !findFunction(expr.name);
};
const containsAggregate = (expr) => collectAggregates(expr).length > 0;
const paramValue = (expr, scope) => {
	const text = scope.query.params[expr.name];
	if (text === void 0) throw unknownQueryParameter(`Substitution \`${expr.name}\` is not set`);
	return parseParam(text, parseType(expr.type));
};
const pathValue = (value, path) => {
	let current = value;
	for (const part of path) if (current instanceof TupleValue) {
		const index = current.names?.indexOf(part) ?? -1;
		if (index === -1) return void 0;
		current = current.items[index];
	} else if (current instanceof Map) current = current.get(part);
	else if (current !== null && typeof current === "object" && !Array.isArray(current)) {
		current = current[part];
		if (current === void 0) return null;
	} else return;
	return current;
};
const names = /* @__PURE__ */ new WeakMap();
const functionsOf = /* @__PURE__ */ new WeakMap();
const nameOf = (expr) => {
	let name = names.get(expr);
	if (name === void 0) {
		name = columnName(expr);
		names.set(expr, name);
	}
	return name;
};
const resolveIdentifier = (expr, scope) => {
	const name = nameOf(expr);
	if (expr.parts.length === 1 && scope.lambdas?.has(name)) return scope.lambdas.get(name);
	if (expr.parts.length === 1 && scope.aliases.has(name) && !scope.resolving?.has(name)) {
		const cached = scope.aliasValues?.get(name);
		if (cached !== void 0) return cached;
		const resolving = new Set(scope.resolving);
		resolving.add(name);
		const value = evaluate(scope.aliases.get(name), {
			...scope,
			resolving
		});
		if (!scope.group) {
			scope.aliasValues ??= /* @__PURE__ */ new Map();
			scope.aliasValues.set(name, value);
		}
		return value;
	}
	const index = scope.columns.get(name);
	if (index !== void 0) {
		if (scope.group) throw notAnAggregate(`Column '${name}' is not under aggregate function and not in GROUP BY keys. In query ${scope.query.text}`);
		return scope.row[index];
	}
	for (let split = expr.parts.length - 1; split >= 1; split--) {
		const column = expr.parts.slice(0, split).join(".");
		const position = scope.columns.get(column);
		if (position !== void 0) {
			if (scope.group) throw notAnAggregate(`Column '${column}' is not under aggregate function and not in GROUP BY keys. In query ${scope.query.text}`);
			const value = pathValue(scope.row[position], expr.parts.slice(split));
			if (value !== void 0) return value;
		}
	}
	if (scope.outer) {
		if (scope.outer.correlation) scope.outer.correlation.used = true;
		return resolveIdentifier(expr, scope.outer);
	}
	throw unknownIdentifier(`Unknown expression identifier \`${name}\` in scope ${scope.query.text}`);
};
const callLambda = (lambda, values, scope) => {
	if (lambda.kind !== "lambda") throw illegalType("The first argument of a higher order function must be a lambda");
	const lambdas = new Map(scope.lambdas);
	lambda.params.forEach((param, index) => lambdas.set(param, values[index] ?? null));
	return evaluate(lambda.body, {
		...scope,
		lambdas
	});
};
const higherOrder = (name, args, scope) => {
	const lambda = args[0].kind === "lambda" ? args[0] : void 0;
	const arrays = (lambda ? args.slice(1) : args).map((arg) => evaluate(arg, scope));
	if (name === "arrayFold") {
		const [array, initial] = arrays.length === 2 ? arrays : [arrays[0], arrays.at(-1)];
		return array.reduce((acc, item) => callLambda(lambda, [acc, item], scope), initial);
	}
	for (const array of arrays) if (!Array.isArray(array)) throw illegalType(`Argument for function ${name} must be an array`);
	const items = arrays[0];
	const apply = (index) => lambda ? callLambda(lambda, arrays.map((array) => array[index]), scope) : items[index];
	const mapped = items.map((_, index) => apply(index));
	switch (name) {
		case "arrayMap": return mapped;
		case "arrayFilter": return items.filter((_, index) => truthy(mapped[index]));
		case "arrayExists": return mapped.some(truthy) ? 1 : 0;
		case "arrayAll": return mapped.every(truthy) ? 1 : 0;
		case "arrayCount": return mapped.filter(truthy).length;
		case "arrayFirst": return items.find((_, index) => truthy(mapped[index])) ?? (typeof items[0] === "string" ? "" : 0);
		case "arrayLast": return items.findLast((_, index) => truthy(mapped[index])) ?? (typeof items[0] === "string" ? "" : 0);
		case "arrayFirstIndex": return mapped.findIndex(truthy) + 1;
		case "arrayLastIndex": return mapped.findLastIndex(truthy) + 1;
		case "arraySum": return mapped.reduce((sum, value) => sum + Number(value), 0);
		case "arrayAvg": return mapped.length === 0 ? NaN : mapped.reduce((sum, value) => sum + Number(value), 0) / mapped.length;
		case "arrayMin": return mapped.length === 0 ? 0 : mapped.reduce((best, value) => compareValues(value, best) < 0 ? value : best);
		case "arrayMax": return mapped.length === 0 ? 0 : mapped.reduce((best, value) => compareValues(value, best) > 0 ? value : best);
		case "arrayCumSum": {
			let sum = 0;
			return mapped.map((value) => sum += Number(value));
		}
		case "arraySort":
		case "arrayReverseSort": {
			const order = items.map((item, index) => ({
				item,
				key: mapped[index]
			}));
			order.sort((a, b) => name === "arraySort" ? compareValues(a.key, b.key) : compareValues(b.key, a.key));
			return order.map((entry) => entry.item);
		}
		case "arraySplit": {
			const parts = [];
			items.forEach((item, index) => {
				if (index === 0 || truthy(mapped[index])) parts.push([]);
				parts.at(-1).push(item);
			});
			return parts;
		}
	}
	throw unknownFunction(`Function with name \`${name}\` does not exist`);
};
const runSubquery = (query, scope) => {
	const cached = scope.query.subqueries.get(query);
	if (cached) return cached;
	const correlation = { used: false };
	const result = scope.query.run(query, {
		...scope,
		correlation
	});
	if (!correlation.used) scope.query.subqueries.set(query, result);
	return result;
};
const inSet = (expr, scope) => {
	if (expr.kind === "subquery") {
		const correlation = { used: false };
		const result = scope.query.subqueries.get(expr.query) ?? scope.query.run(expr.query, {
			...scope,
			correlation
		});
		if (correlation.used) throw notImplemented("Correlated subqueries are not supported in IN");
		scope.query.subqueries.set(expr.query, result);
		return result.rows.map((row) => row.length === 1 ? row[0] : new TupleValue(row));
	}
	const value = evaluate(expr, scope);
	if (value instanceof TupleValue) return value.items;
	if (Array.isArray(value) && expr.kind !== "literal") return value;
	if (Array.isArray(value)) return value;
	return [value];
};
const contains = (set, value, ctx) => {
	if (value === null) return false;
	return set.some((item) => {
		if (item === null) return false;
		if (value instanceof TupleValue && item instanceof TupleValue) return valueKey(value) === valueKey(item);
		const [a, b] = coerceForComparison(value, item, ctx);
		return compareValues(a, b) === 0;
	});
};
const special = (expr, scope) => {
	const { name, args } = expr;
	switch (name) {
		case "arrayJoin": {
			const value = scope.arrayJoins?.get(expr);
			if (value === void 0) throw illegalType("arrayJoin can only be used in the SELECT list of the in-memory ClickHouse");
			return { value };
		}
		case "in":
		case "notIn":
		case "globalIn":
		case "globalNotIn": {
			const value = evaluate(args[0], scope);
			const set = inSet(args[1], scope);
			if (value === null) return { value: null };
			const found = contains(set, value, scope.query.fn);
			return { value: (name === "in" || name === "globalIn") === found ? 1 : 0 };
		}
		case "exists": {
			const query = args[0].query;
			return { value: scope.query.run(query, scope).rows.length > 0 ? 1 : 0 };
		}
		case "toTypeName": {
			const type = scope.query.inferType(args[0], scope);
			return { value: type ? formatType(type) : "String" };
		}
		case "toColumnTypeName": {
			const type = scope.query.inferType(args[0], scope);
			return { value: type ? formatType(type) : "String" };
		}
		case "if": {
			if (args.length !== 3) checkArguments(name, findFunction(name), args.length);
			const condition = evaluate(args[0], scope);
			return { value: evaluate(truthy(condition) ? args[1] : args[2], scope) };
		}
		case "multiIf":
			for (let i = 0; i + 1 < args.length; i += 2) if (truthy(evaluate(args[i], scope))) return { value: evaluate(args[i + 1], scope) };
			return { value: evaluate(args.at(-1), scope) };
		case "and": {
			let unknown = false;
			for (const arg of args) {
				const value = evaluate(arg, scope);
				if (value === null) unknown = true;
				else if (!truthy(value)) return { value: 0 };
			}
			return { value: unknown ? null : 1 };
		}
		case "or": {
			let unknown = false;
			for (const arg of args) {
				const value = evaluate(arg, scope);
				if (value === null) unknown = true;
				else if (truthy(value)) return { value: 1 };
			}
			return { value: unknown ? null : 0 };
		}
		case "coalesce":
			for (const arg of args) {
				const value = evaluate(arg, scope);
				if (value !== null) return { value };
			}
			return { value: null };
		case "ifNull": {
			const value = evaluate(args[0], scope);
			return { value: value === null ? evaluate(args[1], scope) : value };
		}
		case "arrayElement": {
			const container = evaluate(args[0], scope);
			const index = evaluate(args[1], scope);
			if (container === null || index === null) return { value: null };
			return { value: arrayElement(container, index) };
		}
		case "CAST":
		case "_CAST":
		case "cast": {
			const value = evaluate(args[0], scope);
			const type = stringOf(evaluate(args[1], scope));
			return { value: castValue(value, parseType(type)) };
		}
	}
	if (LAMBDA_FUNCTIONS.has(name) && args.some((arg) => arg.kind === "lambda")) return { value: higherOrder(name, args, scope) };
	if (LAZY.has(name)) return;
};
const evaluate = (expr, scope) => {
	if (scope.group && expr.kind !== "literal") {
		const name = nameOf(expr);
		const key = scope.group.keys.get(name);
		if (key !== void 0 || scope.group.keys.has(name)) return key ?? null;
	}
	switch (expr.kind) {
		case "literal": return expr.value;
		case "param": return paramValue(expr, scope);
		case "identifier": return resolveIdentifier(expr, scope);
		case "subquery": {
			const result = runSubquery(expr.query, scope);
			if (result.rows.length > 1) throw new ClickHouseException(125, "INCORRECT_RESULT_OF_SCALAR_SUBQUERY", "Scalar subquery returned more than one row");
			const row = result.rows[0];
			if (!row) return null;
			return row.length === 1 ? row[0] : new TupleValue(row);
		}
		case "lambda": throw badArguments("A lambda can only be an argument of a higher order function");
		case "asterisk": throw badArguments("An asterisk can only stand in the SELECT list or in count(*)");
		case "function": {
			if (isAggregateCall(expr)) {
				if (!scope.group) throw illegalAggregation(`Aggregate function ${columnName(expr)} is found in WHERE or another place that doesn't allow aggregation in query ${scope.query.text}`);
				const value = scope.group.aggregates.get(expr);
				if (value === void 0) throw illegalAggregation(`Aggregate function ${columnName(expr)} isn't available here in query ${scope.query.text}`);
				return value;
			}
			if (SPECIAL.has(expr.name) || LAMBDA_FUNCTIONS.has(expr.name) && expr.args.some((arg) => arg.kind === "lambda")) {
				const handled = special(expr, scope);
				if (handled) return handled.value;
			}
			let fn = functionsOf.get(expr);
			if (fn === void 0) {
				fn = findFunction(expr.name) ?? null;
				functionsOf.set(expr, fn);
			}
			if (!fn) {
				if (findAggregate(expr.name)) throw illegalAggregation(`Aggregate function ${expr.name} is found in a place that doesn't allow aggregation`);
				throw unknownFunction(`Function with name \`${expr.name}\` does not exist. In scope ${scope.query.text}`);
			}
			checkArguments(expr.name, fn, expr.args.length);
			const args = expr.args.map((arg) => evaluate(arg, scope));
			if (!fn.handlesNull && args.some((arg) => arg === null)) return null;
			try {
				return fn.call(args, scope.query.fn);
			} catch (error) {
				if (error instanceof ClickHouseException) throw error;
				if (error instanceof Error && error.constructor.name === "") throw new ClickHouseException(395, "FUNCTION_THROW_IF_VALUE_IS_NON_ZERO", error.message);
				throw error;
			}
		}
	}
};
const evaluateBoolean = (expr, scope) => truthy(evaluate(expr, scope));
//#endregion
//#region src/memory/infer.ts
const t = (name) => parseType(name);
const UInt64 = t("UInt64");
const Float64 = t("Float64");
const StringType = t("String");
const UInt8 = t("UInt8");
const Bool = t("Bool");
const integerType = (value) => {
	const n = BigInt(value);
	if (n >= 0n) {
		if (n < 256n) return t("UInt8");
		if (n < 65536n) return t("UInt16");
		if (n < 4294967296n) return t("UInt32");
		if (n < 18446744073709551616n) return t("UInt64");
		return t("UInt128");
	}
	if (n >= -128n) return t("Int8");
	if (n >= -32768n) return t("Int16");
	if (n >= -2147483648n) return t("Int32");
	return t("Int64");
};
const valueType = (value, float = false) => {
	if (value === null) return {
		name: "Nullable",
		inner: { name: "Nothing" }
	};
	if (typeof value === "string") return StringType;
	if (typeof value === "boolean") return Bool;
	if (typeof value === "bigint") return integerType(value);
	if (typeof value === "number") return Number.isInteger(value) && !float ? integerType(value) : Float64;
	if (value instanceof DateTimeValue) return value.scale > 0 ? {
		name: "DateTime64",
		scale: value.scale,
		timeZone: value.timeZone
	} : value.timeZone ? {
		name: "DateTime",
		timeZone: value.timeZone
	} : { name: "DateTime" };
	if (value instanceof DateValue) return { name: value.wide ? "Date32" : "Date" };
	if (Array.isArray(value)) return {
		name: "Array",
		inner: value.length > 0 ? valueType(value[0]) : { name: "Nothing" }
	};
	if (value instanceof TupleValue) return {
		name: "Tuple",
		items: value.items.map((item) => valueType(item))
	};
	if (value instanceof Map) {
		const [entry] = value.entries();
		return {
			name: "Map",
			key: entry ? valueType(entry[0]) : StringType,
			value: entry ? valueType(entry[1]) : StringType
		};
	}
	return { name: "JSON" };
};
const wider = (a, b) => {
	if (isFloatType(unwrap(a)) || isFloatType(unwrap(b))) return Float64;
	return a;
};
const sumType = (type) => {
	const base = type ? unwrap(type) : void 0;
	if (!base) return Float64;
	if (isFloatType(base) || base.name === "Decimal") return base.name === "Decimal" ? {
		name: "Decimal",
		precision: 38,
		scale: base.scale
	} : Float64;
	if (isIntegerType(base)) return base.name.startsWith("U") ? UInt64 : t("Int64");
	return Float64;
};
const SAME_AS_FIRST = /* @__PURE__ */ new Set([
	"min",
	"max",
	"any",
	"anyLast",
	"anyHeavy",
	"argMin",
	"argMax",
	"first_value",
	"last_value",
	"any_value",
	"quantileExact",
	"medianExact",
	"quantileExactLow",
	"quantileExactHigh"
]);
const aggregateType = (name, args, scope, expr) => {
	const found = findAggregate(name);
	if (!found) return;
	const base = found.base;
	const nullableArgs = args.some((arg) => arg !== void 0 && isNullable(arg));
	const orNull = found.combinators.includes("OrNull") || nullableArgs && !countsRows(base);
	const wrap = (type) => orNull && !isNullable(type) ? {
		name: "Nullable",
		inner: type
	} : type;
	const first = args[0] ? found.combinators.includes("Array") && args[0].name === "Array" ? args[0].inner : args[0] : void 0;
	if (/^count/.test(base) || /^uniq/.test(base) || base === "countDistinct") return wrap(UInt64);
	if (expr.distinct && base === "count") return wrap(UInt64);
	if (/^sum/.test(base) && base !== "sumMap") return wrap(sumType(first));
	if (/^(avg|quantile|median|varPop|varSamp|stddev|corr|boundingRatio)/.test(base) && !SAME_AS_FIRST.has(base)) {
		if (/^quantiles/.test(base)) return wrap({
			name: "Array",
			inner: Float64
		});
		return wrap(Float64);
	}
	if (SAME_AS_FIRST.has(base)) return wrap(first ? unwrap(first) : StringType);
	if (/^groupArray|^groupUniqArray|^topK/.test(base)) return {
		name: "Array",
		inner: first ? unwrap(first) : StringType
	};
	if (base === "windowFunnel") return UInt8;
	if (base === "retention") return {
		name: "Array",
		inner: UInt8
	};
	if (/^groupBit/.test(base)) return first ?? UInt64;
};
const FUNCTION_TYPES = {
	length: UInt64,
	lengthUTF8: UInt64,
	empty: UInt8,
	notEmpty: UInt8,
	has: UInt8,
	hasAny: UInt8,
	hasAll: UInt8,
	like: UInt8,
	notLike: UInt8,
	ilike: UInt8,
	notILike: UInt8,
	match: UInt8,
	equals: UInt8,
	notEquals: UInt8,
	less: UInt8,
	greater: UInt8,
	lessOrEquals: UInt8,
	greaterOrEquals: UInt8,
	and: UInt8,
	or: UInt8,
	not: UInt8,
	in: UInt8,
	notIn: UInt8,
	isNull: UInt8,
	isNotNull: UInt8,
	startsWith: UInt8,
	endsWith: UInt8,
	position: UInt64,
	indexOf: UInt64,
	toString: StringType,
	lower: StringType,
	upper: StringType,
	concat: StringType,
	substring: StringType,
	formatDateTime: StringType,
	toTypeName: StringType,
	currentDatabase: StringType,
	version: StringType,
	divide: Float64,
	avg: Float64,
	toDate: t("Date"),
	today: t("Date"),
	yesterday: t("Date"),
	toStartOfMonth: t("Date"),
	toStartOfQuarter: t("Date"),
	toStartOfYear: t("Date"),
	toMonday: t("Date"),
	toStartOfWeek: t("Date"),
	toYear: t("UInt16"),
	toMonth: UInt8,
	toDayOfMonth: UInt8,
	toDayOfWeek: UInt8,
	toHour: UInt8,
	toMinute: UInt8,
	toSecond: UInt8,
	toYYYYMM: t("UInt32"),
	toYYYYMMDD: t("UInt32"),
	toUnixTimestamp: t("UInt32"),
	generateUUIDv4: t("UUID"),
	plus: (args) => args[0] && args[1] ? wider(args[0], args[1]) : void 0,
	minus: (args) => args[0] && args[1] ? wider(args[0], args[1]) : void 0,
	multiply: (args) => args[0] && args[1] ? wider(args[0], args[1]) : void 0,
	if: (args) => args[1],
	multiIf: (args) => args[1],
	coalesce: (args) => args.find(Boolean),
	ifNull: (args) => args[0] && unwrap(args[0]),
	arrayElement: (args) => args[0]?.name === "Array" ? args[0].inner : args[0]?.name === "Map" ? args[0].value : void 0,
	arrayMap: () => void 0,
	toNullable: (args) => args[0] && (isNullable(args[0]) ? args[0] : {
		name: "Nullable",
		inner: args[0]
	}),
	assumeNotNull: (args) => args[0] && unwrap(args[0])
};
const CONVERSIONS = /^to(U?Int(8|16|32|64|128|256)|Float(32|64)|UUID|Bool|Date32|String)(OrNull|OrZero|OrDefault)?$/;
const inferType = (expr, scope) => {
	switch (expr.kind) {
		case "literal": return valueType(expr.value, expr.float);
		case "param": return parseType(expr.type);
		case "identifier": {
			const name = expr.parts.join(".");
			if (expr.parts.length === 1 && scope.aliases.has(name) && !scope.resolving?.has(name)) {
				const resolving = new Set(scope.resolving);
				resolving.add(name);
				return inferType(scope.aliases.get(name), {
					...scope,
					resolving
				});
			}
			const index = scope.columns.get(name);
			return index === void 0 ? void 0 : scope.types[index];
		}
		case "function": {
			const args = expr.args.map((arg) => inferType(arg, scope));
			const aggregate = aggregateType(expr.name, args, scope, expr);
			if (aggregate) return aggregate;
			const conversion = CONVERSIONS.exec(expr.name);
			if (conversion) {
				const type = t(conversion[1]);
				return conversion[4] === "OrNull" ? {
					name: "Nullable",
					inner: type
				} : type;
			}
			if ((expr.name === "CAST" || expr.name === "_CAST") && expr.args[1]?.kind === "literal") return parseType(String(expr.args[1].value));
			if (expr.name === "toDateTime" || expr.name === "now") {
				const zone = expr.args[expr.name === "now" ? 0 : 1];
				return zone?.kind === "literal" ? {
					name: "DateTime",
					timeZone: String(zone.value)
				} : { name: "DateTime" };
			}
			if (expr.name === "toDateTime64" || expr.name === "now64") {
				const scale = expr.args[expr.name === "now64" ? 0 : 1];
				const zone = expr.args[expr.name === "now64" ? 1 : 2];
				return {
					name: "DateTime64",
					scale: scale?.kind === "literal" ? Number(scale.value) : 3,
					...zone?.kind === "literal" ? { timeZone: String(zone.value) } : {}
				};
			}
			if (/^toStartOf(Hour|Minute|Day|FiveMinutes?|TenMinutes|FifteenMinutes|Interval)$/.test(expr.name)) {
				const zone = expr.args.at(-1);
				const source = args[0] ? unwrap(args[0]) : void 0;
				const timeZone = expr.args.length > (expr.name === "toStartOfInterval" ? 2 : 1) && zone?.kind === "literal" ? String(zone.value) : source && "timeZone" in source ? source.timeZone : void 0;
				return timeZone ? {
					name: "DateTime",
					timeZone
				} : { name: "DateTime" };
			}
			if (expr.name === "array") return {
				name: "Array",
				inner: args[0] ?? { name: "Nothing" }
			};
			if (expr.name === "tuple") return {
				name: "Tuple",
				items: args.map((arg) => arg ?? StringType)
			};
			const entry = FUNCTION_TYPES[expr.name];
			if (typeof entry === "function") return entry(args);
			return entry;
		}
		default: return;
	}
};
//#endregion
//#region src/memory/format.ts
const outputSettings = (settings) => {
	const flag = (name, fallback) => {
		const value = settings[name];
		if (value === void 0) return fallback;
		return value === true || value === 1 || value === "1" || value === "true";
	};
	const format = String(settings.date_time_output_format ?? "simple");
	return {
		dateTimeFormat: format === "iso" || format === "unix_timestamp" ? format : "simple",
		quote64BitIntegers: flag("output_format_json_quote_64bit_integers", false),
		quoteDenormals: flag("output_format_json_quote_denormals", false),
		escapeForwardSlashes: flag("output_format_json_escape_forward_slashes", true),
		serverTimeZone: "UTC"
	};
};
const jsonString = (value, settings) => {
	const text = JSON.stringify(value);
	return settings.escapeForwardSlashes ? text.replaceAll("/", "\\/") : text;
};
const dateTimeText = (value, settings) => {
	if (settings.dateTimeFormat === "iso") return formatIso(value.ms, value.scale);
	if (settings.dateTimeFormat === "unix_timestamp") return value.scale > 0 ? (value.ms / 1e3).toFixed(value.scale) : String(Math.floor(value.ms / 1e3));
	return formatDateTimeValue(value, settings.serverTimeZone);
};
const jsonValue = (value, settings) => {
	if (value === null) return "null";
	if (typeof value === "string") return jsonString(value, settings);
	if (typeof value === "boolean") return value ? "true" : "false";
	if (typeof value === "number") {
		if (!Number.isFinite(value)) return settings.quoteDenormals ? `"${formatNumber(value)}"` : "null";
		return formatNumber(value);
	}
	if (typeof value === "bigint") return settings.quote64BitIntegers ? `"${value}"` : value.toString();
	if (value instanceof DateTimeValue) {
		const text = dateTimeText(value, settings);
		return settings.dateTimeFormat === "unix_timestamp" ? text : jsonString(text, settings);
	}
	if (value instanceof DateValue) return jsonString(formatDateValue(value), settings);
	if (value instanceof IntervalValue) return String(value.count);
	if (Array.isArray(value)) return `[${value.map((item) => jsonValue(item, settings)).join(",")}]`;
	if (value instanceof TupleValue) {
		if (value.names) return `{${value.items.map((item, index) => `${jsonString(value.names[index], settings)}:${jsonValue(item, settings)}`).join(",")}}`;
		return `[${value.items.map((item) => jsonValue(item, settings)).join(",")}]`;
	}
	if (value instanceof Map) return `{${[...value.entries()].map(([key, item]) => `${jsonString(textValue(key), settings)}:${jsonValue(item, settings)}`).join(",")}}`;
	return jsonObject(value, settings);
};
const jsonObject = (value, settings) => {
	if (value === null || typeof value !== "object") return jsonValue(value, settings);
	if (Array.isArray(value)) return `[${value.map((item) => jsonObject(item, settings)).join(",")}]`;
	return `{${Object.entries(value).filter(([, item]) => item !== void 0).map(([key, item]) => `${jsonString(key, settings)}:${jsonObject(item, settings)}`).join(",")}}`;
};
const tsvEscape = (text) => {
	return text.replaceAll("\\", "\\\\").replaceAll("	", "\\t").replaceAll("\n", "\\n").replaceAll("\r", "\\r").replaceAll("\0", "\\0").replaceAll("\b", "\\b").replaceAll("\f", "\\f");
};
const tsvValue = (value, settings) => {
	if (value === null) return "\\N";
	if (value instanceof DateTimeValue) return dateTimeText(value, settings);
	if (typeof value === "string") return tsvEscape(value);
	if (value !== null && typeof value === "object" && !(value instanceof DateValue) && !Array.isArray(value) && !(value instanceof TupleValue) && !(value instanceof Map) && !(value instanceof IntervalValue)) return tsvEscape(jsonObject(value, settings));
	return tsvEscape(textValue(value));
};
const csvValue = (value, settings) => {
	if (value === null) return "\\N";
	if (typeof value === "number" || typeof value === "bigint") return textValue(value);
	if (typeof value === "boolean") return value ? "true" : "false";
	return `"${(value instanceof DateTimeValue ? dateTimeText(value, settings) : typeof value === "string" ? value : textValue(value)).replaceAll("\"", "\"\"")}"`;
};
const FORMAT_NAMES = {
	jsoneachrow: "JSONEachRow",
	ndjson: "JSONEachRow",
	jsonlines: "JSONEachRow",
	jsonl: "JSONEachRow",
	jsonstringseachrow: "JSONStringsEachRow",
	jsoncompacteachrow: "JSONCompactEachRow",
	jsoncompactstringseachrow: "JSONCompactStringsEachRow",
	jsoncompacteachrowwithnames: "JSONCompactEachRowWithNames",
	jsoncompacteachrowwithnamesandtypes: "JSONCompactEachRowWithNamesAndTypes",
	jsonobjecteachrow: "JSONObjectEachRow",
	json: "JSON",
	jsonstrings: "JSONStrings",
	jsoncompact: "JSONCompact",
	jsoncompactstrings: "JSONCompactStrings",
	tabseparated: "TabSeparated",
	tsv: "TabSeparated",
	tabseparatedraw: "TabSeparatedRaw",
	tsvraw: "TabSeparatedRaw",
	tabseparatedwithnames: "TabSeparatedWithNames",
	tsvwithnames: "TabSeparatedWithNames",
	tabseparatedwithnamesandtypes: "TabSeparatedWithNamesAndTypes",
	tsvwithnamesandtypes: "TabSeparatedWithNamesAndTypes",
	csv: "CSV",
	csvwithnames: "CSVWithNames",
	csvwithnamesandtypes: "CSVWithNamesAndTypes",
	values: "Values",
	null: "Null"
};
const normalizeFormat = (name) => {
	const format = FORMAT_NAMES[name.toLowerCase()];
	if (!format) throw unknownFormat(`Unknown output format ${name}`);
	return format;
};
const quoted = (result, settings) => {
	return result.columns.map((column) => settings.quote64BitIntegers && column.type !== void 0 && /^U?Int(64|128|256)$/.test(column.type.name === "Nullable" || column.type.name === "LowCardinality" ? column.type.inner.name : column.type.name));
};
const typeName = (result, index) => {
	const type = result.columns[index].type;
	return type ? formatType(type) : "String";
};
const formatResult = (result, name, settings, elapsed = 0) => {
	const format = normalizeFormat(name);
	const names = result.columns.map((column) => column.name);
	const lines = (rows) => rows.map((row) => `${row}\n`).join("");
	const quote = quoted(result, settings);
	const cellJson = (value, index) => quote[index] && (typeof value === "number" || typeof value === "bigint") ? `"${value}"` : jsonValue(value, settings);
	const asString = (value) => value === null ? "null" : jsonString(value instanceof DateTimeValue ? dateTimeText(value, settings) : typeof value === "string" ? value : textValue(value), settings);
	switch (format) {
		case "JSONEachRow": return {
			format,
			contentType: "application/x-ndjson; charset=UTF-8",
			body: lines(result.rows.map((row) => `{${row.map((value, index) => `${jsonString(names[index], settings)}:${cellJson(value, index)}`).join(",")}}`))
		};
		case "JSONStringsEachRow": return {
			format,
			contentType: "application/x-ndjson; charset=UTF-8",
			body: lines(result.rows.map((row) => `{${row.map((value, index) => `${jsonString(names[index], settings)}:${asString(value)}`).join(",")}}`))
		};
		case "JSONCompactEachRow":
		case "JSONCompactStringsEachRow":
		case "JSONCompactEachRowWithNames":
		case "JSONCompactEachRowWithNamesAndTypes": {
			const strings = format === "JSONCompactStringsEachRow";
			const header = [];
			if (format !== "JSONCompactEachRow" && format !== "JSONCompactStringsEachRow") header.push(`[${names.map((name) => jsonString(name, settings)).join(", ")}]`);
			if (format === "JSONCompactEachRowWithNamesAndTypes") header.push(`[${names.map((_, index) => jsonString(typeName(result, index), settings)).join(", ")}]`);
			return {
				format,
				contentType: "application/x-ndjson; charset=UTF-8",
				body: lines([...header, ...result.rows.map((row) => `[${row.map((value, index) => strings ? asString(value) : cellJson(value, index)).join(", ")}]`)])
			};
		}
		case "JSONObjectEachRow": return {
			format,
			contentType: "application/json; charset=UTF-8",
			body: `{${result.rows.map((row, index) => `${jsonString(`row_${index + 1}`, settings)}:{${row.map((value, column) => `${jsonString(names[column], settings)}:${jsonValue(value, settings)}`).join(",")}}`).join(",")}}\n`
		};
		case "JSON":
		case "JSONStrings":
		case "JSONCompact":
		case "JSONCompactStrings": {
			const compact = format === "JSONCompact" || format === "JSONCompactStrings";
			const strings = format === "JSONStrings" || format === "JSONCompactStrings";
			const cell = (value, index) => strings ? asString(value) : cellJson(value, index);
			return {
				format,
				contentType: "application/json; charset=UTF-8",
				body: `{\n\t"meta":\n\t[\n${names.map((name, index) => `\t\t{\n\t\t\t"name": ${jsonString(name, settings)},\n\t\t\t"type": ${jsonString(typeName(result, index), settings)}\n\t\t}`).join(",\n")}\n\t],\n\n\t"data":\n\t[\n${result.rows.map((row) => compact ? `\t\t[${row.map(cell).join(", ")}]` : `\t\t{\n${row.map((value, index) => `\t\t\t${jsonString(names[index], settings)}: ${cell(value, index)}`).join(",\n")}\n\t\t}`).join(",\n")}\n\t],\n\n\t"rows": ${result.rows.length},\n\n\t"statistics":\n\t{\n\t\t"elapsed": ${elapsed},\n\t\t"rows_read": ${result.rows.length},\n\t\t"bytes_read": 0\n\t}\n}\n`
			};
		}
		case "TabSeparated":
		case "TabSeparatedRaw":
		case "TabSeparatedWithNames":
		case "TabSeparatedWithNamesAndTypes": {
			const raw = format === "TabSeparatedRaw";
			const header = [];
			if (format === "TabSeparatedWithNames" || format === "TabSeparatedWithNamesAndTypes") header.push(names.map(tsvEscape).join("	"));
			if (format === "TabSeparatedWithNamesAndTypes") header.push(names.map((_, index) => typeName(result, index)).join("	"));
			return {
				format,
				contentType: "text/tab-separated-values; charset=UTF-8",
				body: lines([...header, ...result.rows.map((row) => row.map((value) => raw && typeof value === "string" ? value : tsvValue(value, settings)).join("	"))])
			};
		}
		case "CSV":
		case "CSVWithNames":
		case "CSVWithNamesAndTypes": {
			const header = [];
			if (format !== "CSV") header.push(names.map((name) => `"${name.replaceAll("\"", "\"\"")}"`).join(","));
			if (format === "CSVWithNamesAndTypes") header.push(names.map((_, index) => `"${typeName(result, index)}"`).join(","));
			return {
				format,
				contentType: "text/csv; charset=UTF-8; header=present",
				body: lines([...header, ...result.rows.map((row) => row.map((value) => csvValue(value, settings)).join(","))])
			};
		}
		case "Values": return {
			format,
			contentType: "text/plain; charset=UTF-8",
			body: result.rows.map((row) => `(${row.map((value) => textValue(value, true)).join(",")})`).join(",")
		};
		case "Null": return {
			format,
			contentType: "text/plain; charset=UTF-8",
			body: ""
		};
	}
	throw unknownFormat(`Unknown output format ${name}`);
};
//#endregion
//#region src/memory/json.ts
const parseJsonSequence = (text) => {
	const reader = new JsonReader(text);
	const values = [];
	while (true) {
		reader.skipSeparators();
		if (reader.done()) return values;
		values.push(reader.value());
	}
};
const LITERALS = {
	true: true,
	false: false,
	null: null
};
var JsonReader = class {
	text;
	pos = 0;
	constructor(text) {
		this.text = text;
	}
	done() {
		return this.pos >= this.text.length;
	}
	skipSeparators() {
		while (this.pos < this.text.length && /[\s,;]/.test(this.text[this.pos])) this.pos++;
	}
	skipWhitespace() {
		while (this.pos < this.text.length && /\s/.test(this.text[this.pos])) this.pos++;
	}
	fail(expected) {
		const near = this.text.slice(this.pos, this.pos + 40);
		throw cannotParseText(`Cannot parse input: expected ${expected} before: '${near}'`);
	}
	value() {
		this.skipWhitespace();
		const char = this.text[this.pos];
		if (char === void 0) this.fail("a value");
		if (char === "{") return this.object();
		if (char === "[") return this.array();
		if (char === "\"") return this.string();
		const literal = /^(true|false|null)\b/.exec(this.text.slice(this.pos, this.pos + 5));
		if (literal) {
			this.pos += literal[1].length;
			return LITERALS[literal[1]];
		}
		return this.number();
	}
	object() {
		const object = {};
		this.pos++;
		while (true) {
			this.skipWhitespace();
			if (this.text[this.pos] === "}") {
				this.pos++;
				return object;
			}
			if (this.text[this.pos] !== "\"") this.fail("'\"'");
			const key = this.string();
			this.skipWhitespace();
			if (this.text[this.pos] !== ":") this.fail("':'");
			this.pos++;
			object[key] = this.value();
			this.skipWhitespace();
			if (this.text[this.pos] === ",") this.pos++;
			else if (this.text[this.pos] !== "}") this.fail("',' or '}'");
		}
	}
	array() {
		const items = [];
		this.pos++;
		while (true) {
			this.skipWhitespace();
			if (this.text[this.pos] === "]") {
				this.pos++;
				return items;
			}
			items.push(this.value());
			this.skipWhitespace();
			if (this.text[this.pos] === ",") this.pos++;
			else if (this.text[this.pos] !== "]") this.fail("',' or ']'");
		}
	}
	string() {
		const start = this.pos;
		this.pos++;
		while (this.pos < this.text.length) {
			const char = this.text[this.pos];
			if (char === "\\") this.pos += 2;
			else if (char === "\"") {
				this.pos++;
				return JSON.parse(this.text.slice(start, this.pos));
			} else this.pos++;
		}
		this.fail("'\"'");
	}
	number() {
		const match = /^-?(?:0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(this.text.slice(this.pos));
		if (!match) this.fail("a value");
		this.pos += match[0].length;
		if (!match[1] && !match[2] && match[0].replace("-", "").length > 15) {
			const big = BigInt(match[0]);
			return big >= BigInt(Number.MIN_SAFE_INTEGER) && big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big;
		}
		return Number(match[0]);
	}
};
//#endregion
//#region src/memory/input.ts
const jsonRows = (data, objects) => {
	const values = parseJsonSequence(data);
	if (objects && values.length === 1 && Array.isArray(values[0])) return values[0];
	return values;
};
const splitLines = (data) => data.split("\n").filter((line, index, lines) => line !== "" || index < lines.length - 1).filter((line) => line !== "");
const tsvField = (text) => text === "\\N" ? null : unescape(text);
const csvRows = (data) => {
	const rows = [];
	let row = [];
	let field = "";
	let quoted = false;
	let wasQuoted = false;
	for (let i = 0; i < data.length; i++) {
		const char = data[i];
		if (quoted) {
			if (char === "\"" && data[i + 1] === "\"") {
				field += "\"";
				i++;
			} else if (char === "\"") quoted = false;
			else field += char;
			continue;
		}
		if (char === "\"" && field === "") {
			quoted = true;
			wasQuoted = true;
		} else if (char === ",") {
			row.push(!wasQuoted && field === "\\N" ? null : field);
			field = "";
			wasQuoted = false;
		} else if (char === "\n" || char === "\r") {
			if (char === "\r" && data[i + 1] === "\n") i++;
			row.push(!wasQuoted && field === "\\N" ? null : field);
			rows.push(row);
			row = [];
			field = "";
			wasQuoted = false;
		} else field += char;
	}
	if (field !== "" || row.length > 0) {
		row.push(!wasQuoted && field === "\\N" ? null : field);
		rows.push(row);
	}
	return rows;
};
const zip = (names, values) => Object.fromEntries(names.map((name, index) => [name, values[index]]));
const parseInput = (data, format, columns) => {
	const name = normalizeFormat(format);
	switch (name) {
		case "JSONEachRow":
		case "JSONStringsEachRow": return jsonRows(data, true).map((item) => {
			if (item === null || typeof item !== "object" || Array.isArray(item)) throw cannotParseText(`Cannot parse input: expected '{' before: ${JSON.stringify(item).slice(0, 40)}`);
			return {
				kind: "json",
				values: item
			};
		});
		case "JSONCompactEachRow":
		case "JSONCompactStringsEachRow":
		case "JSONCompactEachRowWithNames":
		case "JSONCompactEachRowWithNamesAndTypes": {
			let rows = jsonRows(data, false).map((row) => {
				if (!Array.isArray(row)) throw cannotParseText(`Cannot parse input: expected '[' before: ${JSON.stringify(row).slice(0, 40)}`);
				return row;
			});
			let names = columns;
			if (name !== "JSONCompactEachRow" && name !== "JSONCompactStringsEachRow") {
				names = rows[0];
				rows = rows.slice(name === "JSONCompactEachRowWithNamesAndTypes" ? 2 : 1);
			}
			return rows.map((row) => ({
				kind: "json",
				values: zip(names, row)
			}));
		}
		case "JSON":
		case "JSONCompact": {
			const parsed = parseJsonSequence(data)[0] ?? {};
			const names = parsed.meta?.map((column) => column.name) ?? columns;
			return (parsed.data ?? []).map((row) => ({
				kind: "json",
				values: Array.isArray(row) ? zip(names, row) : row
			}));
		}
		case "TabSeparated":
		case "TabSeparatedRaw":
		case "TabSeparatedWithNames":
		case "TabSeparatedWithNamesAndTypes": {
			let lines = splitLines(data);
			let names = columns;
			if (name === "TabSeparatedWithNames" || name === "TabSeparatedWithNamesAndTypes") {
				names = lines[0].split("	").map((field) => unescape(field));
				lines = lines.slice(name === "TabSeparatedWithNamesAndTypes" ? 2 : 1);
			}
			return lines.map((line) => ({
				kind: "text",
				values: zip(names, line.split("	").map((field) => name === "TabSeparatedRaw" ? field : tsvField(field)))
			}));
		}
		case "CSV":
		case "CSVWithNames":
		case "CSVWithNamesAndTypes": {
			let rows = csvRows(data);
			let names = columns;
			if (name !== "CSV") {
				names = rows[0].map((field) => field ?? "");
				rows = rows.slice(name === "CSVWithNamesAndTypes" ? 2 : 1);
			}
			return rows.map((row) => ({
				kind: "text",
				values: zip(names, row)
			}));
		}
		case "Values": {
			const trimmed = data.trim();
			if (trimmed === "") return [];
			return parseLiteralText(`[${trimmed.replace(/;\s*$/, "")}]`).map((row) => {
				const values = row && typeof row === "object" && "items" in row ? row.items : [row];
				return {
					kind: "value",
					values: zip(columns, values)
				};
			});
		}
	}
	throw unknownFormat(`Input format ${format} is not supported by the in-memory ClickHouse`);
};
//#endregion
//#region src/memory/system.ts
const columns = (spec) => {
	return spec.split(",").map((part) => {
		const [name, ...type] = part.trim().split(" ");
		return {
			name,
			type: parseType(type.join(" "))
		};
	});
};
const SETTINGS = [
	[
		"date_time_input_format",
		"best_effort",
		"String"
	],
	[
		"date_time_output_format",
		"simple",
		"String"
	],
	[
		"output_format_json_quote_64bit_integers",
		false,
		"Bool"
	],
	[
		"output_format_json_quote_denormals",
		false,
		"Bool"
	],
	[
		"output_format_json_escape_forward_slashes",
		true,
		"Bool"
	],
	[
		"input_format_skip_unknown_fields",
		true,
		"Bool"
	],
	[
		"join_use_nulls",
		false,
		"Bool"
	],
	[
		"async_insert",
		false,
		"Bool"
	],
	[
		"wait_for_async_insert",
		true,
		"Bool"
	],
	[
		"max_result_rows",
		0,
		"UInt64"
	],
	[
		"max_threads",
		0,
		"UInt64"
	],
	[
		"enable_positional_arguments",
		true,
		"Bool"
	],
	[
		"session_timezone",
		"",
		"String"
	]
];
const defaultSetting = (name) => SETTINGS.find(([setting]) => setting === name)?.[1];
const systemTable = (name, catalog, ctx) => {
	const tables = catalog.tables();
	switch (name) {
		case "one": return {
			columns: columns("dummy UInt8"),
			rows: [[0]]
		};
		case "databases":
		case "schemata": return {
			columns: columns("name String, engine String, data_path String, metadata_path String, uuid UUID, comment String"),
			rows: [...catalog.databases.keys(), "system"].map((database) => [
				database,
				database === "system" ? "Memory" : "Atomic",
				"",
				"",
				"00000000-0000-0000-0000-000000000000",
				""
			])
		};
		case "tables": return {
			columns: columns("database String, name String, uuid UUID, engine String, is_temporary UInt8, metadata_modification_time DateTime, create_table_query String, engine_full String, partition_key String, sorting_key String, primary_key String, sampling_key String, storage_policy String, total_rows Nullable(UInt64), total_bytes Nullable(UInt64), comment String"),
			rows: tables.map((table) => [
				table.database,
				table.name,
				"00000000-0000-0000-0000-000000000000",
				table.engine.name,
				0,
				new DateTimeValue(Math.floor(table.modifiedAt / 1e3) * 1e3, 0),
				createTableQuery(table),
				engineText(table),
				partitionKey(table),
				sortingKey(table),
				primaryKey(table),
				"",
				"default",
				table.rows.length,
				0,
				table.comment
			])
		};
		case "columns": return {
			columns: columns("database String, table String, name String, type String, position UInt64, default_kind String, default_expression String, data_compressed_bytes UInt64, data_uncompressed_bytes UInt64, marks_bytes UInt64, comment String, is_in_partition_key UInt8, is_in_sorting_key UInt8, is_in_primary_key UInt8, is_in_sampling_key UInt8, compression_codec String"),
			rows: tables.flatMap((table) => {
				const sorting = table.orderBy.map((expr) => sql(expr));
				const primary = (table.primaryKey ?? table.orderBy).map((expr) => sql(expr));
				const partition = table.partitionBy ? sql(table.partitionBy) : "";
				return table.columns.map((column, index) => [
					table.database,
					table.name,
					column.name,
					formatType(column.type),
					index + 1,
					column.defaultKind ?? "",
					column.defaultExpr ? sql(column.defaultExpr) : "",
					0,
					0,
					0,
					column.comment,
					partition.includes(column.name) ? 1 : 0,
					sorting.includes(column.name) ? 1 : 0,
					primary.includes(column.name) ? 1 : 0,
					0,
					column.codec ? `CODEC(${column.codec})` : ""
				]);
			})
		};
		case "data_skipping_indices": return {
			columns: columns("database String, table String, name String, type String, type_full String, expr String, granularity UInt64"),
			rows: tables.flatMap((table) => table.indexes.map((index) => [
				table.database,
				table.name,
				index.name,
				index.type.replace(/\(.*$/, ""),
				index.type,
				sql(index.expr),
				index.granularity
			]))
		};
		case "parts": return {
			columns: columns("database String, table String, name String, partition String, active UInt8, rows UInt64, bytes_on_disk UInt64, modification_time DateTime"),
			rows: tables.filter((table) => table.rows.length > 0).map((table) => [
				table.database,
				table.name,
				"all_1_1_0",
				"tuple()",
				1,
				table.rows.length,
				0,
				new DateTimeValue(Math.floor(table.modifiedAt / 1e3) * 1e3, 0)
			])
		};
		case "mutations": return {
			columns: columns("database String, table String, mutation_id String, command String, create_time DateTime, parts_to_do UInt64, is_done UInt8, latest_fail_reason String"),
			rows: catalog.mutations.map((mutation) => [
				mutation.database,
				mutation.table,
				mutation.id,
				mutation.command,
				new DateTimeValue(Math.floor(mutation.createdAt / 1e3) * 1e3, 0),
				0,
				1,
				""
			])
		};
		case "settings": return {
			columns: columns("name String, value String, changed UInt8, type String"),
			rows: SETTINGS.map(([setting, value, type]) => {
				const current = ctx.fn.settings[setting] ?? value;
				return [
					setting,
					String(current),
					current === value ? 0 : 1,
					type
				];
			})
		};
		case "functions": return {
			columns: columns("name String, is_aggregate UInt8, case_insensitive UInt8"),
			rows: [...functionNames().map((fn) => [
				fn,
				0,
				0
			]), ...aggregateNames().map((fn) => [
				fn,
				1,
				0
			])]
		};
		case "time_zones": return {
			columns: columns("time_zone String"),
			rows: Intl.supportedValuesOf("timeZone").map((zone) => [zone])
		};
		case "build_options": return {
			columns: columns("name String, value String"),
			rows: [["VERSION_FULL", "ClickHouse 26.8.33.10 (in-memory)"]]
		};
		case "processes":
		case "replicas":
		case "query_log":
		case "errors": return {
			columns: columns("query_id String, query String"),
			rows: []
		};
	}
};
//#endregion
//#region src/memory/select.ts
const lookupOf = (columns) => {
	const lookup = /* @__PURE__ */ new Map();
	columns.forEach((column, index) => {
		for (const qualifier of column.qualifiers) {
			const key = `${qualifier}.${column.name}`;
			if (!lookup.has(key)) lookup.set(key, index);
		}
	});
	columns.forEach((column, index) => {
		if (!lookup.has(column.name)) lookup.set(column.name, index);
	});
	return lookup;
};
const scopeOf = (frame, ctx, aliases, outer) => ({
	query: ctx,
	columns: lookupOf(frame.columns),
	types: frame.columns.map((column) => column.type),
	row: [],
	aliases,
	outer
});
const tableFrame = (table, qualifiers, final, ctx) => {
	const visible = table.columns.filter((column) => column.defaultKind !== "EPHEMERAL");
	const frame = {
		columns: visible.map((column) => ({
			name: column.name,
			qualifiers,
			type: column.type,
			hidden: column.defaultKind === "MATERIALIZED" || column.defaultKind === "ALIAS"
		})),
		rows: []
	};
	let rows = table.rows;
	if (final) rows = finalRows(table, ctx);
	const aliasColumns = visible.map((column, index) => column.defaultKind === "ALIAS" ? index : -1).filter((index) => index !== -1);
	frame.rows = rows.map((row) => visible.map((column) => row[column.name] ?? null));
	if (aliasColumns.length > 0) {
		const scope = scopeOf(frame, ctx, /* @__PURE__ */ new Map());
		for (const values of frame.rows) for (const index of aliasColumns) {
			const column = visible[index];
			values[index] = evaluate(column.defaultExpr, withRow(scope, values));
		}
	}
	return frame;
};
const finalRows = (table, ctx) => {
	const engine = table.engine.name;
	if (engine === "MergeTree" || !/MergeTree$/.test(engine)) throw illegalFinal(`Storage ${engine} doesn't support FINAL`);
	const frame = {
		columns: table.columns.map((column) => ({
			name: column.name,
			qualifiers: [],
			type: column.type
		})),
		rows: []
	};
	const scope = scopeOf(frame, ctx, /* @__PURE__ */ new Map());
	const keyOf = (row) => {
		const values = table.columns.map((column) => row[column.name] ?? null);
		return table.orderBy.map((expr) => valueKey(evaluate(expr, withRow(scope, values)))).join("|");
	};
	const groups = /* @__PURE__ */ new Map();
	for (const row of table.rows) {
		const key = keyOf(row);
		const group = groups.get(key) ?? [];
		group.push(row);
		groups.set(key, group);
	}
	if (engine === "ReplacingMergeTree") {
		const [version, deleted] = table.engine.args.map((arg) => arg.kind === "identifier" ? arg.parts.join(".") : void 0);
		return [...groups.values()].map((group) => {
			let best = group[0];
			for (const row of group) if (!version || compareValues(row[version] ?? null, best[version] ?? null) >= 0) best = row;
			return best;
		}).filter((row) => !deleted || !row[deleted]);
	}
	if (engine === "SummingMergeTree") {
		const keyColumns = new Set(table.orderBy.flatMap((expr) => expr.kind === "identifier" ? [expr.parts.join(".")] : []));
		return [...groups.values()].map((group) => {
			const merged = { ...group[0] };
			for (const column of table.columns) {
				if (keyColumns.has(column.name)) continue;
				const values = group.map((row) => row[column.name]);
				if (values.every((value) => typeof value === "number" || typeof value === "bigint")) merged[column.name] = values.reduce((sum, value) => sum + toNumber(value), 0);
			}
			return merged;
		});
	}
	throw notImplemented(`FINAL for ${engine} is not supported by the in-memory ClickHouse`);
};
const tableFunctionFrame = (source, ctx, outer) => {
	const scope = {
		query: ctx,
		columns: /* @__PURE__ */ new Map(),
		types: [],
		row: [],
		aliases: /* @__PURE__ */ new Map(),
		outer
	};
	const args = source.args.map((arg) => evaluate(arg, scope));
	const qualifiers = source.alias ? [source.alias] : [];
	switch (source.name) {
		case "numbers":
		case "numbers_mt": {
			const [start, count] = args.length === 1 ? [0, toNumber(args[0])] : [toNumber(args[0]), toNumber(args[1])];
			if (count > 1e7) throw badArguments("numbers() in the in-memory ClickHouse is limited to 10 million rows");
			return {
				columns: [{
					name: "number",
					qualifiers,
					type: parseType("UInt64")
				}],
				rows: Array.from({ length: count }, (_, index) => [start + index])
			};
		}
		case "zeros":
		case "zeros_mt": return {
			columns: [{
				name: "zero",
				qualifiers,
				type: parseType("UInt8")
			}],
			rows: Array.from({ length: toNumber(args[0]) }, () => [0])
		};
		case "generate_series":
		case "generateSeries": {
			const [start, stop, step = 1] = args.map(toNumber);
			const rows = [];
			for (let value = start; value <= stop; value += step) rows.push([value]);
			return {
				columns: [{
					name: "generate_series",
					qualifiers,
					type: parseType("UInt64")
				}],
				rows
			};
		}
		case "values": {
			const structure = typeof args[0] === "string" && source.args[0]?.kind === "literal" && /\s/.test(args[0]) ? args[0] : void 0;
			const values = structure ? args.slice(1) : args;
			const types = structure ? structure.split(",").map((part) => {
				const [name, ...type] = part.trim().split(/\s+/);
				return {
					name,
					type: parseType(type.join(" "))
				};
			}) : void 0;
			const rows = values.map((value) => value && typeof value === "object" && "items" in value ? value.items : [value]);
			const width = rows[0]?.length ?? 0;
			return {
				columns: (types ?? Array.from({ length: width }, (_, index) => ({
					name: `c${index + 1}`,
					type: void 0
				}))).map((column) => ({
					name: column.name,
					qualifiers,
					type: column.type
				})),
				rows
			};
		}
	}
	throw unknownFunction(`Unknown table function ${source.name}`);
};
const sourceFrame = (source, executor, ctx, ctes, outer) => {
	if (source.kind === "subquery") {
		const result = runQuery(source.query, executor, ctx, outer, ctes);
		return {
			columns: result.columns.map((column) => ({
				name: column.name,
				qualifiers: source.alias ? [source.alias] : [],
				type: column.type
			})),
			rows: result.rows
		};
	}
	if (source.kind === "function") return tableFunctionFrame(source, ctx, outer);
	const param = source.param;
	const name = param ? ctx.params[param] ?? "" : source.name;
	const [database, table] = param && name.includes(".") ? name.split(".", 2) : [source.database ?? executor.database, name];
	if (!source.database && !param && ctes.has(table)) {
		const result = runQuery(ctes.get(table), executor, ctx, outer, ctes);
		return {
			columns: result.columns.map((column) => ({
				name: column.name,
				qualifiers: [source.alias ?? table],
				type: column.type
			})),
			rows: result.rows
		};
	}
	if (database === "system" || database === "information_schema" || database === "INFORMATION_SCHEMA") {
		const system = systemTable(table, executor.catalog, ctx);
		if (!system) throw unknownTable(`Unknown table expression identifier '${database}.${table}' in scope ${ctx.text}`);
		return {
			columns: system.columns.map((column) => ({
				name: column.name,
				qualifiers: source.alias ? [source.alias] : [table, `${database}.${table}`],
				type: column.type
			})),
			rows: system.rows
		};
	}
	const found = executor.catalog.get(database, table, ctx.text);
	const qualifiers = source.alias ? [source.alias] : [table, `${database}.${table}`];
	return tableFrame(found, qualifiers, source.final, ctx);
};
const defaultsFor = (columns) => columns.map((column) => column.type ? isNullable(column.type) ? null : defaultValue(column.type) : null);
const sideOf = (expr, left, right) => {
	if (expr.kind === "identifier") {
		const name = expr.parts.join(".");
		const inLeft = left.has(name);
		const inRight = right.has(name);
		if (inLeft && !inRight) return "left";
		if (inRight && !inLeft) return "right";
		return inLeft ? "left" : "none";
	}
	if (expr.kind === "function") {
		const sides = new Set(expr.args.map((arg) => sideOf(arg, left, right)).filter((side) => side !== "none"));
		if (sides.size === 0) return "none";
		if (sides.size === 1) return [...sides][0];
		return "both";
	}
	return "none";
};
const conjuncts = (expr) => expr.kind === "function" && expr.name === "and" ? expr.args.flatMap(conjuncts) : [expr];
const joinFrames = (left, right, join, ctx, aliases) => {
	const rightColumns = right.columns.map((column) => {
		return left.columns.some((other) => other.name === column.name) ? {
			...column,
			name: column.qualifiers[0] ? column.name : column.name,
			renamed: true
		} : column;
	});
	const using = join.using ?? [];
	const usingRight = new Set(using.map((name) => right.columns.findIndex((column) => column.name === name)));
	const usingLeft = using.map((name) => left.columns.findIndex((column) => column.name === name));
	for (const [index, name] of using.entries()) if (usingLeft[index] === -1 || [...usingRight][index] === -1) throw new ClickHouseException(47, "UNKNOWN_IDENTIFIER", `Cannot find column ${name} in the USING clause`);
	const keptRight = rightColumns.map((_, index) => index).filter((index) => !usingRight.has(index));
	const columns = [...left.columns, ...keptRight.map((index) => rightColumns[index])];
	const combined = (l, r) => [...l, ...keptRight.map((index) => r[index])];
	const leftDefaults = defaultsFor(left.columns);
	const rightDefaults = defaultsFor(right.columns);
	const rows = [];
	if (join.kind === "CROSS") {
		for (const l of left.rows) for (const r of right.rows) rows.push(combined(l, r));
		return {
			columns,
			rows
		};
	}
	const matches = /* @__PURE__ */ new Map();
	const leftScope = scopeOf(left, ctx, aliases);
	const rightScope = scopeOf(right, ctx, aliases);
	if (using.length > 0) {
		const index = /* @__PURE__ */ new Map();
		right.rows.forEach((r, i) => {
			const values = [...usingRight].map((position) => r[position]);
			if (values.includes(null)) return;
			const key = values.map(valueKey).join("|");
			index.set(key, [...index.get(key) ?? [], i]);
		});
		left.rows.forEach((l, i) => {
			const values = usingLeft.map((position) => l[position]);
			matches.set(i, values.includes(null) ? [] : index.get(values.map(valueKey).join("|")) ?? []);
		});
	} else if (join.on) {
		const equalities = conjuncts(join.on).map((part) => {
			if (part.kind !== "function" || part.name !== "equals") return void 0;
			const [a, b] = part.args;
			const sideA = sideOf(a, leftScope.columns, rightScope.columns);
			const sideB = sideOf(b, leftScope.columns, rightScope.columns);
			if (sideA === "left" && sideB === "right") return {
				left: a,
				right: b
			};
			if (sideA === "right" && sideB === "left") return {
				left: b,
				right: a
			};
		});
		if (equalities.every(Boolean) && equalities.length > 0) {
			const index = /* @__PURE__ */ new Map();
			right.rows.forEach((r, i) => {
				const scope = withRow(rightScope, r);
				const values = equalities.map((eq) => evaluate(eq.right, scope));
				if (values.includes(null)) return;
				const key = values.map(valueKey).join("|");
				index.set(key, [...index.get(key) ?? [], i]);
			});
			left.rows.forEach((l, i) => {
				const scope = withRow(leftScope, l);
				const values = equalities.map((eq) => evaluate(eq.left, scope));
				matches.set(i, values.includes(null) ? [] : index.get(values.map(valueKey).join("|")) ?? []);
			});
		} else {
			const pairScope = scopeOf({
				columns: [...left.columns, ...rightColumns],
				rows: []
			}, ctx, aliases);
			left.rows.forEach((l, i) => {
				matches.set(i, right.rows.map((_, j) => j).filter((j) => evaluateBoolean(join.on, withRow(pairScope, [...l, ...right.rows[j]]))));
			});
		}
	} else throw badArguments("A JOIN needs an ON or USING clause");
	const matchedRight = /* @__PURE__ */ new Set();
	left.rows.forEach((l, i) => {
		let found = matches.get(i) ?? [];
		if (join.strictness === "ANY") found = found.slice(0, 1);
		for (const j of found) {
			matchedRight.add(j);
			rows.push(combined(l, right.rows[j]));
		}
		if (found.length === 0 && (join.kind === "LEFT" || join.kind === "FULL")) rows.push(combined(l, rightDefaults));
	});
	if (join.kind === "RIGHT" || join.kind === "FULL") right.rows.forEach((r, j) => {
		if (matchedRight.has(j)) return;
		const l = [...leftDefaults];
		using.forEach((_, index) => {
			l[usingLeft[index]] = r[[...usingRight][index]];
		});
		rows.push(combined(l, r));
	});
	return {
		columns,
		rows
	};
};
const expandAsterisks = (columns, frame) => {
	return columns.flatMap((expr) => {
		if (expr.kind !== "asterisk") return [expr];
		const wanted = frame.columns.filter((column) => !column.hidden && (!expr.table || column.qualifiers.includes(expr.table)) && !expr.except?.includes(column.name));
		const seen = /* @__PURE__ */ new Set();
		return wanted.map((column) => {
			const duplicate = seen.has(column.name);
			seen.add(column.name);
			const qualifier = column.qualifiers[0];
			if (duplicate && qualifier) return {
				kind: "identifier",
				parts: [qualifier, column.name],
				alias: `${qualifier}.${column.name}`
			};
			return {
				kind: "identifier",
				parts: [column.name]
			};
		});
	});
};
const positional = (expr, columns) => {
	if (expr.kind === "literal" && typeof expr.value === "number" && Number.isInteger(expr.value) && !expr.alias) {
		const column = columns[expr.value - 1];
		if (!column) throw badArguments(`Positional argument out of bounds: ${expr.value}`);
		return column.alias ? {
			kind: "identifier",
			parts: [column.alias]
		} : column;
	}
	return expr;
};
const findArrayJoins = (expr, found = []) => {
	if (expr.kind === "function") {
		if (expr.name === "arrayJoin") {
			found.push(expr);
			return found;
		}
		expr.args.forEach((arg) => findArrayJoins(arg, found));
	}
	return found;
};
const compareRows = (a, b, directions) => {
	for (let i = 0; i < directions.length; i++) {
		const { direction, nulls = "LAST" } = directions[i];
		const x = a[i];
		const y = b[i];
		const xNull = x === null;
		const yNull = y === null;
		const xNaN = typeof x === "number" && Number.isNaN(x);
		const yNaN = typeof y === "number" && Number.isNaN(y);
		const rank = (isNull, isNaN) => isNull ? 2 : isNaN ? 1 : 0;
		const rx = rank(xNull, xNaN);
		const ry = rank(yNull, yNaN);
		if (rx !== ry) return nulls === "FIRST" ? ry - rx : rx - ry;
		if (rx !== 0) continue;
		const result = compareValues(x, y);
		if (result !== 0) return direction === "DESC" ? -result : result;
	}
	return 0;
};
const runSelect = (select, executor, ctx, outer, parentCtes) => {
	const ctes = new Map(parentCtes);
	const aliases = /* @__PURE__ */ new Map();
	for (const item of select.with) if (item.query) ctes.set(item.name, item.query);
	else aliases.set(item.name, item.expr);
	let frame = select.from ? sourceFrame(select.from, executor, ctx, ctes, outer) : {
		columns: [{
			name: "dummy",
			qualifiers: ["system.one", "one"],
			type: parseType("UInt8")
		}],
		rows: [[0]]
	};
	for (const item of select.columns) if (item.alias) aliases.set(item.alias, item);
	for (const join of select.joins) frame = joinFrames(frame, sourceFrame(join.source, executor, ctx, ctes, outer), join, ctx, aliases);
	const columns = expandAsterisks(select.columns, frame);
	for (const item of columns) if (item.alias) aliases.set(item.alias, item);
	if (select.arrayJoin) {
		frame = arrayJoinFrame(frame, select.arrayJoin, ctx, aliases, outer);
		for (const expr of select.arrayJoin.exprs) if (expr.alias) aliases.delete(expr.alias);
	}
	const scope = scopeOf(frame, ctx, aliases, outer);
	let rows = frame.rows.map((values) => ({ values }));
	const arrayJoins = columns.flatMap((column) => findArrayJoins(column));
	if (arrayJoins.length > 0) rows = rows.flatMap((row) => {
		const rowScope = withRow(scope, row.values);
		let combinations = [/* @__PURE__ */ new Map()];
		for (const call of arrayJoins) {
			const array = evaluate(call.args[0], {
				...rowScope,
				arrayJoins: void 0
			});
			if (!Array.isArray(array)) throw new ClickHouseException(43, "ILLEGAL_TYPE_OF_ARGUMENT", "Argument for function arrayJoin must be Array");
			combinations = combinations.flatMap((combination) => array.map((item) => new Map([...combination, [call, item]])));
		}
		return combinations.map((joins) => ({
			values: row.values,
			joins
		}));
	});
	const rowScope = (row) => ({
		...scope,
		row: row.values,
		aliasValues: void 0,
		resolving: void 0,
		arrayJoins: row.joins
	});
	const shared = { ...scope };
	const reuse = (row) => {
		shared.row = row.values;
		shared.arrayJoins = row.joins;
		shared.aliasValues = void 0;
		return shared;
	};
	if (select.prewhere) rows = rows.filter((row) => evaluateBoolean(select.prewhere, reuse(row)));
	if (select.where) rows = rows.filter((row) => evaluateBoolean(select.where, reuse(row)));
	const orderBy = select.orderBy.flatMap((item) => {
		if (item.expr.kind === "asterisk") return columns.map((column) => ({
			...item,
			expr: column.alias ? {
				kind: "identifier",
				parts: [column.alias]
			} : column
		}));
		return [{
			...item,
			expr: positional(item.expr, columns)
		}];
	});
	const groupBy = select.groupBy.length === 1 && select.groupBy[0].kind === "asterisk" ? columns.filter((column) => !containsAggregate(column)) : select.groupBy.map((expr) => positional(expr, columns));
	const aggregating = groupBy.length > 0 || columns.some(containsAggregate) || select.having !== void 0 && containsAggregate(select.having) || orderBy.some((item) => containsAggregate(item.expr));
	let outputs;
	if (aggregating) {
		const aggregates = [
			...columns,
			...select.having ? [select.having] : [],
			...orderBy.map((item) => item.expr),
			...aliases.values()
		].flatMap((expr) => collectAggregates(expr)).filter((expr, index, all) => all.indexOf(expr) === index);
		const groups = /* @__PURE__ */ new Map();
		const newGroup = (keys) => ({
			keys,
			accumulators: aggregates.map((expr) => {
				const call = expr;
				const params = (call.params ?? []).map((param) => evaluate(param, scope));
				const nullable = call.args.some((arg) => {
					const type = inferType(arg, scope);
					return type !== void 0 && isNullable(type);
				});
				return createAccumulator(call.distinct && call.name === "count" ? "uniqExact" : call.name, params, call.args.length, call.distinct === true && call.name !== "count", nullable);
			})
		});
		for (const row of rows) {
			const current = reuse(row);
			const keys = groupBy.map((expr) => evaluate(expr, current));
			const id = keys.length === 1 ? valueKey(keys[0]) : keys.map(valueKey).join("\0");
			let group = groups.get(id);
			if (!group) {
				group = newGroup(keys);
				groups.set(id, group);
			}
			aggregates.forEach((expr, index) => {
				const call = expr;
				group.accumulators[index].add(call.args.map((arg) => evaluate(arg, current)));
			});
		}
		if (groups.size === 0 && groupBy.length === 0) groups.set("", newGroup([]));
		const keyNames = groupBy.map((expr) => {
			const names = /* @__PURE__ */ new Set([columnName(expr)]);
			if (expr.kind === "identifier") {
				const name = expr.parts.join(".");
				const alias = aliases.get(name);
				if (alias && expr.parts.length === 1) names.add(columnName({
					...alias,
					alias: void 0
				}));
				const index = scope.columns.get(name);
				if (index !== void 0) {
					for (const [key, position] of scope.columns) if (position === index) names.add(key);
				}
			}
			for (const column of columns) if (column.alias && columnName({
				...column,
				alias: void 0
			}) === columnName(expr)) names.add(column.alias);
			return [...names];
		});
		outputs = [];
		for (const group of groups.values()) {
			const keys = /* @__PURE__ */ new Map();
			keyNames.forEach((names, index) => names.forEach((name) => keys.set(name, group.keys[index])));
			const results = /* @__PURE__ */ new Map();
			aggregates.forEach((expr, index) => {
				let value = group.accumulators[index].result();
				if (value === null) {
					const type = inferType(expr, scope);
					if (type && !isNullable(type)) value = defaultValue(type);
				}
				results.set(expr, value);
			});
			const groupScope = {
				...scope,
				row: [],
				group: {
					keys,
					aggregates: results
				}
			};
			if (select.having && !evaluateBoolean(select.having, groupScope)) continue;
			outputs.push({
				scope: groupScope,
				values: columns.map((column) => evaluate(column, groupScope))
			});
		}
	} else {
		if (select.having) throw new ClickHouseException(215, "NOT_AN_AGGREGATE", "HAVING without aggregation or GROUP BY");
		outputs = rows.map((row) => {
			const current = rowScope(row);
			return {
				scope: current,
				values: columns.map((column) => evaluate(column, current))
			};
		});
	}
	if (orderBy.length > 0) {
		const keyed = outputs.map((output, index) => ({
			output,
			index,
			keys: orderBy.map((item) => evaluate(item.expr, output.scope))
		}));
		keyed.sort((a, b) => compareRows(a.keys, b.keys, orderBy) || a.index - b.index);
		outputs = keyed.map((entry) => entry.output);
	}
	if (select.distinct) {
		const seen = /* @__PURE__ */ new Set();
		outputs = outputs.filter((output) => {
			const key = output.values.map(valueKey).join("\0");
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}
	if (select.limitBy) {
		const { limit, offset, exprs } = select.limitBy;
		const counts = /* @__PURE__ */ new Map();
		outputs = outputs.filter((output) => {
			const key = exprs.map((expr) => valueKey(evaluate(positional(expr, columns), output.scope))).join("\0");
			const count = counts.get(key) ?? 0;
			counts.set(key, count + 1);
			return count >= offset && count < offset + limit;
		});
	}
	const offset = select.offset ?? 0;
	outputs = outputs.slice(offset, select.limit === void 0 ? void 0 : offset + select.limit);
	const outputName = (column) => {
		if (column.alias) return column.alias;
		if (column.kind === "identifier" && column.parts.length > 1) {
			const index = scope.columns.get(column.parts.join("."));
			const found = index === void 0 ? void 0 : frame.columns[index];
			if (found && found.qualifiers.includes(column.parts.slice(0, -1).join("."))) return found.name;
		}
		return columnName(column);
	};
	return {
		columns: columns.map((column) => ({
			name: outputName(column),
			type: inferType(column, scope)
		})),
		rows: outputs.map((output) => output.values)
	};
};
const arrayJoinFrame = (frame, arrayJoin, ctx, aliases, outer) => {
	const scope = scopeOf(frame, ctx, aliases, outer);
	const added = arrayJoin.exprs.map((expr) => {
		const name = expr.alias ?? (expr.kind === "identifier" ? expr.parts.at(-1) : columnName(expr));
		const type = inferType(expr, scope);
		return {
			name,
			type: type?.name === "Array" ? type.inner : void 0
		};
	});
	const columns = [...added.map((column) => ({
		name: column.name,
		qualifiers: [],
		type: column.type
	})), ...frame.columns.map((column) => added.some((item) => item.name === column.name) && !arrayJoin.exprs.some((expr) => expr.alias === column.name) ? {
		...column,
		name: `\u0000${column.name}`
	} : column)];
	const rows = [];
	for (const values of frame.rows) {
		const rowScope = withRow(scope, values);
		const arrays = arrayJoin.exprs.map((expr) => evaluate({
			...expr,
			alias: void 0
		}, rowScope));
		for (const array of arrays) if (!Array.isArray(array)) throw new ClickHouseException(53, "TYPE_MISMATCH", "ARRAY JOIN requires array argument");
		if (new Set(arrays.map((array) => array.length)).size > 1) throw new ClickHouseException(190, "SIZES_OF_ARRAYS_DONT_MATCH", "Sizes of ARRAY-JOIN-ed arrays do not match");
		const length = arrays[0].length;
		if (length === 0 && arrayJoin.left) rows.push([...added.map((column) => column.type ? defaultValue(column.type) : null), ...values]);
		for (let i = 0; i < length; i++) rows.push([...arrays.map((array) => array[i]), ...values]);
	}
	return {
		columns,
		rows
	};
};
const runQuery = (query, executor, ctx, outer, ctes = /* @__PURE__ */ new Map()) => {
	const results = query.selects.map((select) => runSelect(select, executor, ctx, outer, ctes));
	const [first] = results;
	for (const result of results.slice(1)) if (result.columns.length !== first.columns.length) throw new ClickHouseException(258, "UNION_ALL_RESULT_STRUCTURES_MISMATCH", "Different number of columns in UNION elements");
	let rows = first.rows;
	results.slice(1).forEach((result, index) => {
		rows = [...rows, ...result.rows];
		if (query.distinct[index]) {
			const seen = /* @__PURE__ */ new Set();
			rows = rows.filter((row) => {
				const key = row.map(valueKey).join("\0");
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
		}
	});
	return {
		columns: first.columns,
		rows
	};
};
//#endregion
//#region src/memory/engine.ts
const MERGE_TREE = /MergeTree$/;
const NON_DETERMINISTIC = /* @__PURE__ */ new Set([
	"now",
	"now64",
	"today",
	"yesterday",
	"rand",
	"rand32",
	"rand64",
	"randCanonical",
	"generateUUIDv4",
	"UUIDv4"
]);
const checkTtl = (expr) => {
	const visit = (node) => {
		if (node.kind !== "function") return;
		if (NON_DETERMINISTIC.has(node.name)) throw badArguments(`TTL expression cannot contain non-deterministic functions, but contains function ${node.name}`);
		node.args.forEach(visit);
	};
	if (expr) visit(expr);
};
const STORAGE_ENGINES = /* @__PURE__ */ new Set([
	"Memory",
	"Log",
	"TinyLog",
	"StripeLog",
	"Null",
	"Set"
]);
const INSERT_FORMAT = /^\s*INSERT\s+INTO\s+[\s\S]*?\bFORMAT\s+([A-Za-z]+)[ \t]*\r?\n?/i;
const literalText = (value) => {
	if (value === null) return "NULL";
	if (value instanceof DateTimeValue) return value.scale > 0 ? (value.ms / 1e3).toFixed(value.scale) : String(Math.floor(value.ms / 1e3));
	if (value instanceof DateValue) return String(value.days);
	if (typeof value === "string") return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
	if (Array.isArray(value)) return `[${value.map(literalText).join(", ")}]`;
	if (value instanceof TupleValue) return `(${value.items.map(literalText).join(", ")})`;
	return String(value);
};
const substitute = (node, params) => {
	if (Array.isArray(node)) return node.map((item) => substitute(item, params));
	if (node === null || typeof node !== "object") return node;
	const record = node;
	if (record.kind === "literal") return node;
	if (record.kind === "param") {
		const { name, type, alias } = record;
		const text = params[name];
		if (text === void 0) throw unknownQueryParameter(`Substitution \`${name}\` is not set`);
		if (type === "Identifier") return {
			kind: "identifier",
			parts: text.split("."),
			alias
		};
		const parsed = parseType(type);
		const value = parseParam(text, parsed);
		const formatted = formatType(parsed);
		if (formatted === "String") return {
			kind: "literal",
			value,
			text: literalText(value),
			alias
		};
		return {
			kind: "function",
			name: "_CAST",
			args: [{
				kind: "literal",
				value,
				text: literalText(value)
			}, {
				kind: "literal",
				value: formatted,
				text: literalText(formatted)
			}],
			alias
		};
	}
	if (record.kind !== "param" && typeof record.param === "string" && "name" in record) {
		const text = params[record.param];
		if (text === void 0) throw unknownQueryParameter(`Substitution \`${record.param}\` is not set`);
		const [database, name] = text.includes(".") ? text.split(".", 2) : [void 0, text];
		return {
			...record,
			param: void 0,
			database,
			name
		};
	}
	return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, substitute(value, params)]));
};
var Engine = class {
	catalog = new Catalog();
	mutationCount = 0;
	reset() {
		this.catalog.clear();
	}
	execute(text, options = {}) {
		const params = options.params ?? {};
		let data;
		let statementText = text;
		const insert = INSERT_FORMAT.exec(text);
		if (insert) {
			statementText = text.slice(0, insert.index + insert[0].length).trimEnd();
			data = text.slice(insert.index + insert[0].length);
		}
		if (statementText.trim() === "") throw emptyQuery("Empty query");
		const parsed = substitute(parseStatement(statementText), params);
		const settings = { ...options.settings };
		if ("settings" in parsed && !Array.isArray(parsed.settings)) Object.assign(settings, parsed.settings);
		const database = options.database ?? "default";
		const ctx = this.context(settings, params, database, parsed.kind === "query" ? parsed.text : statementText);
		if (parsed.kind === "insert" && parsed.format) parsed.data = [data ?? parsed.data ?? "", options.data ?? ""].filter(Boolean).join("\n");
		return this.run(parsed, ctx, database, settings);
	}
	context(settings, params, database, text) {
		const ctx = {
			fn: {
				now: Date.now(),
				serverTimeZone: "UTC",
				settings: new Proxy(settings, { get: (target, key) => target[key] ?? defaultSetting(key) }),
				database
			},
			params,
			text,
			subqueries: /* @__PURE__ */ new Map(),
			inferType,
			run: (query, outer) => runQuery(query, {
				catalog: this.catalog,
				database
			}, ctx, outer)
		};
		return ctx;
	}
	run(statement, ctx, database, settings) {
		const done = (writtenRows = 0, result, format) => ({
			result,
			format,
			settings,
			writtenRows,
			readRows: result?.rows.length ?? 0
		});
		const table = (name, db = database) => this.catalog.get(db, name, ctx.text);
		switch (statement.kind) {
			case "query": return done(0, runQuery(statement.query, {
				catalog: this.catalog,
				database
			}, ctx), statement.format);
			case "insert": return done(this.insert(table(statement.name, statement.database), statement, ctx, database));
			case "create-table":
				this.createTable(statement, ctx, database);
				return done();
			case "create-database":
				if (!this.catalog.databases.has(statement.name)) this.catalog.databases.set(statement.name, /* @__PURE__ */ new Map());
				else if (!statement.ifNotExists) throw new ClickHouseException(82, "DATABASE_ALREADY_EXISTS", `Database ${statement.name} already exists`);
				return done();
			case "drop-database":
				if (statement.name === "default") throw badArguments("Can't drop the default database");
				if (!this.catalog.databases.delete(statement.name) && !statement.ifExists) throw new ClickHouseException(81, "UNKNOWN_DATABASE", `Database ${statement.name} does not exist`);
				return done();
			case "drop-table":
				this.catalog.remove(statement.database ?? database, statement.name, statement.ifExists);
				return done();
			case "truncate": {
				const found = this.catalog.find(statement.database ?? database, statement.name);
				if (!found) {
					if (statement.ifExists) return done();
					table(statement.name, statement.database);
				}
				found.rows = [];
				found.modifiedAt = Date.now();
				return done();
			}
			case "rename-table": {
				const found = table(statement.from.name, statement.from.database);
				this.catalog.remove(found.database, found.name, false);
				found.database = statement.to.database ?? database;
				found.name = statement.to.name;
				this.catalog.add(found, false);
				return done();
			}
			case "alter": {
				const found = table(statement.name, statement.database);
				for (const action of statement.actions) this.alter(found, action, ctx);
				found.modifiedAt = Date.now();
				return done();
			}
			case "delete": {
				const found = table(statement.name, statement.database);
				this.deleteRows(found, statement.where, ctx);
				return done();
			}
			case "optimize": {
				const found = table(statement.name, statement.database);
				this.optimize(found, statement.final, ctx);
				return done();
			}
			case "exists": return done(0, {
				columns: [{
					name: "result",
					type: parseType("UInt8")
				}],
				rows: [[this.catalog.find(statement.database ?? database, statement.name) ? 1 : 0]]
			}, statement.format);
			case "show-tables": return done(0, {
				columns: [{
					name: "name",
					type: parseType("String")
				}],
				rows: [...this.catalog.database(database).keys()].sort().map((name) => [name])
			}, statement.format);
			case "show-create": {
				const found = table(statement.name, statement.database);
				return done(0, {
					columns: [{
						name: "statement",
						type: parseType("String")
					}],
					rows: [[createTableQuery(found)]]
				}, statement.format);
			}
			case "describe": {
				const found = table(statement.name, statement.database);
				return done(0, {
					columns: [
						"name",
						"type",
						"default_type",
						"default_expression",
						"comment",
						"codec_expression",
						"ttl_expression"
					].map((name) => ({
						name,
						type: parseType("String")
					})),
					rows: found.columns.map((column) => [
						column.name,
						formatType(column.type),
						column.defaultKind ?? "",
						column.defaultExpr ? sql(column.defaultExpr) : "",
						column.comment,
						column.codec ?? "",
						""
					])
				}, statement.format);
			}
			case "set":
			case "use": return done();
		}
	}
	frameOf(table) {
		return {
			columns: table.columns.map((column) => ({
				name: column.name,
				qualifiers: [table.name],
				type: column.type
			})),
			rows: []
		};
	}
	tableScope(table, ctx) {
		const frame = this.frameOf(table);
		const columns = /* @__PURE__ */ new Map();
		frame.columns.forEach((column, index) => {
			columns.set(column.name, index);
			columns.set(`${table.name}.${column.name}`, index);
		});
		return {
			query: ctx,
			columns,
			types: frame.columns.map((column) => column.type),
			row: [],
			aliases: /* @__PURE__ */ new Map()
		};
	}
	rowValues(table, row) {
		return table.columns.map((column) => row[column.name] ?? null);
	}
	createTable(statement, ctx, database) {
		let columns = statement.columns.map(toColumn);
		let rows = [];
		if (statement.as) {
			const result = runQuery(statement.as, {
				catalog: this.catalog,
				database
			}, ctx);
			if (columns.length === 0) columns = result.columns.map((column) => ({
				name: column.name,
				type: column.type ?? parseType("String"),
				comment: ""
			}));
			rows = result.rows;
		}
		const names = /* @__PURE__ */ new Set();
		for (const column of columns) {
			if (names.has(column.name)) throw duplicateColumn(`Column ${column.name} specified more than once`);
			names.add(column.name);
		}
		const engine = statement.engine;
		if (!MERGE_TREE.test(engine.name) && !STORAGE_ENGINES.has(engine.name)) throw notImplemented(`Table engine ${engine.name} is not supported by the in-memory ClickHouse`);
		const orderBy = statement.orderBy ?? statement.primaryKey;
		checkTtl(statement.ttl);
		if (MERGE_TREE.test(engine.name) && !orderBy) throw new ClickHouseException(42, "NUMBER_OF_ARGUMENTS_DOESNT_MATCH", `Storage ${engine.name} requires 3 to 4 parameters: ... ORDER BY or PRIMARY KEY clause is missing. Consider using extended storage definition syntax with ORDER BY or PRIMARY KEY clause. With deprecated old syntax (highly not recommended) storage MergeTree requires 3 to 4 parameters`);
		const table = {
			database: statement.database ?? database,
			name: statement.name,
			columns,
			indexes: statement.indexes,
			engine,
			partitionBy: statement.partitionBy,
			primaryKey: statement.primaryKey && statement.orderBy ? statement.primaryKey : void 0,
			orderBy: orderBy ?? [],
			ttl: statement.ttl,
			settings: statement.settings,
			comment: statement.comment ?? "",
			rows: [],
			modifiedAt: Date.now()
		};
		const scope = this.tableScope(table, ctx);
		const sample = withRow(scope, columns.map((column) => defaultValue(column.type)));
		for (const expr of [
			...table.orderBy,
			...table.partitionBy ? [table.partitionBy] : [],
			...table.primaryKey ?? [],
			...table.ttl ? [table.ttl] : []
		]) evaluate(expr, sample);
		if (this.catalog.add(table, statement.ifNotExists, statement.orReplace) && rows.length > 0) this.writeRows(table, rows.map((values) => Object.fromEntries(columns.map((column, index) => [column.name, values[index] ?? null]))), ctx);
	}
	keyColumns(table) {
		const names = /* @__PURE__ */ new Set();
		const visit = (expr) => {
			if (expr.kind === "identifier") names.add(expr.parts.join("."));
			if (expr.kind === "function") expr.args.forEach(visit);
		};
		for (const expr of [
			...table.orderBy,
			...table.primaryKey ?? [],
			...table.partitionBy ? [table.partitionBy] : []
		]) visit(expr);
		return names;
	}
	column(table, name) {
		const column = table.columns.find((item) => item.name === name);
		if (!column) throw noSuchColumn(`There is no column ${name} in table ${table.database}.${table.name}`);
		return column;
	}
	place(table, column, position) {
		const without = table.columns.filter((item) => item !== column);
		if (position.first) table.columns = [column, ...without];
		else if (position.after) {
			const index = without.findIndex((item) => item.name === position.after);
			if (index === -1) throw noSuchColumn(`Wrong column name. Cannot find column ${position.after} to insert after`);
			table.columns = [
				...without.slice(0, index + 1),
				column,
				...without.slice(index + 1)
			];
		} else if (!table.columns.includes(column)) table.columns = [...without, column];
	}
	alter(table, action, ctx) {
		const keys = this.keyColumns(table);
		switch (action.kind) {
			case "add-column": {
				if (table.columns.some((column) => column.name === action.column.name)) {
					if (action.ifNotExists) return;
					throw duplicateColumn(`Cannot add column ${action.column.name}: column with this name already exists`);
				}
				const column = toColumn(action.column);
				this.place(table, column, action);
				const scope = this.tableScope(table, ctx);
				for (const row of table.rows) row[column.name] = this.defaultFor(column, withRow(scope, this.rowValues(table, row)));
				return;
			}
			case "drop-column":
				if (!table.columns.some((column) => column.name === action.name)) {
					if (action.ifExists) return;
					throw noSuchColumn(`Wrong column name. Cannot find column ${action.name} to drop`);
				}
				if (keys.has(action.name)) throw alterForbidden(`Trying to ALTER DROP key ${action.name} column which is a part of key expression`);
				table.columns = table.columns.filter((column) => column.name !== action.name);
				for (const row of table.rows) delete row[action.name];
				return;
			case "modify-column": {
				const existing = table.columns.find((column) => column.name === action.column.name);
				if (!existing) {
					if (action.ifExists) return;
					throw noSuchColumn(`Wrong column name. Cannot find column ${action.column.name} to modify`);
				}
				if (action.remove) {
					if (action.remove === "DEFAULT" || action.remove === "MATERIALIZED" || action.remove === "ALIAS" || action.remove === "EPHEMERAL") {
						existing.defaultKind = void 0;
						existing.defaultExpr = void 0;
					} else if (action.remove === "CODEC") existing.codec = void 0;
					else if (action.remove === "COMMENT") existing.comment = "";
					return;
				}
				const def = action.column;
				if (def.type) {
					const type = parseType(def.type);
					if (keys.has(existing.name) && formatType(type) !== formatType(existing.type)) throw alterForbidden(`ALTER of key column ${existing.name} is forbidden`);
					for (const row of table.rows) row[existing.name] = castValue(row[existing.name] ?? null, type);
					existing.type = type;
				}
				if (def.defaultKind) {
					existing.defaultKind = def.defaultKind;
					existing.defaultExpr = def.defaultExpr;
				}
				if (def.codec !== void 0) existing.codec = def.codec;
				if (def.comment !== void 0) existing.comment = def.comment;
				if (action.first || action.after) this.place(table, existing, action);
				return;
			}
			case "rename-column": {
				const existing = table.columns.find((column) => column.name === action.from);
				if (!existing) {
					if (action.ifExists) return;
					throw noSuchColumn(`Wrong column name. Cannot find column ${action.from} to rename`);
				}
				if (keys.has(action.from)) throw alterForbidden(`Trying to ALTER RENAME key ${action.from} column which is a part of key expression`);
				existing.name = action.to;
				for (const row of table.rows) {
					row[action.to] = row[action.from] ?? null;
					delete row[action.from];
				}
				return;
			}
			case "comment-column": {
				const existing = table.columns.find((column) => column.name === action.name);
				if (!existing) {
					if (action.ifExists) return;
					throw noSuchColumn(`Wrong column name. Cannot find column ${action.name} to comment`);
				}
				existing.comment = action.comment;
				return;
			}
			case "add-index":
				if (table.indexes.some((index) => index.name === action.index.name)) {
					if (action.ifNotExists) return;
					throw new ClickHouseException(44, "ILLEGAL_COLUMN", `Cannot add index ${action.index.name}: index with this name already exists`);
				}
				table.indexes = [...table.indexes, action.index];
				return;
			case "drop-index":
				if (!table.indexes.some((index) => index.name === action.name)) {
					if (action.ifExists) return;
					throw badArguments(`Wrong index name. Cannot find index \`${action.name}\` to drop`);
				}
				table.indexes = table.indexes.filter((index) => index.name !== action.name);
				return;
			case "materialize-index":
			case "clear-index":
				if (!table.indexes.some((index) => index.name === action.name)) throw badArguments(`Unknown index: ${action.name}`);
				return;
			case "materialize-column":
				this.column(table, action.name);
				return;
			case "materialize-ttl": return;
			case "modify-ttl":
				checkTtl(action.ttl);
				table.ttl = action.ttl;
				return;
			case "remove-ttl":
				table.ttl = void 0;
				return;
			case "modify-setting":
				for (const [key, value] of action.settings) table.settings = [...table.settings.filter(([name]) => name !== key), [key, value]];
				return;
			case "reset-setting":
				table.settings = table.settings.filter(([name]) => !action.names.includes(name));
				return;
			case "modify-comment":
				table.comment = action.comment;
				return;
			case "modify-order-by":
				table.orderBy = action.exprs;
				return;
			case "delete":
				this.deleteRows(table, action.where, ctx);
				this.mutation(table, `DELETE WHERE ${sql(action.where)}`);
				return;
			case "update": {
				const scope = this.tableScope(table, ctx);
				for (const [name] of action.assignments) {
					this.column(table, name);
					if (keys.has(name)) throw new ClickHouseException(420, "CANNOT_UPDATE_COLUMN", `Cannot UPDATE key column \`${name}\``);
				}
				for (const row of table.rows) {
					const current = withRow(scope, this.rowValues(table, row));
					if (!evaluateBoolean(action.where, current)) continue;
					const updates = action.assignments.map(([name, expr]) => [name, castValue(evaluate(expr, current), this.column(table, name).type)]);
					for (const [name, value] of updates) row[name] = value;
				}
				this.mutation(table, `UPDATE ${action.assignments.map(([name, expr]) => `${quoteIdentifier(name)} = ${sql(expr)}`).join(", ")} WHERE ${sql(action.where)}`);
				return;
			}
		}
	}
	mutation(table, command) {
		this.catalog.mutations.push({
			database: table.database,
			table: table.name,
			id: `mutation_${++this.mutationCount}.txt`,
			command,
			createdAt: Date.now()
		});
	}
	deleteRows(table, where, ctx) {
		const scope = this.tableScope(table, ctx);
		table.rows = table.rows.filter((row) => !evaluateBoolean(where, withRow(scope, this.rowValues(table, row))));
		table.modifiedAt = Date.now();
	}
	optimize(table, final, ctx) {
		if (final && (table.engine.name === "ReplacingMergeTree" || table.engine.name === "SummingMergeTree")) {
			const result = runQuery({
				kind: "union",
				distinct: [],
				selects: [{
					kind: "select",
					with: [],
					distinct: false,
					columns: [{ kind: "asterisk" }],
					from: {
						kind: "table",
						database: table.database,
						name: table.name,
						final: true
					},
					joins: [],
					groupBy: [],
					withTotals: false,
					orderBy: [],
					settings: {}
				}]
			}, {
				catalog: this.catalog,
				database: table.database
			}, ctx);
			const visible = table.columns.filter((column) => column.defaultKind !== "ALIAS" && column.defaultKind !== "MATERIALIZED" && column.defaultKind !== "EPHEMERAL");
			const hidden = table.columns.filter((column) => column.defaultKind === "MATERIALIZED");
			const byKey = new Map(table.rows.map((row) => [JSON.stringify(visible.map((column) => valueKey(row[column.name] ?? null))), row]));
			table.rows = result.rows.map((values) => {
				const row = Object.fromEntries(visible.map((column, index) => [column.name, values[index] ?? null]));
				const original = byKey.get(JSON.stringify(visible.map((column) => valueKey(row[column.name] ?? null))));
				for (const column of hidden) row[column.name] = original?.[column.name] ?? null;
				return row;
			});
		}
		if (table.ttl) {
			const scope = this.tableScope(table, ctx);
			const now = ctx.fn.now;
			table.rows = table.rows.filter((row) => {
				const expiry = evaluate(table.ttl, withRow(scope, this.rowValues(table, row)));
				if (expiry instanceof DateTimeValue) return expiry.ms > now;
				if (expiry instanceof DateValue) return expiry.days * 864e5 > now;
				return true;
			});
		}
	}
	defaultFor(column, scope) {
		if ((column.defaultKind === "DEFAULT" || column.defaultKind === "MATERIALIZED") && column.defaultExpr) return castValue(evaluate(column.defaultExpr, scope), column.type);
		return defaultValue(column.type);
	}
	insert(table, statement, ctx, database) {
		const insertable = table.columns.filter((column) => column.defaultKind !== "MATERIALIZED" && column.defaultKind !== "ALIAS");
		const names = statement.columns ?? insertable.filter((column) => column.defaultKind !== "EPHEMERAL").map((column) => column.name);
		for (const name of names) {
			const column = this.column(table, name);
			if (column.defaultKind === "MATERIALIZED" || column.defaultKind === "ALIAS") throw new ClickHouseException(16, "NO_SUCH_COLUMN_IN_TABLE", `Cannot insert column ${name}, because it is MATERIALIZED or ALIAS column`);
		}
		let input;
		if (statement.values) {
			const scope = this.tableScope(table, ctx);
			input = statement.values.map((row) => {
				if (row.length !== names.length) throw new ClickHouseException(27, "CANNOT_PARSE_INPUT_ASSERTION_FAILED", `Cannot parse expression of type ... here: expected ${names.length} values, got ${row.length}`);
				return {
					kind: "value",
					values: Object.fromEntries(names.map((name, index) => [name, evaluate(row[index], scope)]))
				};
			});
		} else if (statement.select) input = runQuery(statement.select, {
			catalog: this.catalog,
			database
		}, ctx).rows.map((values) => ({
			kind: "value",
			values: Object.fromEntries(names.map((name, index) => [name, values[index] ?? null]))
		}));
		else input = parseInput(statement.data ?? "", statement.format ?? "Values", names);
		const skipUnknown = ctx.fn.settings.input_format_skip_unknown_fields !== false && ctx.fn.settings.input_format_skip_unknown_fields !== 0 && ctx.fn.settings.input_format_skip_unknown_fields !== "0";
		const known = new Set(table.columns.map((column) => column.name));
		const rows = input.map((item) => {
			if (!skipUnknown) {
				for (const key of Object.keys(item.values)) if (!known.has(key)) throw new ClickHouseException(117, "INCORRECT_DATA", `Unknown field found while parsing JSONEachRow format: ${key}`);
			}
			const row = {};
			for (const column of insertable) {
				if (!(column.name in item.values)) continue;
				const raw = item.values[column.name];
				if (item.kind === "json") row[column.name] = fromJson(raw, column.type);
				else if (item.kind === "text") row[column.name] = raw === null ? isNullable(column.type) ? null : defaultValue(column.type) : unwrap(column.type).name === "String" ? raw : castValue(raw, column.type);
				else row[column.name] = castValue(raw ?? null, column.type, false);
			}
			return row;
		});
		return this.writeRows(table, rows, ctx, true);
	}
	writeRows(table, rows, ctx, fill = true) {
		if (table.engine.name === "Null") return rows.length;
		const scope = this.tableScope(table, ctx);
		const computed = table.columns.filter((column) => column.defaultKind === "MATERIALIZED");
		for (const row of rows) {
			if (!fill) continue;
			for (const column of table.columns) {
				if (column.defaultKind === "ALIAS" || column.defaultKind === "MATERIALIZED" || column.name in row) continue;
				row[column.name] = column.defaultExpr ? this.defaultFor(column, withRow(scope, this.rowValues(table, row))) : defaultValue(column.type);
			}
			for (const column of computed) row[column.name] = this.defaultFor(column, withRow(scope, this.rowValues(table, row)));
			for (const column of table.columns) if (column.defaultKind === "EPHEMERAL" || column.defaultKind === "ALIAS") delete row[column.name];
		}
		if (table.orderBy.length > 0) {
			const keyOf = table.orderBy.every((expr) => expr.kind === "identifier" && expr.parts.length === 1) ? (row) => table.orderBy.map((expr) => row[expr.parts[0]] ?? null) : (row) => table.orderBy.map((expr) => evaluate(expr, withRow(scope, this.rowValues(table, row))));
			const keyed = rows.map((row, index) => ({
				row,
				index,
				key: keyOf(row)
			}));
			keyed.sort((a, b) => {
				for (let i = 0; i < a.key.length; i++) {
					const result = compareValues(a.key[i], b.key[i]);
					if (result !== 0) return result;
				}
				return a.index - b.index;
			});
			rows = keyed.map((entry) => entry.row);
		}
		for (const row of rows) table.rows.push(row);
		table.modifiedAt = Date.now();
		return rows.length;
	}
};
//#endregion
//#region src/memory/server.ts
const RESERVED = /* @__PURE__ */ new Set([
	"query",
	"query_id",
	"database",
	"default_format",
	"user",
	"password",
	"quota_key",
	"session_id",
	"session_timeout",
	"session_check",
	"compress",
	"decompress",
	"buffer_size",
	"wait_end_of_query",
	"role"
]);
const readBody = (req) => new Promise((resolve, reject) => {
	const chunks = [];
	req.on("data", (chunk) => chunks.push(chunk));
	req.on("end", () => resolve(Buffer.concat(chunks)));
	req.on("error", reject);
});
const SUMMARY_KEYS = [
	"read_rows",
	"read_bytes",
	"written_rows",
	"written_bytes",
	"total_rows_to_read",
	"result_rows",
	"result_bytes",
	"elapsed_ns",
	"memory_usage"
];
var MemoryClickHouseServer = class {
	options;
	host;
	engine = new Engine();
	server;
	boundPort = 0;
	constructor(options = {}) {
		this.options = options;
		this.host = options.host ?? "127.0.0.1";
	}
	get port() {
		return this.boundPort;
	}
	get endpoint() {
		return `http://${this.host}:${this.boundPort}`;
	}
	async listen(port = this.options.port ?? 0) {
		if (this.server) throw new Error("The ClickHouse server is already listening");
		const server = (0, http.createServer)((req, res) => {
			this.handle(req, res).catch((error) => {
				res.writeHead(500, { "content-type": "text/plain; charset=UTF-8" });
				res.end(String(error));
			});
		});
		server.keepAliveTimeout = 1e4;
		await new Promise((resolve, reject) => {
			server.once("error", reject);
			server.listen(port, this.host, () => resolve());
		});
		this.server = server;
		this.boundPort = server.address().port;
	}
	async close() {
		const server = this.server;
		this.server = void 0;
		this.boundPort = 0;
		if (server) {
			server.closeAllConnections();
			await new Promise((resolve) => server.close(resolve));
		}
	}
	async reset() {
		this.engine.reset();
	}
	query(sql, params = {}) {
		return this.engine.execute(sql, { params });
	}
	async handle(req, res) {
		const url = new URL(req.url ?? "/", "http://localhost");
		if (url.pathname === "/ping" || url.pathname === "/" && req.method === "GET" && !url.searchParams.has("query")) {
			res.writeHead(200, { "content-type": "text/plain; charset=UTF-8" });
			res.end("Ok.\n");
			return;
		}
		if (url.pathname === "/replicas_status") {
			res.writeHead(200, { "content-type": "text/plain; charset=UTF-8" });
			res.end("Ok.\n");
			return;
		}
		if (url.pathname !== "/") {
			res.writeHead(404, { "content-type": "text/plain; charset=UTF-8" });
			res.end("There is no handle " + url.pathname + "\n");
			return;
		}
		let body = await readBody(req);
		if (req.headers["content-encoding"] === "gzip" || url.searchParams.get("decompress") === "1") body = (0, zlib.gunzipSync)(body);
		const params = {};
		const settings = {};
		for (const [key, value] of url.searchParams) if (key.startsWith("param_")) params[key.slice(6)] = value;
		else if (!RESERVED.has(key)) settings[key] = value;
		const queryId = url.searchParams.get("query_id") || (0, crypto.randomUUID)();
		const started = process.hrtime.bigint();
		const headers = {
			"x-clickhouse-query-id": queryId,
			"x-clickhouse-timezone": "UTC",
			"x-clickhouse-server-display-name": "localhost"
		};
		const sql = [url.searchParams.get("query"), body.length > 0 ? body.toString("utf8") : void 0].filter((part) => part !== null && part !== void 0).join("\n");
		const database = req.headers["x-clickhouse-database"]?.toString() || url.searchParams.get("database") || "default";
		try {
			const executed = this.engine.execute(sql, {
				params,
				settings,
				database
			});
			const elapsed = Number(process.hrtime.bigint() - started);
			const summary = Object.fromEntries(SUMMARY_KEYS.map((key) => [key, "0"]));
			summary.read_rows = String(executed.readRows);
			summary.written_rows = String(executed.writtenRows);
			summary.result_rows = String(executed.result?.rows.length ?? 0);
			summary.elapsed_ns = String(elapsed);
			headers["x-clickhouse-summary"] = JSON.stringify(summary);
			if (!executed.result) {
				headers["content-type"] = "text/plain; charset=UTF-8";
				this.send(req, res, 200, headers, "");
				return;
			}
			const format = executed.format ?? String(executed.settings.default_format ?? url.searchParams.get("default_format") ?? "TabSeparated");
			const formatted = formatResult(executed.result, format, outputSettings(executed.settings), elapsed / 1e9);
			headers["content-type"] = formatted.contentType;
			headers["x-clickhouse-format"] = formatted.format;
			this.send(req, res, 200, headers, formatted.body, url.searchParams.get("enable_http_compression") === "1");
		} catch (error) {
			const exception = error instanceof ClickHouseException ? error : new ClickHouseException(1001, "STD_EXCEPTION", error instanceof Error ? error.message : String(error));
			headers["x-clickhouse-exception-code"] = String(exception.code);
			headers["content-type"] = "text/plain; charset=UTF-8";
			this.send(req, res, exception.status, headers, exception.toString());
		}
	}
	send(req, res, status, headers, body, compress = false) {
		const accept = String(req.headers["accept-encoding"] ?? "");
		if (compress && accept.includes("gzip") && body.length > 0) {
			res.writeHead(status, {
				...headers,
				"content-encoding": "gzip"
			});
			res.end((0, zlib.gzipSync)(body));
			return;
		}
		res.writeHead(status, headers);
		res.end(body);
	}
};
//#endregion
//#region src/real/download.ts
const exec = (0, util.promisify)(child_process.execFile);
const exists = async (path$1) => {
	try {
		await (0, fs_promises.stat)(path$1);
	} catch {
		return false;
	}
	return true;
};
const getDownloadPath = () => {
	return (0, path.join)(process.env.XDG_CACHE_HOME || (0, path.join)((0, os.homedir)(), ".cache"), "awsless", "clickhouse");
};
const fetchAsset = async (url, file) => {
	const response = await fetch(url);
	if (!response.ok || !response.body) throw new Error(`Downloading ClickHouse failed with status ${response.status}: ${url}`);
	const hash = (0, crypto.createHash)("sha256");
	const body = stream.Readable.fromWeb(response.body);
	body.on("data", (chunk) => hash.update(chunk));
	await (0, stream_promises.pipeline)(body, (0, fs.createWriteStream)(file));
	return hash.digest("hex");
};
const download = async () => {
	const asset = getAsset();
	const dir = (0, path.join)(getDownloadPath(), VERSION);
	const file = (0, path.join)(dir, "clickhouse");
	if (await exists(file)) return file;
	console.log(`Downloading ClickHouse ${VERSION}`);
	const staging = (0, path.join)(dir, `staging-${process.pid}-${(0, crypto.randomUUID)()}`);
	await (0, fs_promises.mkdir)(staging, { recursive: true });
	try {
		const archive = (0, path.join)(staging, "download");
		if (await fetchAsset(asset.url, archive) !== asset.sha256) throw new Error(`The ClickHouse download doesn't match its sha256 digest: ${asset.url}`);
		let binary = archive;
		if (asset.member) {
			await exec("tar", [
				"-xzf",
				archive,
				"-C",
				staging,
				asset.member
			]);
			binary = (0, path.join)(staging, asset.member);
		}
		await (0, fs_promises.chmod)(binary, 493);
		await exec(binary, ["--version"]);
		try {
			await (0, fs_promises.rename)(binary, file);
		} catch (error) {
			if (!await exists(file)) throw error;
		}
	} finally {
		await (0, fs_promises.rm)(staging, {
			recursive: true,
			force: true
		});
	}
	return file;
};
//#endregion
//#region src/real/server.ts
const findFreePort = () => new Promise((resolve, reject) => {
	const server = (0, net.createServer)();
	server.once("error", reject);
	server.listen(0, "127.0.0.1", () => {
		const port = server.address().port;
		server.close(() => resolve(port));
	});
});
const configXml = (dir, host, port) => `<clickhouse>
	<logger>
		<level>warning</level>
		<console>1</console>
	</logger>
	<listen_host>${host}</listen_host>
	<timezone>UTC</timezone>
	<http_port>${port}</http_port>
	<path>${dir}/data/</path>
	<tmp_path>${dir}/tmp/</tmp_path>
	<user_files_path>${dir}/user_files/</user_files_path>
	<format_schema_path>${dir}/format_schemas/</format_schema_path>
	<users_config>users.xml</users_config>
	<mark_cache_size>268435456</mark_cache_size>
	<max_server_memory_usage_to_ram_ratio>0.5</max_server_memory_usage_to_ram_ratio>
</clickhouse>
`;
const usersXml = `<clickhouse>
	<profiles>
		<default></default>
	</profiles>
	<users>
		<default>
			<password></password>
			<networks>
				<ip>::1</ip>
				<ip>127.0.0.1</ip>
			</networks>
			<profile>default</profile>
			<quota>default</quota>
			<access_management>1</access_management>
		</default>
	</users>
	<quotas>
		<default></default>
	</quotas>
</clickhouse>
`;
var RealClickHouseServer = class {
	options;
	host;
	child;
	dir;
	stopping = false;
	boundPort = 0;
	constructor(options = {}) {
		this.options = options;
		this.host = options.host ?? "127.0.0.1";
	}
	get port() {
		return this.boundPort;
	}
	get endpoint() {
		return `http://${this.host}:${this.boundPort}`;
	}
	async listen(port = this.options.port ?? 0) {
		if (this.child) throw new Error("The ClickHouse server is already listening");
		const binary = await download();
		const boundPort = port || await findFreePort();
		const dir = await (0, fs_promises.mkdtemp)((0, path.join)((0, os.tmpdir)(), "awsless-clickhouse-"));
		const configFile = (0, path.join)(dir, "config.xml");
		await (0, fs_promises.writeFile)(configFile, configXml(dir, this.host, boundPort));
		await (0, fs_promises.writeFile)((0, path.join)(dir, "users.xml"), usersXml);
		const child = (0, child_process.spawn)(binary, ["server", `--config-file=${configFile}`], { cwd: dir });
		const output = [];
		let exited;
		const onData = (data) => {
			const text = data.toString("utf8");
			if (this.boundPort) for (const line of text.split("\n").filter(Boolean)) this.options.onOutput?.(line);
			else output.push(text);
			if (this.options.debug) process.stdout.write(text);
		};
		child.stdout?.on("data", onData);
		child.stderr?.on("data", onData);
		child.on("exit", (code, signal) => {
			exited = code !== null ? `exited with code ${code}` : `killed by ${signal}`;
			if (this.boundPort && !this.stopping) this.options.onExit?.(code, signal);
		});
		const killOnExit = () => child.kill("SIGKILL");
		process.once("exit", killOnExit);
		child.once("exit", () => process.off("exit", killOnExit));
		this.child = child;
		this.dir = dir;
		try {
			await this.waitForReady(boundPort, 6e4, () => exited);
		} catch (error) {
			await this.close();
			throw new Error(`${error.message}\n${output.join("")}`, { cause: error });
		}
		this.boundPort = boundPort;
	}
	async close() {
		const child = this.child;
		const dir = this.dir;
		this.child = void 0;
		this.dir = void 0;
		this.boundPort = 0;
		if (child && child.exitCode === null && child.signalCode === null) {
			this.stopping = true;
			await new Promise((resolve) => {
				const timeout = setTimeout(() => child.kill("SIGKILL"), 2e3);
				child.once("exit", () => {
					clearTimeout(timeout);
					resolve(void 0);
				});
				child.kill("SIGTERM");
			});
			this.stopping = false;
		}
		if (dir) await (0, fs_promises.rm)(dir, {
			recursive: true,
			force: true
		});
	}
	async reset() {
		if (!this.child) return;
		const tables = await this.query(`SELECT name FROM system.tables WHERE database = currentDatabase() FORMAT JSONEachRow`);
		for (const line of tables.split("\n").filter(Boolean)) {
			const { name } = JSON.parse(line);
			await this.query(`DROP TABLE IF EXISTS \`${name.replaceAll("`", "\\`")}\` SYNC`);
		}
	}
	async query(sql) {
		const response = await fetch(`${this.endpoint}/`, {
			method: "POST",
			body: sql
		});
		const text = await response.text();
		if (!response.ok) throw new Error(`ClickHouse query failed: ${text}`);
		return text;
	}
	async waitForReady(port, timeout, exited) {
		const deadline = Date.now() + timeout;
		while (Date.now() < deadline) {
			const reason = exited();
			if (reason) throw new Error(`ClickHouse ${reason} before starting.`);
			try {
				if ((await fetch(`http://${this.host}:${port}/ping`)).ok) return;
			} catch {}
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
		throw new Error("The local ClickHouse server never became ready.");
	}
};
//#endregion
//#region src/clickhouse-server.ts
var ClickHouseServer = class {
	engine;
	memory;
	real;
	constructor(options = {}) {
		this.engine = options.engine ?? "memory";
		if (this.engine === "clickhouse") this.real = new RealClickHouseServer(options);
		else this.memory = new MemoryClickHouseServer(options);
	}
	get host() {
		return (this.memory ?? this.real).host;
	}
	get port() {
		return (this.memory ?? this.real).port;
	}
	get endpoint() {
		return (this.memory ?? this.real).endpoint;
	}
	async listen(port) {
		await (this.memory ?? this.real).listen(port);
	}
	async close() {
		await (this.memory ?? this.real).close();
	}
	async reset() {
		await (this.memory ?? this.real).reset();
	}
};
//#endregion
exports.ClickHouseServer = ClickHouseServer;
exports.MemoryClickHouseServer = MemoryClickHouseServer;
exports.RealClickHouseServer = RealClickHouseServer;
exports.VERSION = VERSION;
exports.download = download;
