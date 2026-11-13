//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let pg = require("pg");
pg = __toESM(pg, 1);
//#region src/result.ts
const SCALARS = {
	bool: 16,
	bytea: 17,
	name: 19,
	int8: 20,
	int2: 21,
	int4: 23,
	text: 25,
	json: 114,
	cidr: 650,
	float4: 700,
	float8: 701,
	inet: 869,
	bpchar: 1042,
	varchar: 1043,
	date: 1082,
	time: 1083,
	timestamp: 1114,
	timestamptz: 1184,
	numeric: 1700,
	uuid: 2950,
	jsonb: 3802
};
const ARRAYS = {
	_bool: 1e3,
	_name: 1003,
	_int2: 1005,
	_int4: 1007,
	_text: 1009,
	_bpchar: 1014,
	_varchar: 1015,
	_int8: 1016,
	_float4: 1021,
	_float8: 1022,
	_timestamp: 1115,
	_date: 1182,
	_time: 1183,
	_json: 199,
	_numeric: 1231,
	_bit: 1561,
	_uuid: 2951
};
const ALIASES = {
	smallserial: "int2",
	serial: "int4",
	bigserial: "int8"
};
const SUPPORTED_TYPES = /* @__PURE__ */ new Set([...Object.values(SCALARS), ...Object.values(ARRAYS)]);
const FIRST_OWN_OID = 16384;
const textOf = (field) => {
	if (field === null || field === void 0) return null;
	if (typeof field === "boolean") return field ? "t" : "f";
	if (typeof field !== "object") return String(field);
	if (field.isNull) return null;
	return textOf(field.stringValue ?? field.longValue ?? field.doubleValue ?? field.booleanValue);
};
const withOffset = (text) => {
	const spaced = text.replace("T", " ").replace(/Z$/, "+00");
	return /[+-]\d\d(:?\d\d)?$/.test(spaced) ? spaced : `${spaced}+00`;
};
const elementsOf = (field) => {
	const array = field.arrayValue;
	return array?.stringValues ?? array?.longValues ?? array?.doubleValues ?? array?.booleanValues ?? array?.arrayValues;
};
const arrayText = (elements) => {
	return `{${elements.map((element) => {
		const text = textOf(element);
		return text === null ? "NULL" : `"${text.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
	}).join(",")}}`;
};
const parserOf = (column) => {
	const typeName = column.typeName?.toLowerCase() ?? "";
	const name = ALIASES[typeName] ?? typeName;
	const scalar = SCALARS[name];
	const array = ARRAYS[name];
	if (scalar !== void 0) {
		const parse = pg.types.getTypeParser(scalar, "text");
		return (field) => {
			if (field.blobValue) return Buffer.from(field.blobValue);
			const text = textOf(field);
			if (text === null) return null;
			if (name === "timestamptz") return parse(withOffset(text));
			return parse(name === "timestamp" ? text.replace("T", " ") : text);
		};
	}
	if (array !== void 0) {
		const parse = pg.types.getTypeParser(array, "text");
		return (field) => {
			const elements = elementsOf(field);
			return elements ? parse(arrayText(elements)) : null;
		};
	}
	return (field) => field.blobValue ? Buffer.from(field.blobValue) : textOf(field);
};
const decodeRecords = (response) => {
	const columns = (response.columnMetadata ?? []).map((column) => ({
		name: column.label ?? column.name ?? "",
		parse: parserOf(column)
	}));
	return (response.records ?? []).map((record) => {
		const row = {};
		record.forEach((field, index) => {
			const column = columns[index];
			if (column) row[column.name] = column.parse(field);
		});
		return row;
	});
};
//#endregion
//#region src/statement.ts
const MAX_SQL_LENGTH = 65536;
const MAX_REQUEST_BYTES = 4194304;
const MAX_RESULT_BYTES = 1048576;
const isWord = (char) => char !== void 0 && /[A-Za-z0-9_$\u0080-￿]/.test(char);
const DOLLAR_QUOTE = /^\$(?:[A-Za-z_\u0080-￿][A-Za-z0-9_\u0080-￿]*)?\$/;
const scan = (sql) => {
	const statements = [];
	const placeholders = [];
	let start = 0;
	let hasCode = false;
	let parens = 0;
	let words = [];
	let begins = 0;
	const end = (index) => {
		if (hasCode) {
			const text = sql.slice(start, index);
			const lead = text.length - text.trimStart().length;
			statements.push({
				sql: text.trim(),
				line: sql.slice(0, start + lead).split("\n").length
			});
		}
		start = index + 1;
		hasCode = false;
		parens = 0;
		words = [];
		begins = 0;
	};
	const isRoutine = () => {
		const [first, second, third, fourth] = words;
		const routine = (word) => word === "function" || word === "procedure";
		return first === "create" && (routine(second) || second === "or" && third === "replace" && routine(fourth));
	};
	for (let index = 0; index < sql.length; index++) {
		const char = sql[index];
		const next = sql[index + 1];
		if (char === "-" && next === "-") {
			const newline = sql.indexOf("\n", index);
			index = newline === -1 ? sql.length : newline;
			continue;
		}
		if (char === "/" && next === "*") {
			let depth = 1;
			for (index += 2; index < sql.length && depth > 0; index++) if (sql[index] === "/" && sql[index + 1] === "*") {
				depth++;
				index++;
			} else if (sql[index] === "*" && sql[index + 1] === "/") {
				depth--;
				index++;
			}
			index--;
			continue;
		}
		if (/\s/.test(char)) continue;
		if (char === ";" && parens <= 0 && begins === 0) {
			end(index);
			continue;
		}
		hasCode = true;
		if (char === "'") {
			const escapes = /[eE]/.test(sql[index - 1] ?? "") && !isWord(sql[index - 2]);
			for (index++; index < sql.length; index++) if (escapes && sql[index] === "\\") index++;
			else if (sql[index] === "'") {
				if (sql[index + 1] !== "'") break;
				index++;
			}
			continue;
		}
		if (char === "\"") {
			for (index++; index < sql.length; index++) if (sql[index] === "\"") {
				if (sql[index + 1] !== "\"") break;
				index++;
			}
			continue;
		}
		if (char === "$" && !isWord(sql[index - 1])) {
			const quote = DOLLAR_QUOTE.exec(sql.slice(index, index + 80))?.[0];
			if (quote) {
				const close = sql.indexOf(quote, index + quote.length);
				index = close === -1 ? sql.length : close + quote.length - 1;
				continue;
			}
			const digits = /^\d+/.exec(sql.slice(index + 1, index + 12))?.[0];
			if (digits) {
				const after = index + 1 + digits.length;
				placeholders.push({
					start: index,
					end: after,
					index: Number(digits),
					cast: /^\s*::/.test(sql.slice(after, after + 40))
				});
				index = after - 1;
				continue;
			}
		}
		if (char === "(") parens++;
		else if (char === ")") parens--;
		else if (/[A-Za-z_]/.test(char) && !isWord(sql[index - 1])) {
			const word = /^[A-Za-z_][A-Za-z0-9_$]*/.exec(sql.slice(index, index + 64))[0].toLowerCase();
			if (words.length < 4) words.push(word);
			if (parens === 0 && isRoutine()) {
				if (word === "begin" || word === "case" && begins > 0) begins++;
				else if (word === "end" && begins > 0) begins--;
			}
			index += word.length - 1;
		}
	}
	end(sql.length);
	return {
		statements,
		placeholders
	};
};
const splitStatements = (sql) => scan(sql).statements;
const prepareValue = pg.default.utils.prepareValue;
const toText = (value) => {
	const prepared = prepareValue(value);
	return Buffer.isBuffer(prepared) ? `\\x${prepared.toString("hex")}` : prepared;
};
const renderQuery = (sql, values = []) => {
	const { statements, placeholders } = scan(sql);
	if (statements.length > 1) throw new TypeError("A query is one statement: the Data API runs one per call. Send the statements one by one, or move them into a function.");
	const usedIndexes = new Set(placeholders.map((placeholder) => placeholder.index));
	const highest = Math.max(0, ...usedIndexes);
	if (highest > values.length || usedIndexes.size < values.length) throw new TypeError(`The query has ${usedIndexes.size} placeholders, up to $${highest}, but ${values.length} parameters were given.`);
	const parameters = /* @__PURE__ */ new Map();
	let rendered = "";
	let position = 0;
	for (const placeholder of placeholders) {
		const text = toText(values[placeholder.index - 1]);
		let replacement;
		if (text === null) replacement = "NULL";
		else if (placeholder.cast) {
			const name = `p${placeholder.index}`;
			parameters.set(placeholder.index, {
				name,
				value: text
			});
			replacement = `:${name}`;
		} else replacement = (0, pg.escapeLiteral)(text);
		rendered += sql.slice(position, placeholder.start) + replacement;
		position = placeholder.end;
	}
	rendered += sql.slice(position);
	const config = {
		sql: rendered,
		parameters: [...parameters.values()]
	};
	assertFits(config);
	return config;
};
const assertFits = ({ sql, parameters }) => {
	if (sql.length > 65536) throw new RangeError(`The query is ${sql.length} characters with its values written in, over the ${MAX_SQL_LENGTH} the Data API takes. Cast a big value in the sql, like $1::jsonb or $1::text[]: a value with a cast travels next to the sql instead of in it.`);
	const bytes = Buffer.byteLength(sql) + parameters.reduce((total, { value }) => total + Buffer.byteLength(value ?? ""), 0);
	if (bytes > MAX_REQUEST_BYTES) throw new RangeError(`The query is ${bytes} bytes with its parameters, over the ${MAX_REQUEST_BYTES} the Data API takes in one request. Send it in parts.`);
};
//#endregion
Object.defineProperty(exports, "FIRST_OWN_OID", {
	enumerable: true,
	get: function() {
		return FIRST_OWN_OID;
	}
});
Object.defineProperty(exports, "MAX_RESULT_BYTES", {
	enumerable: true,
	get: function() {
		return MAX_RESULT_BYTES;
	}
});
Object.defineProperty(exports, "MAX_SQL_LENGTH", {
	enumerable: true,
	get: function() {
		return MAX_SQL_LENGTH;
	}
});
Object.defineProperty(exports, "SUPPORTED_TYPES", {
	enumerable: true,
	get: function() {
		return SUPPORTED_TYPES;
	}
});
Object.defineProperty(exports, "__toESM", {
	enumerable: true,
	get: function() {
		return __toESM;
	}
});
Object.defineProperty(exports, "decodeRecords", {
	enumerable: true,
	get: function() {
		return decodeRecords;
	}
});
Object.defineProperty(exports, "renderQuery", {
	enumerable: true,
	get: function() {
		return renderQuery;
	}
});
Object.defineProperty(exports, "splitStatements", {
	enumerable: true,
	get: function() {
		return splitStatements;
	}
});
