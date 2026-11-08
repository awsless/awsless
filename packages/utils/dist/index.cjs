Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let node_async_hooks = require("node:async_hooks");
let node_crypto = require("node:crypto");
let node_dgram = require("node:dgram");
let node_diagnostics_channel = require("node:diagnostics_channel");
//#region src/trace.ts
const STATE_KEY = Symbol.for("awsless.trace");
const globalState = globalThis;
const getState = () => {
	globalState[STATE_KEY] ??= {
		storage: new node_async_hooks.AsyncLocalStorage(),
		pending: /* @__PURE__ */ new Set(),
		fetchSpans: /* @__PURE__ */ new WeakMap()
	};
	return globalState[STATE_KEY];
};
const logTraceFailure = (error) => {
	const state = getState();
	if (state.hasLoggedFailure) return;
	state.hasLoggedFailure = true;
	console.warn("Tracing failed, spans are dropped:", error);
};
const resetTraceFailureLog = () => {
	getState().hasLoggedFailure = false;
};
const runTraceStep = (fallback, callback) => {
	try {
		return callback();
	} catch (error) {
		logTraceFailure(error);
		return fallback;
	}
};
const parseTraceHeader = (header) => {
	if (!header) return;
	const fields = header.split(";").map((field) => field.trim());
	const value = (key) => fields.find((field) => field.startsWith(`${key}=`))?.slice(key.length + 1);
	const root = value("Root");
	if (!root) return;
	return {
		root,
		parent: value("Parent"),
		sampled: value("Sampled") === "1",
		fields
	};
};
const parseDaemonAddress = (address) => {
	const [host, port] = (address.split(" ").find((part) => part.startsWith("udp:")) ?? address).replace(/^udp:/, "").split(":");
	return {
		host,
		port: Number(port)
	};
};
const getTraceHeader = () => {
	if (process.env.AWSLESS_TRACING !== "true" || !process.env.AWS_XRAY_DAEMON_ADDRESS) return;
	const header = parseTraceHeader(getState().storage.getStore()?.header ?? process.env._X_AMZN_TRACE_ID);
	return header?.sampled ? header : void 0;
};
const withTraceHeader = (header, callback) => {
	const state = getState();
	if (state.storage.getStore()) return callback();
	if (process.env.AWSLESS_TRACING === "true") traceFetch();
	return state.storage.run({ header }, callback);
};
const isTracing = () => runTraceStep(false, () => !!getTraceHeader());
const createSpanId = () => (0, node_crypto.randomBytes)(8).toString("hex");
const formatSpanName = (name) => name.replace(/[^\p{L}\p{N}\s_.:/%&#=+\\\-@]/gu, "_").slice(0, 200);
const formatAnnotations = (annotations) => {
	return Object.fromEntries(Object.entries(annotations).map(([key, value]) => [key.replace(/\W/g, "_"), value]));
};
const formatChildHeader = (header, parent) => {
	const rest = header.fields.filter((field) => !field.startsWith("Root=") && !field.startsWith("Parent="));
	return [
		`Root=${header.root}`,
		`Parent=${parent}`,
		...rest
	].join(";");
};
const getSocket = (state) => {
	if (!state.socket) {
		const socket = (0, node_dgram.createSocket)("udp4");
		socket.on("error", logTraceFailure);
		socket.unref();
		state.socket = socket;
	}
	return state.socket;
};
const sendSegment = (segment) => {
	runTraceStep(void 0, () => {
		const state = getState();
		const { host, port } = parseDaemonAddress(process.env.AWS_XRAY_DAEMON_ADDRESS);
		const message = `{"format":"json","version":1}\n${JSON.stringify(segment)}`;
		const socket = getSocket(state);
		const sending = new Promise((resolve) => {
			try {
				socket.send(message, port, host, (error) => {
					if (error) logTraceFailure(error);
					resolve();
				});
			} catch (error) {
				logTraceFailure(error);
				resolve();
			}
		});
		state.pending.add(sending);
		sending.then(() => state.pending.delete(sending));
	});
};
const NOOP_SPAN = {
	id: "",
	header: "",
	end() {}
};
const startSpan = (name, options = {}) => {
	return runTraceStep(NOOP_SPAN, () => openSpan(name, options));
};
const openSpan = (name, options) => {
	const header = getTraceHeader();
	if (!header) return NOOP_SPAN;
	const id = createSpanId();
	const parent = getState().storage.getStore()?.spanId ?? header.parent;
	const startTime = Date.now() / 1e3;
	let hasEnded = false;
	return {
		id,
		header: formatChildHeader(header, id),
		end(result = {}) {
			if (hasEnded) return;
			hasEnded = true;
			runTraceStep(void 0, () => sendSegment({
				type: "subsegment",
				id,
				name: formatSpanName(name),
				trace_id: header.root,
				parent_id: parent,
				start_time: startTime,
				end_time: Date.now() / 1e3,
				...options.namespace ? { namespace: options.namespace } : {},
				...options.annotations ? { annotations: formatAnnotations(options.annotations) } : {},
				...options.metadata || result.metadata ? { metadata: { default: {
					...options.metadata,
					...result.metadata
				} } } : {},
				...options.http || result.http ? { http: {
					...options.http?.method ? { request: { method: options.http.method } } : {},
					...result.http?.status ? { response: { status: result.http.status } } : {}
				} } : {},
				...options.aws || result.aws ? { aws: {
					...options.aws,
					...result.aws
				} } : {},
				...result.error || result.throttle ? { error: true } : {},
				...result.throttle ? { throttle: true } : {},
				...result.fault ? { fault: true } : {},
				...result.errorType ? { cause: { exceptions: [{
					id: createSpanId(),
					type: result.errorType
				}] } } : {}
			}));
		}
	};
};
const endWithFault = (error) => ({
	fault: true,
	errorType: error instanceof Error ? error.name : typeof error
});
const trace = async (name, callback, options = {}) => {
	const span = startSpan(name, options);
	if (span === NOOP_SPAN) return await callback(span);
	const context = {
		header: getState().storage.getStore()?.header,
		spanId: span.id
	};
	let result;
	try {
		result = await getState().storage.run(context, async () => await callback(span));
	} catch (error) {
		span.end(runTraceStep(endWithFault(error), () => (options.endWithError ?? endWithFault)(error)));
		throw error;
	}
	span.end(runTraceStep({}, () => options.endWith?.(result) ?? {}));
	return result;
};
const flushTraces = async () => {
	await runTraceStep(Promise.resolve(), async () => {
		await Promise.all(getState().pending);
	});
};
const THROTTLE_ERROR = /Throttl|TooManyRequests|ProvisionedThroughputExceeded|RequestLimitExceeded|SlowDown/;
const getSdkSpanAws = (metadata) => ({
	...metadata?.requestId ? { request_id: metadata.requestId } : {},
	...metadata?.attempts ? { retries: metadata.attempts - 1 } : {}
});
const startSdkSpan = (context, args) => {
	const service = context.clientName?.replace(/Client$/, "") ?? "AWS";
	const operation = context.commandName?.replace(/Command$/, "") ?? "unknown";
	const tableName = typeof args.input?.TableName === "string" ? args.input.TableName : void 0;
	const functionName = typeof args.input?.FunctionName === "string" ? args.input.FunctionName : void 0;
	const span = startSpan(service, {
		namespace: "aws",
		aws: {
			operation,
			...tableName ? { table_name: tableName } : {},
			...functionName ? { function_name: functionName } : {}
		}
	});
	if (span !== NOOP_SPAN && args.request?.headers) args.request.headers["x-amzn-trace-id"] = span.header;
	return span;
};
const describeSdkError = (error) => {
	const metadata = error?.$metadata;
	const status = metadata?.httpStatusCode ?? 500;
	const errorType = error?.name ?? "Error";
	const isThrottle = status === 429 || THROTTLE_ERROR.test(errorType);
	return {
		error: status < 500 && !isThrottle,
		fault: status >= 500,
		throttle: isThrottle,
		errorType,
		aws: getSdkSpanAws(metadata)
	};
};
const addTraceMiddleware = (client) => {
	runTraceStep(void 0, () => {
		const stack = client?.middlewareStack;
		if (!stack?.add) return;
		stack.add((next, context) => async (args) => {
			if (!isTracing()) return next(args);
			const span = runTraceStep(NOOP_SPAN, () => startSdkSpan(context, args));
			let result;
			try {
				result = await next(args);
			} catch (error) {
				span.end(runTraceStep({ fault: true }, () => describeSdkError(error)));
				throw error;
			}
			span.end(runTraceStep({}, () => ({ aws: getSdkSpanAws(result?.output?.$metadata) })));
			return result;
		}, {
			step: "build",
			priority: "high",
			name: "awslessTraceMiddleware",
			override: true
		});
	});
};
const getRequestHost = (origin) => {
	return new URL(String(origin)).hostname;
};
const startFetchSpan = (message) => {
	const { request } = message;
	if (!request || request.method === "CONNECT" || !isTracing()) return;
	const span = startSpan(getRequestHost(request.origin), {
		namespace: "remote",
		http: { method: request.method }
	});
	if (span !== NOOP_SPAN) getState().fetchSpans.set(request, span);
};
const endFetchSpan = (request, result) => {
	const spans = getState().fetchSpans;
	const span = request && spans.get(request);
	if (span) {
		spans.delete(request);
		span.end(result);
	}
};
const describeFetchAnswer = (status) => {
	if (status === void 0) return {};
	return {
		http: { status },
		...status === 429 ? { throttle: true } : status >= 500 ? { fault: true } : status >= 400 ? { error: true } : {}
	};
};
const describeFetchError = (error) => {
	const errorType = error instanceof Error ? error.name : "Error";
	return errorType === "AbortError" ? {
		error: true,
		errorType
	} : {
		fault: true,
		errorType
	};
};
const traceFetch = () => {
	const state = getState();
	if (state.isFetchTraced) return;
	state.isFetchTraced = true;
	runTraceStep(void 0, () => {
		(0, node_diagnostics_channel.subscribe)("undici:request:create", (message) => {
			runTraceStep(void 0, () => startFetchSpan(message));
		});
		(0, node_diagnostics_channel.subscribe)("undici:request:headers", (message) => {
			runTraceStep(void 0, () => {
				const { request, response } = message;
				endFetchSpan(request, describeFetchAnswer(response?.statusCode));
			});
		});
		(0, node_diagnostics_channel.subscribe)("undici:request:error", (message) => {
			runTraceStep(void 0, () => {
				const { request, error } = message;
				endFetchSpan(request, describeFetchError(error));
			});
		});
	});
};
//#endregion
//#region src/client.ts
const globalClient = (factory) => {
	let singleton;
	const getter = () => {
		if (!singleton) {
			const client = factory();
			if (client instanceof Promise) singleton = client.then((resolved) => {
				addTraceMiddleware(resolved);
				return resolved;
			});
			else {
				addTraceMiddleware(client);
				singleton = client;
			}
		}
		return singleton;
	};
	getter.set = (client) => {
		singleton = client;
	};
	return getter;
};
//#endregion
//#region src/mock.ts
const getVitest = (provided) => {
	const vi = provided ?? globalThis.vi;
	if (!vi) throw new Error("Enable vitest globals or pass vi explicitly (vi.fn for mockFn and mockObjectValues).");
	return vi;
};
const mockObjectValues = (object, createMock) => {
	const list = {};
	for (const [key, value] of Object.entries(object)) list[key] = mockFn(value, createMock);
	return Object.freeze(list);
};
const mockFn = (fn, createMock) => {
	return (createMock ?? getVitest().fn)(fn);
};
const nextTick = async (fn, ...args) => {
	await new Promise((resolve) => setTimeout(resolve, 0));
	return fn(...args);
};
const TRACE_ROOT = "1-5759e988-bd862e3fe1be46a994272793";
const TRACE_PARENT = "53995c3f42cd8ad8";
const mockTraceDaemon = async (provided) => {
	const vi = getVitest(provided);
	const socket = (0, node_dgram.createSocket)("udp4");
	const segments = [];
	socket.on("message", (message) => {
		segments.push(JSON.parse(message.toString().split("\n")[1]));
	});
	await new Promise((resolve) => socket.bind(0, "127.0.0.1", resolve));
	vi.stubEnv("AWSLESS_TRACING", "true");
	vi.stubEnv("AWS_XRAY_DAEMON_ADDRESS", `127.0.0.1:${socket.address().port}`);
	vi.stubEnv("_X_AMZN_TRACE_ID", `Root=${TRACE_ROOT};Parent=${TRACE_PARENT};Sampled=1`);
	return {
		segments,
		async received(count) {
			await flushTraces();
			await vi.waitFor(() => {
				if (segments.length < count) throw new Error(`${segments.length} of ${count} spans arrived`);
			});
			return segments;
		},
		close() {
			vi.stubEnv("AWSLESS_TRACING", "");
			socket.close();
			resetTraceFailureLog();
		}
	};
};
//#endregion
exports.TRACE_PARENT = TRACE_PARENT;
exports.TRACE_ROOT = TRACE_ROOT;
exports.addTraceMiddleware = addTraceMiddleware;
exports.flushTraces = flushTraces;
exports.getVitest = getVitest;
exports.globalClient = globalClient;
exports.isTracing = isTracing;
exports.mockFn = mockFn;
exports.mockObjectValues = mockObjectValues;
exports.mockTraceDaemon = mockTraceDaemon;
exports.nextTick = nextTick;
exports.parseTraceHeader = parseTraceHeader;
exports.runTraceStep = runTraceStep;
exports.startSpan = startSpan;
exports.trace = trace;
exports.withTraceHeader = withTraceHeader;
