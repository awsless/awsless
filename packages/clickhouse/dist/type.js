import { parse } from "@awsless/big-float";
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
const tupleField = (field) => {
	const named = /^`?([A-Za-z_][A-Za-z0-9_]*)`?\s+(.+)$/s.exec(field);
	return named && !/^[A-Za-z0-9]+\s*\(/.test(field) ? {
		name: named[1],
		type: named[2]
	} : { type: field };
};
const tupleFieldType = (field) => tupleField(field).type;
const decodeValue = (text, value) => {
	const type = unwrapType(parseType(text));
	if (value === null || value === void 0) return value ?? null;
	if (type.name === "Nullable") return decodeValue(type.args[0], value);
	if (isBigInteger(type.name)) return BigInt(value);
	if (isDecimal(type.name)) return parse(value);
	if (isDateTime(type.name)) return new Date(value);
	if (type.name === "Array" && Array.isArray(value)) return value.map((item) => decodeValue(type.args[0], item));
	if (type.name === "Tuple" && Array.isArray(value)) return value.map((item, index) => decodeValue(tupleFieldType(type.args[index] ?? "String"), item));
	if (type.name === "Tuple" && typeof value === "object") {
		const types = new Map(type.args.map(tupleField).map((field) => [field.name, field.type]));
		return Object.fromEntries(Object.entries(value).map(([name, item]) => {
			return [name, decodeValue(types.get(name) ?? "String", item)];
		}));
	}
	if (type.name === "Map" && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decodeValue(type.args[1], item)]));
	return value;
};
//#endregion
export { decodeValue, isBigInteger, isDateTime, isDecimal, parseType, tupleField, unwrapType };
