Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _aws_sdk_client_lambda = require("@aws-sdk/client-lambda");
let _awsless_validate = require("@awsless/validate");
let _awsless_json = require("@awsless/json");
let _awsless_utils = require("@awsless/utils");
let node_async_hooks = require("node:async_hooks");
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
	Object.defineProperty(error, "name", {
		value: cause.name,
		writable: true,
		configurable: true
	});
	if (cause.stack) Object.defineProperty(error, "stack", {
		value: cause.stack,
		writable: true,
		configurable: true
	});
	error.input = schema ? (0, _awsless_validate.applyRedaction)(schema, input) : input;
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
//#region src/errors/expected.ts
var ExpectedError = class extends Error {
	type;
	data;
	constructor(type, message, data) {
		super(message);
		this.type = type;
		this.data = data;
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
		data: (0, _awsless_json.unpatch)(error.data)
	} };
};
//#endregion
//#region src/helpers/client.ts
const lambdaClient = (0, _awsless_utils.globalClient)(() => {
	return new _aws_sdk_client_lambda.LambdaClient({});
});
//#endregion
//#region src/commands/invoke.ts
const isLambdaErrorResponse = (response) => {
	return typeof response === "object" && response !== null && typeof response.errorMessage === "string";
};
/** Invoke lambda function */
const invoke = async ({ client = lambdaClient(), name, qualifier, type = "RequestResponse", payload, reflectExpectedErrors = true }) => {
	const command = new _aws_sdk_client_lambda.InvokeCommand({
		InvocationType: type,
		FunctionName: name,
		Payload: payload ? new TextEncoder().encode((0, _awsless_json.stringify)(payload)) : void 0,
		Qualifier: qualifier
	});
	const result = await client.send(command);
	if (!result.Payload) return;
	const json = new TextDecoder().decode(result.Payload);
	if (!json) return;
	const response = (0, _awsless_json.parse)(json);
	if (isErrorResponse(response)) {
		const e = response.__error__;
		if (reflectExpectedErrors) throw new ExpectedError(e.type, e.message, e.data);
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
	const command = new _aws_sdk_client_lambda.ListFunctionsCommand(params);
	const result = await client.send(command);
	if (!result.Functions) return;
	return result;
};
//#endregion
//#region src/errors/timeout.ts
var TimeoutError = class extends Error {
	constructor(remainingTime) {
		super(`Lambda will timeout in ${remainingTime}ms`);
	}
};
const startTimeoutWarning = (schema, event, context, log) => {
	if (!context) return () => {};
	const delay = Math.max(context.getRemainingTimeInMillis() - 1e3, 1e3);
	const id = setTimeout(() => {
		const timeoutError = new TimeoutError(context.getRemainingTimeInMillis());
		const enhancedError = enhanceError(timeoutError, schema, event, context);
		log(enhancedError);
		console.error(enhancedError);
	}, delay);
	return () => clearTimeout(id);
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
		if (error instanceof _awsless_validate.ValiError) throw new ValidationError(error.message);
		throw error;
	}
};
//#endregion
//#region src/context/async-context.ts
var AsyncContext = class {
	#storage;
	constructor() {
		this.#storage = new node_async_hooks.AsyncLocalStorage();
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
//#region src/helpers/env.ts
const isTestEnv = () => {
	if (process.env.LAMBDA_ENV) return process.env.LAMBDA_ENV === "test";
	return process.env.NODE_ENV === "test" || !!process.env.VITEST;
};
//#endregion
//#region src/helpers/mock.ts
const globalList = {};
const mockLambda = (lambdas, options) => {
	const vi = (0, _awsless_utils.getVitest)(options?.vi);
	const alreadyMocked = Object.keys(globalList).length > 0;
	const list = (0, _awsless_utils.mockObjectValues)(lambdas, vi.fn);
	Object.assign(globalList, list);
	if (alreadyMocked) return list;
	vi.spyOn(_aws_sdk_client_lambda.LambdaClient.prototype, "send").mockImplementation((async (command) => {
		if (command instanceof _aws_sdk_client_lambda.ListFunctionsCommand) return {
			$metadata: {},
			Functions: [{
				FunctionName: "test",
				FunctionArn: "arn:aws:lambda:us-west-2:123456789012:function:project--service--lambda-name"
			}]
		};
		if (command instanceof _aws_sdk_client_lambda.InvokeCommand) {
			const input = command.input;
			const name = input.FunctionName ?? "";
			const type = input.InvocationType ?? "RequestResponse";
			const payload = input.Payload ? (0, _awsless_json.parse)(new TextDecoder().decode(input.Payload)) : void 0;
			const callback = globalList[name];
			if (!callback) throw new TypeError(`Lambda mock function not defined for: ${name}`);
			const result = await (0, _awsless_utils.nextTick)(callback, payload);
			return { Payload: type === "RequestResponse" && result ? new TextEncoder().encode((0, _awsless_json.stringify)(result)) : void 0 };
		}
		throw new TypeError(`Lambda mock doesn't support: ${command?.constructor?.name}`);
	}));
	if (typeof beforeEach !== "undefined") beforeEach(() => {
		Object.values(globalList).forEach((fn) => {
			fn.mockClear();
		});
	});
	return list;
};
//#endregion
//#region src/invocation.ts
/**
* One run of a handler: its input validated, the extended context that
* getContext() returns, and the timeout warning. A failed run is answered,
* not thrown, so its caller can log the error before finishing.
*/
const runInvocation = async (options) => {
	const log = options.log ?? (async () => {});
	const successCallbacks = [];
	const failureCallbacks = [];
	const finallyCallbacks = [];
	let result;
	let finishPromise;
	const stopTimeoutWarning = startTimeoutWarning(options.schema, options.input, options.context, log);
	const runCallbacks = async (failure) => {
		stopTimeoutWarning();
		try {
			if (failure) {
				await Promise.all(failureCallbacks.map((callback) => callback(failure.error)));
				return;
			}
			try {
				await Promise.all(successCallbacks.map((callback) => callback(result)));
			} catch (callbackError) {
				await Promise.all(failureCallbacks.map((callback) => callback(callbackError)));
				throw callbackError;
			}
		} finally {
			await Promise.all(finallyCallbacks.map((callback) => callback()));
			await (0, _awsless_utils.flushTraces)();
		}
	};
	const finishInvocation = (failure) => finishPromise ??= runCallbacks(failure);
	const xRayTraceId = options.context?.xRayTraceId;
	try {
		result = await (0, _awsless_utils.withTraceHeader)(xRayTraceId, () => transformValidationErrors(() => {
			const event = options.schema ? (0, _awsless_validate.parse)(options.schema, options.input) : options.input;
			const context = {
				event,
				context: options.context,
				raw: options.raw,
				log,
				onSuccess(callback) {
					successCallbacks.push(callback);
				},
				onFailure(callback) {
					failureCallbacks.push(callback);
				},
				onFinally(callback) {
					finallyCallbacks.push(callback);
				}
			};
			return eventContext.run(context, () => options.handle(event, context));
		}));
	} catch (error) {
		return {
			isSuccessful: false,
			error,
			finishInvocation
		};
	}
	return {
		isSuccessful: true,
		result,
		finishInvocation
	};
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
				await logger?.(error, { input: options.schema ? (0, _awsless_validate.applyRedaction)(options.schema, event) : event });
			}));
		};
		const isTest = isTestEnv();
		const raw = typeof event === "undefined" || isTest ? event : (0, _awsless_json.patch)(event);
		const invocation = await runInvocation({
			schema: options.schema,
			input: raw,
			raw,
			context,
			log,
			handle: (input, extendedContext) => options.handle(input, extendedContext)
		});
		let shouldThrowExpectedErrors;
		const isReturnedError = (error) => {
			shouldThrowExpectedErrors ??= typeof options.throwExpectedErrors === "function" ? options.throwExpectedErrors() : !!options.throwExpectedErrors;
			return error instanceof ExpectedError && !shouldThrowExpectedErrors;
		};
		const logThrownError = async (error) => {
			if (!isReturnedError(error)) await log(error);
		};
		const returnOrThrowError = (error) => {
			if (isTest) throw error;
			if (isReturnedError(error)) return toErrorResponse(error);
			throw enhanceError(normalizeError(error), options.schema, event, context);
		};
		if (!invocation.isSuccessful) {
			try {
				await logThrownError(invocation.error);
			} finally {
				await invocation.finishInvocation({ error: invocation.error });
			}
			return returnOrThrowError(invocation.error);
		}
		try {
			await invocation.finishInvocation();
		} catch (error) {
			await logThrownError(error);
			return returnOrThrowError(error);
		}
		if (isTest) return (0, _awsless_json.parse)((0, _awsless_json.stringify)(invocation.result, { preserveUndefinedValues: true }));
		return (0, _awsless_json.unpatch)(invocation.result);
	});
};
//#endregion
exports.ExpectedError = ExpectedError;
Object.defineProperty(exports, "LambdaClient", {
	enumerable: true,
	get: function() {
		return _aws_sdk_client_lambda.LambdaClient;
	}
});
exports.TimeoutError = TimeoutError;
exports.ValidationError = ValidationError;
exports.enhanceError = enhanceError;
exports.getContext = getContext;
exports.invoke = invoke;
exports.isErrorResponse = isErrorResponse;
exports.isTestEnv = isTestEnv;
exports.lambda = lambda;
exports.lambdaClient = lambdaClient;
exports.listFunctions = listFunctions;
exports.mockLambda = mockLambda;
exports.runInvocation = runInvocation;
exports.toErrorResponse = toErrorResponse;
