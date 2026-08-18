Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _awsless_big_float = require("@awsless/big-float");
let _awsless_duration = require("@awsless/duration");
//#region src/type/bigfloat.ts
const $bigfloat = {
	is: (v) => v instanceof _awsless_big_float.BigFloat,
	parse: (v) => (0, _awsless_big_float.parse)(v),
	stringify: (v) => v.toString()
};
//#endregion
//#region src/type/bigint.ts
const $bigint = {
	is: (v) => typeof v === "bigint",
	parse: (v) => BigInt(v),
	stringify: (v) => v.toString()
};
//#endregion
//#region src/type/date.ts
const $date = {
	is: (v) => v instanceof Date,
	parse: (v) => new Date(v),
	stringify: (v) => v.toISOString()
};
//#endregion
//#region src/type/infinity.ts
const P = Infinity;
const N = -Infinity;
const $infinity = {
	is: (v) => v === P || v === N,
	parse: (v) => v === 1 ? P : N,
	stringify: (v) => v > 0 ? 1 : 0
};
//#endregion
//#region src/type/undefined.ts
const $undefined = {
	is: (v) => typeof v === "undefined",
	replace: (_) => void 0,
	stringify: (_) => 0
};
const isUndefined = (value) => {
	return typeof value === "object" && value !== null && Object.keys(value).length === 1 && "$undefined" in value && value.$undefined === 0;
};
//#endregion
//#region src/type/map.ts
const $map = {
	is: (v) => v instanceof Map,
	parse: (v) => new Map(v.map((pair) => {
		return pair.map((i) => isUndefined(i) ? void 0 : i);
	})),
	stringify: (v) => Array.from(v)
};
//#endregion
//#region src/type/nan.ts
const $nan = {
	is: (v) => typeof v === "number" && isNaN(v),
	parse: (_) => NaN,
	stringify: (_) => 0
};
//#endregion
//#region src/type/regexp.ts
const $regexp = {
	is: (v) => v instanceof RegExp,
	parse: (v) => new RegExp(v[0], v[1]),
	stringify: (v) => [v.source, v.flags]
};
//#endregion
//#region src/type/set.ts
const $set = {
	is: (v) => v instanceof Set,
	parse: (v) => new Set(v.map((i) => isUndefined(i) ? void 0 : i)),
	stringify: (v) => Array.from(v)
};
//#endregion
//#region src/type/binary.ts
const $binary = {
	is: (v) => v instanceof Uint8Array,
	parse: (v) => Uint8Array.from(atob(v), (c) => c.charCodeAt(0)),
	stringify: (v) => btoa(String.fromCharCode(...v))
};
//#endregion
//#region src/type/url.ts
const $url = {
	is: (v) => v instanceof URL,
	parse: (v) => new URL(v),
	stringify: (v) => v.toString()
};
//#endregion
//#region src/type/duration.ts
const $duration = {
	is: (v) => v instanceof _awsless_duration.Duration,
	parse: (v) => new _awsless_duration.Duration(BigInt(v)),
	stringify: (v) => v.value.toString()
};
//#endregion
//#region src/type/index.ts
const baseTypes = {
	$undefined,
	$duration,
	$infinity,
	$bigfloat,
	$bigint,
	$regexp,
	$binary,
	$date,
	$set,
	$map,
	$nan,
	$url
};
//#endregion
//#region src/parse.ts
const parse = (json, options) => {
	const replacements = [];
	const result = JSON.parse(json, createReviver(options?.types, (target, key, value) => {
		replacements.push([
			target,
			key,
			value
		]);
	}));
	for (const [target, key, value] of replacements) target[key] = value;
	return result;
};
const createReviver = (types = {}, registerReplacement) => {
	types = {
		...baseTypes,
		...types
	};
	return function(key, value) {
		const original = this[key];
		if (original !== null && typeof original === "object") {
			const keys = Object.keys(original);
			if (keys.length === 1) {
				const typeName = keys[0];
				if (typeName in types && types[typeName]) {
					const type = types[typeName];
					const stringified = original[typeName];
					if ("parse" in type) return type.parse(stringified);
					else {
						const result = type.replace(stringified);
						registerReplacement?.(this, key, result);
						return result;
					}
				}
			}
		}
		return value;
	};
};
//#endregion
//#region src/stringify.ts
const stringify = (value, options) => {
	return JSON.stringify(value, createReplacer(options));
};
const createReplacer = (options) => {
	const types = {
		...baseTypes,
		...options?.types
	};
	return function(key, value) {
		const original = this[key];
		if (!options?.preserveUndefinedValues && key && typeof original === "undefined" && typeof this === "object" && !Array.isArray(this)) return value;
		for (const [typeName, type] of Object.entries(types)) if (type.is(original)) return { [typeName]: type.stringify(original) };
		return value;
	};
};
//#endregion
//#region src/patch.ts
const patch = (value, types = {}) => {
	return parse(JSON.stringify(value), types);
};
const unpatch = (value, types = {}) => {
	return JSON.parse(stringify(value, types));
};
//#endregion
//#region src/global.ts
const setGlobalTypes = (types) => {
	Object.assign(baseTypes, types);
};
//#endregion
//#region src/safe-number/parse.ts
const safeNumberParse = (json, props) => {
	return JSON.parse(json, createSafeNumberReviver(props));
};
const createSafeNumberReviver = (props) => {
	return (_, value, context) => {
		if (typeof value === "number") return props.parse(context.source);
		return value;
	};
};
//#endregion
//#region src/safe-number/stringify.ts
const safeNumberStringify = (value, props) => {
	return JSON.stringify(value, createSafeNumberReplacer(props));
};
const createSafeNumberReplacer = (props) => {
	return function(key, value) {
		const original = this[key];
		if (props.is(original)) return JSON.rawJSON(props.stringify(original));
		return value;
	};
};
//#endregion
//#region src/type/mockdate.ts
const $mockdate = {
	is: (v) => typeof v === "object" && v !== null && "toISOString" in v && typeof v.toISOString === "function" && "getTime" in v && typeof v.getTime === "function" && "toUTCString" in v && typeof v.toUTCString === "function",
	parse: (v) => new Date(v),
	stringify: (v) => v.toISOString()
};
//#endregion
exports.$bigfloat = $bigfloat;
exports.$bigint = $bigint;
exports.$binary = $binary;
exports.$date = $date;
exports.$duration = $duration;
exports.$infinity = $infinity;
exports.$map = $map;
exports.$mockdate = $mockdate;
exports.$nan = $nan;
exports.$regexp = $regexp;
exports.$set = $set;
exports.$undefined = $undefined;
exports.$url = $url;
exports.createReplacer = createReplacer;
exports.createReviver = createReviver;
exports.createSafeNumberReplacer = createSafeNumberReplacer;
exports.createSafeNumberReviver = createSafeNumberReviver;
exports.parse = parse;
exports.patch = patch;
exports.safeNumberParse = safeNumberParse;
exports.safeNumberStringify = safeNumberStringify;
exports.setGlobalTypes = setGlobalTypes;
exports.stringify = stringify;
exports.unpatch = unpatch;
