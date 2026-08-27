import { InvokeCommand, LambdaClient, LambdaClient as LambdaClient$1, ListFunctionsCommand } from "@aws-sdk/client-lambda";
import { parse, patch, stringify, unpatch } from "@awsless/json";
import { globalClient, mockObjectValues, nextTick } from "@awsless/utils";
import { ValiError, applyRedaction, parse as parse$1 } from "@awsless/validate";
import { AsyncLocalStorage } from "node:async_hooks";
import { mockClient } from "aws-sdk-vitest-mock";
//#region src/errors/expected.ts
var ExpectedError = class extends Error {
	type;
	constructor(type, message) {
		super(message);
		this.type = type;
	}
};
//#endregion
//#region src/errors/response.ts
const isErrorResponse = (response) => {
	return typeof response === "object" && response !== null && "__error__" in response && typeof response.__error__ === "object";
};
const toErrorResponse = (error) => {
	return { __error__: {
		type: error.type,
		message: error.message,
		data: error.data
	} };
};
//#endregion
//#region src/helpers/client.ts
const lambdaClient = globalClient(() => {
	return new LambdaClient$1({});
});
//#endregion
//#region src/commands/invoke.ts
const isLambdaErrorResponse = (response) => {
	return typeof response === "object" && response !== null && typeof response.errorMessage === "string";
};
/** Invoke lambda function */
const invoke = async ({ client = lambdaClient(), name, qualifier, type = "RequestResponse", payload, reflectViewableErrors = true }) => {
	const command = new InvokeCommand({
		InvocationType: type,
		FunctionName: name,
		Payload: payload ? new TextEncoder().encode(stringify(payload)) : void 0,
		Qualifier: qualifier
	});
	const result = await client.send(command);
	if (!result.Payload) return;
	const json = new TextDecoder().decode(result.Payload);
	if (!json) return;
	const response = parse(json);
	if (isErrorResponse(response)) {
		const e = response.__error__;
		if (reflectViewableErrors) throw new ExpectedError(e.type, e.message);
		else throw new Error(e.message);
	}
	if (isLambdaErrorResponse(response)) {
		const error = new Error(response.errorMessage);
		error.name = response.errorType;
		throw error;
	}
	return response;
};
//#endregion
//#region src/commands/list-functions.ts
const listFunctions = async ({ client = lambdaClient(), ...params }) => {
	const command = new ListFunctionsCommand(params);
	const result = await client.send(command);
	if (!result.Functions) return;
	return result;
};
//#endregion
//#region src/helpers/error.ts
const normalizeError = (maybeError) => {
	if (maybeError instanceof Error) return maybeError;
	switch (typeof maybeError) {
		case "string":
		case "number":
		case "boolean": return new Error(String(maybeError));
		case "object": return new Error(JSON.stringify(maybeError));
	}
	const error = /* @__PURE__ */ new Error("Received a non-error.");
	error.name = "InvalidError";
	return error;
};
//#endregion
//#region src/errors/enhanced.ts
var EnhandedError = class extends Error {
	input;
	route;
	requestId;
	functionName;
	functionVersion;
	memoryLimit;
	remainingTime;
};
const enhanceError = (maybeError, schema, input, context) => {
	const cause = normalizeError(maybeError);
	const error = new EnhandedError(cause.message, { cause });
	error.name = cause.name;
	if (cause.stack) error.stack = cause.stack;
	error.input = schema ? applyRedaction(schema, input) : input;
	if (context) {
		if (typeof context.route === "string") error.route = context.route;
		error.requestId = context.awsRequestId;
		error.functionName = context.functionName;
		error.functionVersion = context.functionVersion;
		error.memoryLimit = context.memoryLimitInMB;
		error.remainingTime = context.getRemainingTimeInMillis();
	}
	return error;
};
//#endregion
//#region src/errors/timeout.ts
var TimeoutError = class extends Error {
	constructor(remainingTime) {
		super(`Lambda will timeout in ${remainingTime}ms`);
	}
};
const createTimeoutWrap = async (schema, event, context, log, callback) => {
	if (!context) return callback();
	const time = context.getRemainingTimeInMillis();
	const delay = Math.max(time - 1e3, 1e3);
	const id = setTimeout(() => {
		const timeoutError = new TimeoutError(context.getRemainingTimeInMillis());
		const enhancedError = enhanceError(timeoutError, schema, event, context);
		log(enhancedError);
		console.error(enhancedError);
	}, delay);
	try {
		return await callback();
	} finally {
		clearTimeout(id);
	}
};
//#endregion
//#region src/errors/validation.ts
var ValidationError = class extends ExpectedError {
	constructor(message) {
		super("validation", message);
	}
};
const transformValidationErrors = async (callback) => {
	try {
		return await callback();
	} catch (error) {
		if (error instanceof ValiError) throw new ValidationError(error.message);
		throw error;
	}
};
//#endregion
//#region src/context/async-context.ts
var AsyncContext = class {
	#storage;
	constructor() {
		this.#storage = new AsyncLocalStorage();
	}
	run(store, callback) {
		return this.#storage.run(store, callback);
	}
	get() {
		return this.#storage.getStore();
	}
};
//#endregion
//#region src/context/lambda-context.ts
const eventContext = new AsyncContext();
const getContext = () => {
	const ctx = eventContext.get();
	if (!ctx) throw new Error("Lambda context is not available");
	return ctx;
};
//#endregion
//#region src/errors/viewable.ts
var ViewableError = class extends Error {
	type;
	data;
	name = "ViewableError";
	constructor(type, message, data) {
		super(message);
		this.type = type;
		this.data = data;
	}
};
//#endregion
//#region src/helpers/mock.ts
const globalList = {};
const mockLambda = (lambdas) => {
	const alreadyMocked = Object.keys(globalList).length > 0;
	const list = mockObjectValues(lambdas);
	Object.assign(globalList, list);
	if (alreadyMocked) return list;
	const client = mockClient(LambdaClient$1);
	client.on(ListFunctionsCommand).resolves({
		$metadata: {},
		Functions: [{
			FunctionName: "test",
			FunctionArn: "arn:aws:lambda:us-west-2:123456789012:function:project--service--lambda-name"
		}]
	});
	client.on(InvokeCommand).callsFake((async (input) => {
		const name = input.FunctionName ?? "";
		const type = input.InvocationType ?? "RequestResponse";
		const payload = input.Payload ? parse(new TextDecoder().decode(input.Payload)) : void 0;
		const callback = globalList[name];
		if (!callback) throw new TypeError(`Lambda mock function not defined for: ${name}`);
		const result = await nextTick(callback, payload);
		return { Payload: type === "RequestResponse" && result ? new TextEncoder().encode(stringify(result)) : void 0 };
	}));
	beforeEach && beforeEach(() => {
		Object.values(globalList).forEach((fn) => {
			fn.mockClear();
		});
	});
	return list;
};
//#endregion
//#region src/lambda.ts
/** Create a lambda handle function. */
const lambda = (options) => {
	return (async (event, context) => {
		const log = async (maybeError) => {
			const error = normalizeError(maybeError);
			const list = [options.logger].flat(10);
			await Promise.all(list.map(async (logger) => {
				await logger?.(error, { input: event });
			}));
		};
		const isTestEnv = (process.env.LAMBDA_ENV || process.env.NODE_ENV) === "test";
		const successCallbacks = [];
		const failureCallbacks = [];
		const finallyCallbacks = [];
		try {
			const result = await createTimeoutWrap(options.schema, event, context, log, () => {
				return transformValidationErrors(() => {
					const raw = typeof event === "undefined" || isTestEnv ? event : patch(event);
					const input = options.schema ? parse$1(options.schema, raw) : raw;
					const extendedContext = {
						event: input,
						context,
						raw,
						log,
						onSuccess(cb) {
							successCallbacks.push(cb);
						},
						onFailure(cb) {
							failureCallbacks.push(cb);
						},
						onFinally(cb) {
							finallyCallbacks.push(cb);
						}
					};
					return eventContext.run(extendedContext, () => {
						return options.handle(input, extendedContext);
					});
				});
			});
			await Promise.all(successCallbacks.map((cb) => cb(result)));
			if (isTestEnv) return parse(stringify(result, { preserveUndefinedValues: true }));
			return unpatch(result);
		} catch (error) {
			await Promise.all(failureCallbacks.map((cb) => cb(error)));
			const isExpectedError = error instanceof ViewableError || error instanceof ExpectedError;
			if (!isExpectedError || options.throwExpectedErrors) await log(error);
			if (!isTestEnv && !options.throwExpectedErrors && isExpectedError) return toErrorResponse(error);
			if (!isTestEnv) throw enhanceError(normalizeError(error), options.schema, event, context);
			throw error;
		} finally {
			await Promise.all(finallyCallbacks.map((cb) => cb()));
		}
	});
};
//#endregion
export { ExpectedError, LambdaClient, TimeoutError, ValidationError, ViewableError, getContext, invoke, isErrorResponse, lambda, lambdaClient, listFunctions, mockLambda, toErrorResponse };
