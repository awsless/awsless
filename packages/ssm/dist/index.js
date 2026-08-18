import { GetParametersCommand, PutParameterCommand, SSMClient, SSMClient as SSMClient$1 } from "@aws-sdk/client-ssm";
import { globalClient, mockFn, nextTick } from "@awsless/utils";
import chunk from "chunk";
import { mockClient } from "aws-sdk-vitest-mock";
//#region src/client.ts
const ssmClient = globalClient(() => {
	return new SSMClient$1({});
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
	await Promise.all(chunk(list, 10).map(async (list) => {
		const names = [...new Set(list.map((item) => item.path))];
		const command = new GetParametersCommand({
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
	const command = new PutParameterCommand({
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
	const mock = mockFn(() => {});
	const client = mockClient(SSMClient$1);
	client.on(GetParametersCommand).callsFake(async (input) => {
		await nextTick(mock);
		return { Parameters: (input.Names || []).map((name) => {
			return {
				Name: name,
				Value: values[name] || ""
			};
		}) };
	});
	client.on(PutParameterCommand).callsFake(async () => {
		await nextTick(mock);
		return {};
	});
	beforeEach && beforeEach(() => {
		mock.mockClear();
	});
	return mock;
};
//#endregion
export { SSMClient, array, float, integer, json, mockSSM, putParameter, ssm, ssmClient, string };
