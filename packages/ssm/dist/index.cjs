Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
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
let _aws_sdk_client_ssm = require("@aws-sdk/client-ssm");
let _awsless_utils = require("@awsless/utils");
let chunk = require("chunk");
chunk = __toESM(chunk, 1);
let aws_sdk_vitest_mock = require("aws-sdk-vitest-mock");
//#region src/client.ts
const ssmClient = (0, _awsless_utils.globalClient)(() => {
	return new _aws_sdk_client_ssm.SSMClient({});
});
//#endregion
//#region src/ssm.ts
const formatPath = (path) => {
	return path[0] !== "/" ? `/${path}` : path;
};
const cache = {};
/** Fetch the provided ssm paths */
const ssm = async (paths, { client = ssmClient(), ttl = 0 } = {}) => {
	const now = Math.floor(Date.now() / 1e3);
	const values = {};
	const list = Object.entries(paths).map(([key, path]) => {
		if (typeof path === "string") return {
			key,
			path: formatPath(path),
			transform: (v) => v
		};
		return {
			key,
			path: formatPath(path.path),
			transform: path.transform
		};
	}).filter(({ key, path, transform }) => {
		const item = cache[path];
		if (item && item.ttl > now) {
			values[key] = transform(item.value);
			return false;
		}
		return true;
	});
	await Promise.all((0, chunk.default)(list, 10).map(async (list) => {
		const names = [...new Set(list.map((item) => item.path))];
		const command = new _aws_sdk_client_ssm.GetParametersCommand({
			Names: names,
			WithDecryption: true
		});
		const result = await client.send(command);
		if (result.InvalidParameters && result.InvalidParameters.length) throw new Error(`SSM parameter(s) not found - ['${result.InvalidParameters.join(`', '`)}']`);
		result.Parameters?.forEach(({ Name: path, Value: value }) => {
			if (typeof value === "string" && typeof path === "string") {
				if (ttl > 0) cache[path] = {
					value,
					ttl: now + ttl
				};
				list.forEach((item) => {
					if (path === item.path) values[item.key] = item.transform(value);
				});
			}
		});
	}));
	return values;
};
//#endregion
//#region src/commands.ts
const putParameter = ({ client = ssmClient(), name, value, type = "String" }) => {
	const command = new _aws_sdk_client_ssm.PutParameterCommand({
		Name: name,
		Value: value,
		Type: type,
		Overwrite: true,
		Tier: "Standard"
	});
	return client.send(command);
};
//#endregion
//#region src/values.ts
const string = (path) => {
	return path;
};
const float = (path) => {
	return {
		path,
		transform(value) {
			return parseFloat(value);
		}
	};
};
const integer = (path, radix = 10) => {
	return {
		path,
		transform(value) {
			return parseInt(value, radix);
		}
	};
};
const array = (path, seperator = ",") => {
	return {
		path,
		transform(value) {
			return value.split(seperator).map((v) => v.trim());
		}
	};
};
const json = (path) => {
	return {
		path,
		transform(value) {
			return JSON.parse(value);
		}
	};
};
//#endregion
//#region src/mock.ts
const mockSSM = (values) => {
	const mock = (0, _awsless_utils.mockFn)(() => {});
	const client = (0, aws_sdk_vitest_mock.mockClient)(_aws_sdk_client_ssm.SSMClient);
	client.on(_aws_sdk_client_ssm.GetParametersCommand).callsFake(async (input) => {
		await (0, _awsless_utils.nextTick)(mock);
		return { Parameters: (input.Names || []).map((name) => {
			return {
				Name: name,
				Value: values[name] || ""
			};
		}) };
	});
	client.on(_aws_sdk_client_ssm.PutParameterCommand).callsFake(async () => {
		await (0, _awsless_utils.nextTick)(mock);
		return {};
	});
	beforeEach && beforeEach(() => {
		mock.mockClear();
	});
	return mock;
};
//#endregion
Object.defineProperty(exports, "SSMClient", {
	enumerable: true,
	get: function() {
		return _aws_sdk_client_ssm.SSMClient;
	}
});
exports.array = array;
exports.float = float;
exports.integer = integer;
exports.json = json;
exports.mockSSM = mockSSM;
exports.putParameter = putParameter;
exports.ssm = ssm;
exports.ssmClient = ssmClient;
exports.string = string;
