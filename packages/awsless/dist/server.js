import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.js";
import { t as createProxy } from "./proxy-HAezNYiX.js";
import * as s from "@awsless/open-search";
import { define, searchClient } from "@awsless/open-search";
import * as t from "@awsless/dynamodb";
import { define as define$1 } from "@awsless/dynamodb";
import * as v from "@awsless/validate";
import { array, boolean, custom, date, dynamoDbStream, isoTimestamp, json, literal, object, optional, parse, picklist, pipe, record, snsTopic, sqsQueue, string, transform, union, unknown } from "@awsless/validate";
import { ExpectedError, getContext, invoke, isErrorResponse, lambda } from "@awsless/lambda";
import { stringify } from "@awsless/json";
import { publish } from "@awsless/sns";
import { constantCase, kebabCase } from "change-case";
import { AsyncLocalStorage } from "node:async_hooks";
import { ssm } from "@awsless/ssm";
import { WeakCache } from "@awsless/weak-cache";
import { getCachedQueueUrl, sendMessage, sendMessageBatch } from "@awsless/sqs";
import { randomUUID } from "crypto";
import { runTask } from "@awsless/ecs";
import { deleteObject, getObject, headObject, putObject } from "@awsless/s3";
import { schedule } from "@awsless/scheduler";
import { createIoRedisClient, createLazyClient } from "@awsless/redis";
import { sendEmail } from "@awsless/ses";
import { batchPutData, createDurationMetric, createMetric, createSizeMetric, putData } from "@awsless/cloudwatch";
import { createHash } from "node:crypto";
//#region src/lib/handle/util.ts
const consumer = (schema, handle) => {
	return lambda({
		schema,
		handle,
		throwExpectedErrors: !!process.env.THROW_EXPECTED_ERRORS
	});
};
//#endregion
//#region src/lib/handle/failure.ts
const failure = (handle) => {
	return consumer(void 0, handle);
};
const onErrorLogSchema = object({
	hash: string(),
	requestId: string(),
	origin: string(),
	level: picklist([
		"warn",
		"error",
		"fatal"
	]),
	type: string(),
	message: string(),
	stackTrace: optional(array(string())),
	data: optional(unknown()),
	date: union([date(), pipe(string(), isoTimestamp(), transform((v) => new Date(v)))])
});
const error = (handle) => {
	return consumer(onErrorLogSchema, handle);
};
//#endregion
//#region src/lib/handle/func.ts
function func(arg1, arg2) {
	return consumer(arg2 ? arg1 : void 0, arg2 ?? arg1);
}
const task = func;
const cron = func;
//#endregion
//#region src/lib/handle/image.ts
const imageOriginSchema = object({ path: string() }, "Invalid image origin input");
const image = (handle) => {
	return consumer(imageOriginSchema, async (event, context) => {
		const result = await handle(event, context);
		if (result instanceof ArrayBuffer) return Buffer.from(result).toString("base64");
		if (ArrayBuffer.isView(result)) return Buffer.from(result.buffer, result.byteOffset, result.byteLength).toString("base64");
		return result;
	});
};
const icon = image;
//#endregion
//#region src/lib/handle/queue.ts
const queue = (schema, handle) => {
	return consumer(sqsQueue(schema), handle);
};
//#endregion
//#region src/lib/handle/route.ts
var RouteRequest = class {
	/** The http method of the request. */
	method;
	/** The full request url. */
	url;
	/** The request headers. */
	headers;
	/** The validated route path parameters. */
	params;
	/** The validated query string parameters. */
	query;
	/** The parsed & validated request body, when a body schema is given. */
	data;
	/** The ip address of the caller. */
	ip;
	/** The user agent header of the caller. */
	userAgent;
	/** The raw request body bytes. */
	body;
	constructor(props) {
		this.method = props.method;
		this.url = new URL(props.url);
		this.headers = props.headers;
		this.params = props.params;
		this.query = props.query;
		this.data = props.data;
		this.ip = props.ip;
		this.userAgent = props.userAgent;
		this.body = props.body;
	}
	/** The body decoded as text. */
	text() {
		return this.body?.toString();
	}
	/** The body parsed as json. */
	json() {
		return JSON.parse(this.text() ?? "null");
	}
};
const envelopeSchema = object({
	rawPath: optional(string()),
	rawQueryString: optional(string()),
	body: optional(string()),
	isBase64Encoded: optional(boolean()),
	headers: optional(record(string(), string())),
	pathParameters: optional(record(string(), string())),
	queryStringParameters: optional(record(string(), string())),
	requestContext: object({
		domainName: string(),
		http: object({
			method: picklist([
				"GET",
				"POST",
				"HEAD",
				"OPTIONS",
				"PUT",
				"PATCH",
				"DELETE"
			]),
			path: string(),
			sourceIp: string(),
			userAgent: string()
		})
	})
});
const extractParts = (event) => {
	let params = event.pathParameters ?? {};
	if (Object.keys(params).length === 0) {
		for (const [name, value] of Object.entries(event.headers ?? {})) if (name.startsWith("x-param-")) params[name.slice(8)] = decodeURIComponent(value);
	}
	let query = event.queryStringParameters ?? {};
	if (Object.keys(query).length === 0 && event.rawQueryString) query = Object.fromEntries(new URLSearchParams(event.rawQueryString));
	const body = typeof event.body === "string" ? event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body : void 0;
	return {
		event,
		params,
		query,
		body
	};
};
const partsSchema = (props) => {
	return object({
		event: custom(() => true),
		params: props.params ?? optional(unknown()),
		query: props.query ?? optional(unknown()),
		body: props.body ? json(props.body) : optional(unknown())
	});
};
const buildRequest = (props, parts) => {
	const { event, params, query, body } = parts;
	const headers = new Headers();
	for (const [name, value] of Object.entries(event.headers ?? {})) headers.set(name, value);
	const method = event.requestContext.http.method;
	const domain = headers.get("x-forwarded-host") || event.requestContext.domainName || "localhost";
	const path = event.rawPath || event.requestContext.http.path || "/";
	const url = `${headers.get("x-forwarded-proto") ?? "https"}://${domain}${path}${event.rawQueryString ? `?${event.rawQueryString}` : ""}`;
	const rawBody = typeof event.body === "undefined" ? void 0 : event.isBase64Encoded ? Buffer.from(event.body, "base64") : Buffer.from(event.body);
	return new RouteRequest({
		method,
		url,
		headers,
		params,
		query,
		data: props.body ? body : void 0,
		ip: event.requestContext.http.sourceIp,
		userAgent: event.requestContext.http.userAgent,
		body: rawBody
	});
};
const routeSchema = (props) => {
	return pipe(envelopeSchema, transform(extractParts), partsSchema(props), transform((parts) => buildRequest(props, parts)));
};
const isTextual = (contentType) => {
	return contentType.startsWith("text/") || contentType.includes("json") || contentType.includes("xml") || contentType.includes("javascript") || contentType.includes("x-www-form-urlencoded");
};
const toLambdaUrlResult = async (response) => {
	const headers = {};
	const cookies = [];
	response.headers.forEach((value, name) => {
		if (name.toLowerCase() === "set-cookie") cookies.push(value);
		else headers[name] = value;
	});
	const buffer = Buffer.from(await response.arrayBuffer());
	const contentType = headers["content-type"];
	const textual = typeof contentType === "string" && isTextual(contentType);
	return {
		statusCode: response.status,
		headers,
		cookies: cookies.length > 0 ? cookies : void 0,
		body: buffer.length > 0 ? textual ? buffer.toString() : buffer.toString("base64") : void 0,
		isBase64Encoded: buffer.length > 0 && !textual
	};
};
function route(arg1, arg2) {
	const props = arg2 ? arg1 : {};
	const handle = arg2 ?? arg1;
	const handler = lambda({
		schema: routeSchema(props),
		handle: async (request, context) => {
			const result = await handle(request, context);
			return result instanceof Response ? toLambdaUrlResult(result) : result;
		}
	});
	return async (event, context) => {
		const result = await handler(event, context);
		if (isErrorResponse(result)) {
			const error = result.__error__;
			return {
				statusCode: error.type === "validation" ? 400 : 500,
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: error.type,
					message: error.message,
					data: error.data
				})
			};
		}
		return result;
	};
}
const site = (handle) => {
	return route(handle);
};
//#endregion
//#region src/lib/handle/topic.ts
function subscribe(source, handle) {
	const schema = typeof source === "function" ? source.schema : source;
	return consumer(snsTopic(schema), handle);
}
//#endregion
//#region src/lib/handle/pubsub.ts
var pubsub_exports = /* @__PURE__ */ __exportAll({
	auth: () => auth$1,
	connected: () => connected,
	disconnected: () => disconnected,
	subscribed: () => subscribed,
	unsubscribed: () => unsubscribed
});
const authEventSchema$1 = object({ token: optional(string()) });
const auth$1 = (handle) => {
	return consumer(authEventSchema$1, handle);
};
const lifecycle = (event, context = unknown()) => {
	return object({
		event: literal(event),
		date: date(),
		socketId: string(),
		ip: string(),
		context: optional(context)
	});
};
const lifecycleWithTopics = (event, context = unknown()) => {
	return object({
		event: literal(event),
		date: date(),
		socketId: string(),
		ip: string(),
		context: optional(context),
		topics: array(string())
	});
};
const connectedSchema = snsTopic(lifecycle("connected"));
const disconnectedSchema = snsTopic(lifecycle("disconnected"));
const subscribedSchema = snsTopic(lifecycleWithTopics("subscribed"));
const unsubscribedSchema = snsTopic(lifecycleWithTopics("unsubscribed"));
const lifecycleHandle = (base, build) => {
	return (contextOrHandle, maybeHandle) => {
		const withContext = typeof maybeHandle === "function";
		const handle = withContext ? maybeHandle : contextOrHandle;
		const schema = withContext ? build(contextOrHandle) : base;
		return consumer(schema, handle);
	};
};
function connected(...args) {
	return lifecycleHandle(connectedSchema, (context) => snsTopic(lifecycle("connected", context)))(...args);
}
function disconnected(...args) {
	return lifecycleHandle(disconnectedSchema, (context) => snsTopic(lifecycle("disconnected", context)))(...args);
}
function subscribed(...args) {
	return lifecycleHandle(subscribedSchema, (context) => snsTopic(lifecycleWithTopics("subscribed", context)))(...args);
}
function unsubscribed(...args) {
	return lifecycleHandle(unsubscribedSchema, (context) => snsTopic(lifecycleWithTopics("unsubscribed", context)))(...args);
}
//#endregion
//#region src/lib/handle/rpc.ts
var rpc_exports = /* @__PURE__ */ __exportAll({ auth: () => auth });
const authEventSchema = object({ token: string() });
const auth = (handle) => {
	return consumer(authEventSchema, handle);
};
//#endregion
//#region src/lib/handle/store.ts
var store_exports = /* @__PURE__ */ __exportAll({ event: () => event });
const storeNotificationSchema = union([
	pipe(object({
		bucket: string(),
		key: string()
	}), transform((v) => [v])),
	array(object({
		bucket: string(),
		key: string()
	})),
	pipe(object({ Records: array(object({ s3: object({
		bucket: object({ name: string() }),
		object: object({ key: string() })
	}) })) }), transform((input) => {
		return input.Records.map((record) => ({
			bucket: record.s3.bucket.name,
			key: decodeURIComponent(record.s3.object.key.replace(/\+/g, " "))
		}));
	}))
], "Invalid store notification input");
const event = (handle) => {
	return consumer(storeNotificationSchema, handle);
};
//#endregion
//#region src/lib/handle/table.ts
var table_exports = /* @__PURE__ */ __exportAll({ stream: () => stream });
const stream = (table, handle) => {
	return consumer(dynamoDbStream(table), handle);
};
//#endregion
//#region src/lib/handle/index.ts
var handle_exports = /* @__PURE__ */ __exportAll({
	RouteRequest: () => RouteRequest,
	cron: () => cron,
	error: () => error,
	failure: () => failure,
	func: () => func,
	icon: () => icon,
	image: () => image,
	pubsub: () => pubsub_exports,
	queue: () => queue,
	route: () => route,
	rpc: () => rpc_exports,
	site: () => site,
	store: () => store_exports,
	subscribe: () => subscribe,
	table: () => table_exports,
	task: () => task
});
//#endregion
//#region src/lib/server/bundle.ts
const ROUTE_PROPERTY = "$awsless-route";
const ROUTE_HEADER = "x-awsless-route";
const LIVE_BUNDLE_ALIAS = "live";
const getBundleName = () => `${kebabCase(process.env.APP)}--function--bundle`;
const formatRouteKey = (stackName, resourceType, resourceName) => {
	return [
		stackName,
		resourceType,
		resourceName
	].map((v) => kebabCase(v)).join(":");
};
const formatRoutePayload = (routeKey, event) => {
	return {
		[ROUTE_PROPERTY]: routeKey,
		event
	};
};
let invokedQualifier;
const captureInvokedQualifier = (context) => {
	invokedQualifier = context.invokedFunctionArn?.split(":")[7];
};
const getInvokedQualifier = () => {
	return invokedQualifier;
};
const invokeBundle = ({ routeKey, payload, ...options }) => {
	const proxy = process.env.SANDBOX_PROXY;
	if (proxy) return invoke({
		...options,
		name: proxy,
		qualifier: options.qualifier ?? getInvokedQualifier() ?? "live",
		payload: formatRoutePayload(routeKey, payload)
	});
	return invoke({
		...options,
		name: getBundleName(),
		qualifier: options.qualifier ?? getInvokedQualifier() ?? "live",
		payload: formatRoutePayload(routeKey, payload)
	});
};
const bundleContext = new AsyncLocalStorage();
const isInsideBundle = () => bundleContext.getStore() !== void 0;
const getCurrentRoute = () => bundleContext.getStore()?.routeKey;
const withBundleRouteContext = (routeKey, internalInvoke, callback) => {
	return bundleContext.run({
		routeKey,
		internalInvoke
	}, callback);
};
const internalInvoke = (routeKey, payload) => {
	const context = bundleContext.getStore();
	if (!context) throw new Error("Internal invocations are only available inside the bundle");
	return context.internalInvoke(routeKey, payload);
};
let bundleRoutes = [];
const setBundleRoutes = (routes) => {
	bundleRoutes = routes;
};
const hasBundleRoute = (routeKey) => {
	return bundleRoutes.includes(routeKey);
};
const getStandaloneFunctionName = (routeKey) => {
	const [stackName, , functionName] = routeKey.split(":");
	return `${kebabCase(process.env.APP)}--${stackName}--function--${functionName}`;
};
const formatRouteEnvName = (routeKey, name) => {
	return `${routeKey}:${name}`;
};
const getRouteEnv = (name) => {
	const routeKey = getCurrentRoute() ?? process.env.AWSLESS_ROUTE;
	return process.env[routeKey ? formatRouteEnvName(routeKey, name) : name];
};
//#endregion
//#region src/lib/server/util.ts
const APP = process.env.APP;
const APP_ID = process.env.APP_ID;
const IS_TEST = !!process.env["VITEST"] || process.env["NODE_ENV"] === "test";
const IS_LOCAL = process.env.AWSLESS_ENV === "local";
const REGION = process.env.AWS_REGION;
const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID;
const STACK = process.env.STACK;
const getRoute = () => getCurrentRoute() ?? process.env.AWSLESS_ROUTE;
const getStack = () => getRoute()?.split(":")[0] ?? STACK;
const formatResourceName = (opt) => {
	return [
		opt.prefix,
		APP,
		opt.stackName,
		opt.resourceType,
		opt.resourceName,
		opt.postfix
	].filter((v) => typeof v === "string").map((v) => kebabCase(v)).join(opt.separator ?? "--");
};
const bindLocalResourceName = (resourceType) => {
	return (resourceName, stackName = getStack()) => {
		return formatResourceName({
			stackName,
			resourceType,
			resourceName
		});
	};
};
const bindGlobalResourceName = (resourceType) => {
	return (resourceName) => {
		return formatResourceName({
			resourceType,
			resourceName
		});
	};
};
//#endregion
//#region src/lib/server/alert.ts
const getAlertName = bindGlobalResourceName("alert");
const Alert = /*@__PURE__*/ createProxy((name) => {
	const topic = getAlertName(name);
	return { [topic]: async (subject, payload, options = {}) => {
		await publish({
			...options,
			topic,
			subject,
			payload: typeof payload === "string" || typeof payload === "undefined" ? payload : stringify(payload)
		});
	} }[topic];
});
//#endregion
//#region src/lib/server/config.ts
const getConfigName = (name) => {
	return `/.awsless/${APP}/${name}`;
};
const loadConfigData = /* @__NO_SIDE_EFFECTS__ */ async () => {
	if (!IS_TEST) {
		const keys = process.env.CONFIGS?.split(",").filter(Boolean) ?? [];
		if (keys.length > 0) {
			const paths = {};
			for (const key of keys) paths[kebabCase(key)] = getConfigName(key);
			return ssm(paths);
		}
	}
	return {};
};
const data = await /*@__PURE__*/ loadConfigData();
const getConfigValue = (name) => {
	const key = kebabCase(name);
	const value = data[key];
	if (typeof value === "undefined") throw new Error(`The "${name}" config value hasn't been set yet. ${IS_TEST ? `Use "mock.config.${name} = 'VALUE'" to define your mock value.` : `Define access to the desired config value inside your awsless stack file.`}`);
	return value;
};
const setConfigValue = (name, value) => {
	const key = kebabCase(name);
	data[key] = value;
};
const Config = /*@__PURE__*/ new Proxy({}, {
	get(_, name) {
		return getConfigValue(name);
	},
	set(_, name) {
		throw new Error(`Config values are read only. Use "mock.config.${name}" to fake a value inside tests.`);
	}
});
//#endregion
//#region src/lib/server/function.ts
const cache = new WeakCache();
const getFunctionName = bindLocalResourceName("function");
const Fn = /*@__PURE__*/ createProxy((stackName) => {
	return /* @__PURE__ */ createProxy((funcName) => {
		const name = getFunctionName(funcName, stackName);
		const routeKey = formatRouteKey(stackName, "function", funcName);
		const send = async (payload, options = {}) => {
			if (IS_TEST) return invoke({
				...options,
				name,
				payload
			});
			if (isInsideBundle()) {
				if (!hasBundleRoute(routeKey)) return invoke({
					...options,
					name,
					qualifier: options.qualifier ?? getInvokedQualifier() ?? "live",
					payload
				});
				if (!options.qualifier && !options.client) {
					if (options.reflectViewableErrors === false) return internalInvoke(routeKey, payload).catch((error) => {
						if (error instanceof ExpectedError) throw new Error(error.message);
						throw error;
					});
					return internalInvoke(routeKey, payload);
				}
			}
			return invokeBundle({
				...options,
				routeKey,
				payload
			});
		};
		const call = { [name]: (payload, options = {}) => {
			const { cache: shouldCache, ...invokeOptions } = options;
			if (!shouldCache) return send(payload, invokeOptions);
			const cacheKey = stringify([
				routeKey,
				payload,
				invokeOptions.qualifier
			]);
			const cached = cache.get(cacheKey);
			if (cached) return cached;
			const pending = send(payload, invokeOptions).catch((error) => {
				cache.delete(cacheKey);
				throw error;
			});
			cache.set(cacheKey, pending);
			return pending;
		} }[name];
		call.cached = (payload, options = {}) => {
			return call(payload, {
				...options,
				cache: true
			});
		};
		return call;
	});
});
//#endregion
//#region src/lib/server/instance.ts
const getInstanceQueueName = bindLocalResourceName("instance");
const getInstanceQueueUrl = (name, stack = getStack()) => {
	return process.env[`INSTANCE_${constantCase(stack)}_${constantCase(name)}_URL`];
};
const Instance = /*@__PURE__*/ createProxy((stack) => {
	return /* @__PURE__ */ createProxy((name) => {
		const url = getInstanceQueueUrl(name, stack);
		const queue = getInstanceQueueName(name, stack);
		const send = { [queue]: async (payload, options = {}) => {
			const resolved = url ?? await getCachedQueueUrl(queue);
			return sendMessage({
				...options,
				queue: resolved,
				payload,
				attributes: {
					...options.attributes,
					queueUrl: resolved,
					queueName: queue
				}
			});
		} }[queue];
		send.url = url;
		return send;
	});
});
//#endregion
//#region src/lib/server/job.ts
const getJobName = bindLocalResourceName("job");
const Job = /*@__PURE__*/ createProxy((stackName) => {
	return /* @__PURE__ */ createProxy((jobName) => {
		const name = getJobName(jobName, stackName);
		return { [name]: async (payload) => {
			const cluster = `${APP}-job`;
			if (!process.env.JOB_SUBNETS) throw new Error("JOB_SUBNETS env var is not set. Is the job feature deployed?");
			if (!process.env.JOB_SECURITY_GROUP) throw new Error("JOB_SECURITY_GROUP env var is not set. Is the job feature deployed?");
			const subnets = JSON.parse(process.env.JOB_SUBNETS);
			const securityGroup = process.env.JOB_SECURITY_GROUP;
			let storedPayload = payload;
			const bucket = process.env.JOB_PAYLOAD_BUCKET;
			if (payload !== void 0 && bucket) {
				const key = `job/payloads/${randomUUID()}.json`;
				await putObject({
					bucket,
					key,
					body: stringify(payload),
					contentType: "application/json"
				});
				storedPayload = `s3://${bucket}/${key}`;
			}
			return runTask({
				cluster,
				taskDefinition: name,
				subnets,
				securityGroups: [securityGroup],
				container: `container-${kebabCase(jobName)}`,
				payload: storedPayload,
				assignPublicIp: false
			});
		} }[name];
	});
});
//#endregion
//#region src/lib/server/pubsub.ts
const getPubSubPublisherName = bindGlobalResourceName("pubsub-publisher");
const PubSub = /*@__PURE__*/ createProxy((name) => {
	const routeKey = formatRouteKey("base", "pubsub", `${name}-publisher`);
	return { publish: async (topic, event, payload) => {
		const message = {
			topic,
			event,
			payload
		};
		if (IS_TEST) {
			await invoke({
				name: getPubSubPublisherName(name),
				type: "Event",
				payload: message
			});
			return;
		}
		if (isInsideBundle()) {
			await internalInvoke(routeKey, message);
			return;
		}
		await invokeBundle({
			routeKey,
			payload: message,
			type: "Event"
		});
	} };
});
//#endregion
//#region src/lib/server/queue.ts
const bindQueueBaseName = bindLocalResourceName("queue");
const getQueueName = (name, stack = getStack()) => {
	return `${bindQueueBaseName(name, stack)}.fifo`;
};
const getQueueUrl = (name, stack = getStack()) => {
	return process.env[`QUEUE_${constantCase(stack)}_${constantCase(name)}_URL`];
};
const Queue = /*@__PURE__*/ createProxy((stack) => {
	return /* @__PURE__ */ createProxy((queue) => {
		const url = getQueueUrl(queue, stack);
		const name = getQueueName(queue, stack);
		const send = { [name]: (payload, options = {}) => {
			return sendMessage({
				...options,
				queue: url ?? name,
				payload,
				attributes: {
					...options.attributes,
					...url ? { queueUrl: url } : {},
					queueName: name
				}
			});
		} }[name];
		send.url = url;
		send.batch = (items, options = {}) => {
			return sendMessageBatch({
				...options,
				queue: url ?? name,
				items: items.map((item) => ({
					...item,
					attributes: {
						...item.attributes,
						...url ? { queueUrl: url } : {},
						queueName: name
					}
				}))
			});
		};
		return send;
	});
});
//#endregion
//#region src/lib/server/on-failure.ts
const onFailureBucketName = formatResourceName({
	resourceType: "on-failure",
	resourceName: "failure",
	postfix: APP_ID
});
const onFailureQueueName = formatResourceName({
	resourceType: "on-failure",
	resourceName: "failure"
});
const onFailureBucketArn = `arn:aws:s3:::${onFailureBucketName}`;
const onFailureQueueArn = `arn:aws:sqs:${REGION}:${ACCOUNT_ID}:${onFailureQueueName}`;
//#endregion
//#region src/lib/server/task.ts
const getTaskName = bindLocalResourceName("task");
const Task = /*@__PURE__*/ createProxy((stackName) => {
	return /* @__PURE__ */ createProxy((taskName) => {
		const name = getTaskName(taskName, stackName);
		const routeKey = formatRouteKey(stackName, "task", taskName);
		return { [name]: async (payload, options = {}) => {
			const { schedule: scheduleAt, ...invokeOptions } = options;
			if (IS_TEST) await invoke({
				...invokeOptions,
				type: "Event",
				name,
				payload
			});
			else if (scheduleAt) {
				const resourceTaskName = bindGlobalResourceName("task");
				await schedule({
					name: `${getBundleName()}:${LIVE_BUNDLE_ALIAS}`,
					payload: formatRoutePayload(routeKey, payload),
					schedule: scheduleAt,
					group: resourceTaskName("group"),
					roleArn: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/${resourceTaskName("schedule")}`,
					deadLetterArn: onFailureQueueArn
				});
			} else await invokeBundle({
				...invokeOptions,
				routeKey,
				payload,
				type: "Event"
			});
		} }[name];
	});
});
//#endregion
//#region src/lib/server/topic.ts
const getTopicName = bindGlobalResourceName("topic");
const Topic = /*@__PURE__*/ createProxy((name) => {
	const topic = getTopicName(name);
	return {
		name: topic,
		define(schema) {
			const publisher = async (payload, options = {}) => {
				parse(schema, payload);
				await publish({
					...options,
					topic,
					payload: stringify(payload)
				});
			};
			Object.defineProperty(publisher, "name", { value: topic });
			Object.defineProperty(publisher, "schema", { value: schema });
			return publisher;
		}
	};
});
//#endregion
//#region src/lib/server/search.ts
const getSearchProps = (name, stack = getStack()) => {
	return {
		domain: process.env.SEARCH_DOMAIN,
		name: IS_TEST ? `${kebabCase(APP)}--${kebabCase(stack)}--${name}` : `${kebabCase(stack)}--${name}`
	};
};
const typeGroups = [["keyword", "text"], [
	"long",
	"double",
	"integer",
	"float",
	"short",
	"byte",
	"half_float",
	"scaled_float"
]];
const compatibleTypes = (a, b) => {
	return a === b || typeGroups.some((group) => group.includes(a) && group.includes(b));
};
const assertMatchingMappings = (label, declared, defined, path = "") => {
	const declaredProps = declared.properties ?? {};
	const definedProps = defined.properties ?? {};
	for (const field of Object.keys(definedProps)) if (!declaredProps[field]) throw new Error(`The schema of search index "${label}" defines the field "${path}${field}", which the stack file doesn't declare.`);
	for (const field of Object.keys(declaredProps)) if (!definedProps[field]) throw new Error(`The stack file declares the field "${path}${field}" for search index "${label}", which the code schema doesn't define.`);
	for (const [field, declaredField] of Object.entries(declaredProps)) {
		const definedField = definedProps[field];
		if (declaredField.properties || definedField.properties) {
			if (!declaredField.properties || !definedField.properties) throw new Error(`The field "${path}${field}" of search index "${label}" is an object on one side but not the other.`);
			assertMatchingMappings(label, declaredField, definedField, `${path}${field}.`);
			continue;
		}
		if (declaredField.type && definedField.type && !compatibleTypes(declaredField.type, definedField.type)) throw new Error(`The field "${path}${field}" of search index "${label}" is a "${definedField.type}" in the code schema but a "${declaredField.type}" in the stack file.`);
	}
};
const Search = /*@__PURE__*/ createProxy((stack) => {
	return /* @__PURE__ */ createProxy((name) => {
		const { domain, name: index } = getSearchProps(name, stack);
		let client;
		return {
			name: index,
			domain,
			define(schema) {
				if (IS_TEST) {
					const declared = process.env[`SEARCH_MAPPINGS_${index}`];
					if (declared) assertMatchingMappings(`${stack}.${name}`, JSON.parse(declared), schema.mapping);
				}
				return define(index, schema, () => {
					if (!client) client = searchClient({ node: `${IS_LOCAL || IS_TEST ? "http" : "https"}://${domain}` }, "es");
					return client;
				});
			}
		};
	});
});
//#endregion
//#region src/lib/server/table.ts
const getTableName = bindLocalResourceName("table");
const getTableProps = (name, stack = getStack()) => {
	const raw = process.env[`TABLE_${constantCase(stack)}_${constantCase(name)}_KEYS`];
	return {
		name: getTableName(name, stack),
		keys: raw ? JSON.parse(raw) : void 0
	};
};
const Table = /*@__PURE__*/ createProxy((stack) => {
	return /* @__PURE__ */ createProxy((name) => {
		return {
			name: getTableName(name, stack),
			define(schema) {
				const { name: tableName, keys } = getTableProps(name, stack);
				if (!keys) throw new Error(`No table key config found for "${stack}.${name}". Is the table defined in your stack file?`);
				if (IS_TEST) {
					const attributes = [
						keys.hash,
						keys.sort,
						...Object.values(keys.indexes ?? {}).flatMap((index) => [index.hash, index.sort])
					].flat().filter((attribute) => typeof attribute === "string");
					for (const attribute of attributes) if (!schema.walk?.(attribute)) throw new Error(`The schema of table "${stack}.${name}" is missing the "${attribute}" key field declared in the stack file.`);
				}
				return define$1(tableName, {
					hash: keys.hash,
					sort: keys.sort,
					indexes: keys.indexes,
					schema
				});
			}
		};
	});
});
//#endregion
//#region src/lib/test/cleanup.ts
const callbacks = [];
let hooked = false;
const registerTestCleanup = (callback) => {
	callbacks.push(callback);
};
const hookTestCleanup = () => {
	if (hooked || typeof afterAll === "undefined") return;
	hooked = true;
	afterAll(async () => {
		await Promise.all(callbacks.splice(0).map((callback) => callback()));
	});
};
//#endregion
//#region src/lib/test/setup.ts
const mockBaselines = /* @__PURE__ */ new Map();
const mockState = { inTest: false };
const testRegistry = {
	emails: {},
	functions: {},
	tasks: {},
	queues: {},
	topics: {},
	pubsub: {},
	alerts: {},
	jobs: {},
	instances: {}
};
const setupTestEnv = async (manifest, options) => {
	const [dynamodb, lambda, s3, scheduler, sns, sqs, cloudwatch, ecs, ses] = await Promise.all([
		import("@awsless/dynamodb"),
		import("@awsless/lambda"),
		import("@awsless/s3"),
		import("@awsless/scheduler"),
		import("@awsless/sns"),
		import("@awsless/sqs"),
		import("@awsless/cloudwatch"),
		import("@awsless/ecs"),
		import("@awsless/ses")
	]);
	cloudwatch.mockCloudWatch();
	hookTestCleanup();
	compareBigFloatsByValue();
	applyTestConfigValues(manifest);
	materializeTables(manifest, options.importFile, dynamodb);
	await createSearchIndexes(manifest);
	s3.mockS3();
	await redirectCacheClients(manifest);
	const spies = registerResourceSpies(manifest, options.importFile);
	lambda.mockLambda(spies.lambdas);
	scheduler.mockScheduler(spies.tasks);
	sqs.mockSQS(spies.queues);
	sns.mockSNS(spies.topics);
	ecs.mockEcs(spies.jobs);
	recordEmails(ses.mockSES);
	resetSpiesBetweenTests();
};
const realHandler = (importFile, file) => {
	let cached;
	return vi.fn((payload) => {
		cached ??= importFile(file).then((module) => {
			const handle = module.default;
			if (typeof handle !== "function") throw new Error(`The handler file has no default export: ${file}`);
			return handle;
		});
		return cached.then((handle) => handle(payload));
	});
};
const compareBigFloatsByValue = () => {
	const isBigFloat = (value) => typeof value === "object" && value !== null && typeof value.coefficient === "bigint" && typeof value.exponent === "number";
	expect.addEqualityTesters([function(a, b) {
		if (isBigFloat(a) && isBigFloat(b)) return a.toString() === b.toString();
	}]);
};
const applyTestConfigValues = (manifest) => {
	for (const [name, value] of Object.entries(manifest.configs)) setConfigValue(name, value);
};
const materializeTables = (manifest, importFile, dynamodb) => {
	if (manifest.tables.length === 0) return;
	const app = process.env.APP;
	const tables = manifest.tables.map((table) => ({
		...table,
		TableName: table.TableName.replace(`${manifest.app}--`, `${app}--`)
	}));
	const streams = (manifest.streams ?? []).map((entry) => {
		return dynamodb.streamTable(dynamodb.define(getTableName(entry.id, entry.stack), {
			hash: entry.hash,
			sort: entry.sort,
			schema: dynamodb.object({}, dynamodb.any())
		}), async (payload) => {
			await (await importFile(entry.file)).default(payload);
		});
	});
	dynamodb.mockDynamoDB({
		tables,
		stream: streams
	});
};
const createSearchIndexes = async (manifest) => {
	const domain = manifest.servers?.search?.domain;
	if (!domain) return;
	for (const entry of manifest.searches ?? []) {
		const { name } = getSearchProps(entry.id, entry.stack);
		process.env[`SEARCH_MAPPINGS_${name}`] = JSON.stringify(entry.mappings);
		const result = await fetch(`http://${domain}/${name}`, {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				mappings: entry.mappings,
				settings: entry.settings
			})
		});
		if (!result.ok) throw new Error(`Failed to create the search index "${name}": ${await result.text()}`);
	}
};
const redirectCacheClients = async (manifest) => {
	if ((manifest.caches ?? []).length === 0) return;
	const shared = manifest.servers?.redis;
	if (!shared) {
		const { mockRedis } = await import("@awsless/redis");
		mockRedis();
		return;
	}
	const { createIoRedisClient, overrideOptions } = await import("@awsless/redis");
	const db = ((parseInt(process.env.AWSLESS_TEST_REDIS_DB_OFFSET ?? "0", 10) || 0) + (parseInt(process.env.VITEST_POOL_ID ?? "1", 10) || 1)) % 256;
	overrideOptions({
		host: shared.host,
		port: shared.port,
		db,
		cluster: false,
		tls: void 0,
		maxRetriesPerRequest: 20,
		connectTimeout: 1e4,
		retryStrategy: (times) => times > 20 ? null : Math.min(times * 250, 2e3)
	});
	const flush = async () => {
		const client = createIoRedisClient({
			host: shared.host,
			port: shared.port,
			db
		});
		try {
			await client.send("FLUSHDB", []);
		} finally {
			await client.destroy();
		}
	};
	try {
		await flush();
	} catch (error) {
		await new Promise((resolve) => setTimeout(resolve, 1e3));
		try {
			await flush();
		} catch (retryError) {
			throw new Error(`The shared test redis server at ${shared.host}:${shared.port} is unreachable: ${String(error)}`, { cause: retryError });
		}
	}
};
const registerResourceSpies = (manifest, importFile) => {
	const spies = {
		lambdas: {},
		tasks: {},
		queues: {},
		topics: {},
		jobs: {}
	};
	for (const entry of manifest.functions) {
		const name = getFunctionName(entry.id, entry.stack);
		const spy = realHandler(importFile, entry.file);
		testRegistry.functions[name] = spy;
		spies.lambdas[name] = spy;
	}
	for (const entry of manifest.tasks) {
		const name = getTaskName(entry.id, entry.stack);
		const spy = realHandler(importFile, entry.file);
		testRegistry.tasks[name] = spy;
		spies.lambdas[name] = spy;
		spies.tasks[name] = spy;
	}
	for (const id of manifest.pubsub) {
		const name = getPubSubPublisherName(id);
		const spy = vi.fn(() => {});
		testRegistry.pubsub[name] = spy;
		spies.lambdas[name] = spy;
	}
	for (const entry of manifest.queues) {
		const name = getQueueName(entry.id, entry.stack);
		const spy = entry.file ? realHandler(importFile, entry.file) : vi.fn(() => {});
		testRegistry.queues[name] = spy;
		spies.queues[name] = spy;
	}
	for (const id of manifest.topics) {
		const name = getTopicName(id);
		const spy = vi.fn(() => {});
		testRegistry.topics[name] = spy;
		spies.topics[name] = spy;
	}
	for (const id of manifest.alerts ?? []) {
		const name = getAlertName(id);
		const spy = vi.fn(() => {});
		testRegistry.alerts[name] = spy;
		spies.topics[name] = spy;
	}
	for (const entry of manifest.instances ?? []) {
		const name = getInstanceQueueName(entry.id, entry.stack);
		const spy = vi.fn(() => {});
		testRegistry.instances[name] = spy;
		spies.queues[name] = spy;
	}
	if ((manifest.jobs ?? []).length > 0) {
		process.env.JOB_SUBNETS ??= JSON.stringify(["subnet-local"]);
		process.env.JOB_SECURITY_GROUP ??= "sg-local";
	}
	for (const entry of manifest.jobs ?? []) {
		const name = getJobName(entry.id, entry.stack);
		const spy = vi.fn(() => {});
		testRegistry.jobs[name] = spy;
		spies.jobs[name] = spy;
	}
	return spies;
};
const recordEmails = (mockSES) => {
	testRegistry.emails.send = vi.fn(() => {});
	mockSES((input) => {
		const email = input;
		testRegistry.emails.send({
			from: email.FromEmailAddress,
			to: email.Destination?.ToAddresses,
			subject: email.Content?.Simple?.Subject?.Data,
			html: email.Content?.Simple?.Body?.Html?.Data
		});
	});
};
const resetSpiesBetweenTests = () => {
	beforeEach(() => {
		mockState.inTest = true;
		for (const registry of Object.values(testRegistry)) for (const spy of Object.values(registry)) {
			spy.mockReset();
			const baseline = mockBaselines.get(spy);
			if (baseline) spy.mockImplementation(baseline);
		}
	});
	afterEach(() => {
		mockState.inTest = false;
	});
};
//#endregion
//#region src/lib/test/mock.ts
const overridable = (registry, name) => {
	const spy = registry[name];
	if (!spy) throw new Error(`No test mock exists for "${name}". Make sure the resource is declared in your app config & the tests run through "awsless test".`);
	return new Proxy(spy, { apply(_target, _thisArg, args) {
		const impl = args[0];
		const handler = typeof impl === "function" ? impl : async () => impl;
		if (!mockState.inTest) mockBaselines.set(spy, handler);
		spy.mockImplementation(handler);
	} });
};
const mock = {
	function: /* @__PURE__ */ createProxy((stack) => {
		return /* @__PURE__ */ createProxy((name) => overridable(testRegistry.functions, getFunctionName(name, stack)));
	}),
	task: /* @__PURE__ */ createProxy((stack) => {
		return /* @__PURE__ */ createProxy((name) => overridable(testRegistry.tasks, getTaskName(name, stack)));
	}),
	queue: /* @__PURE__ */ createProxy((stack) => {
		return /* @__PURE__ */ createProxy((name) => overridable(testRegistry.queues, getQueueName(name, stack)));
	}),
	topic: /* @__PURE__ */ createProxy((name) => overridable(testRegistry.topics, getTopicName(name))),
	pubsub: /* @__PURE__ */ createProxy((name) => overridable(testRegistry.pubsub, getPubSubPublisherName(name))),
	alert: /* @__PURE__ */ createProxy((name) => overridable(testRegistry.alerts, getAlertName(name))),
	job: /* @__PURE__ */ createProxy((stack) => {
		return /* @__PURE__ */ createProxy((name) => overridable(testRegistry.jobs, getJobName(name, stack)));
	}),
	instance: /* @__PURE__ */ createProxy((stack) => {
		return /* @__PURE__ */ createProxy((name) => overridable(testRegistry.instances, getInstanceQueueName(name, stack)));
	}),
	email: { get send() {
		return overridable(testRegistry.emails, "send");
	} },
	config: new Proxy({}, {
		get(_, name) {
			if (typeof name !== "string") return;
			try {
				return getConfigValue(name);
			} catch {
				return;
			}
		},
		set(_, name, value) {
			if (typeof name === "string") setConfigValue(name, String(value));
			return true;
		}
	})
};
//#endregion
//#region src/lib/server/auth.ts
const getAuthProps = (name) => {
	return {
		userPoolId: process.env[`AUTH_${constantCase(name)}_USER_POOL_ID`],
		clientId: process.env[`AUTH_${constantCase(name)}_CLIENT_ID`]
	};
};
const Auth = /*@__PURE__*/ createProxy((name) => {
	const { userPoolId, clientId } = getAuthProps(name);
	return {
		userPoolId,
		clientId
	};
});
//#endregion
//#region src/lib/server/cache.ts
const getCacheProps = (name, stack = getStack()) => {
	const prefix = `CACHE_${constantCase(stack)}_${constantCase(name)}`;
	return {
		host: process.env[`${prefix}_HOST`],
		port: parseInt(process.env[`${prefix}_PORT`], 10)
	};
};
const Cache = /*@__PURE__*/ createProxy((stack) => {
	return /* @__PURE__ */ createProxy((name) => {
		return (db = 0) => {
			return createLazyClient(() => {
				const client = createIoRedisClient({
					...getCacheProps(name, stack),
					db,
					...IS_LOCAL ? {
						cluster: false,
						tls: void 0
					} : {
						cluster: true,
						tls: { checkServerIdentity: () => {} }
					}
				});
				if (IS_TEST) registerTestCleanup(() => client.destroy());
				else getContext().onFinally(() => {
					return client.destroy();
				});
				return client;
			});
		};
	});
});
//#endregion
//#region src/lib/server/cron.ts
const getCronName = bindLocalResourceName("cron");
const Cron = /*@__PURE__*/ createProxy((stackName) => {
	return /* @__PURE__ */ createProxy((cronName) => {
		const name = getCronName(cronName, stackName);
		const routeKey = formatRouteKey(stackName, "cron", cronName);
		return { [name]: async (payload, options = {}) => {
			if (IS_TEST) {
				await invoke({
					...options,
					type: "RequestResponse",
					name,
					payload
				});
				return;
			}
			await invokeBundle({
				...options,
				routeKey,
				payload,
				type: "RequestResponse"
			});
		} }[name];
	});
});
//#endregion
//#region src/lib/server/email.ts
const Email = { async send(props) {
	await sendEmail(props);
} };
//#endregion
//#region src/lib/server/metric.ts
const getMetricName = (name) => {
	return kebabCase(name);
};
const getMetricNamespace = (stack = getStack(), app = APP) => {
	return `awsless/${kebabCase(app)}/${kebabCase(stack)}`;
};
const Metric = /*@__PURE__*/ createProxy((stack) => {
	if (stack === "batch") return batchPutData;
	return /* @__PURE__ */ createProxy((metricName) => {
		const name = getMetricName(metricName);
		const namespace = getMetricNamespace(stack);
		const unit = process.env[`METRIC_${constantCase(stack)}_${constantCase(metricName)}`];
		let metric;
		if (!unit && !IS_TEST) throw new TypeError(`Metric "${name}" isn't defined in your stack.`);
		else if (!unit) metric = createMetric({
			name,
			namespace
		});
		else metric = {
			number: createMetric,
			size: createSizeMetric,
			duration: createDurationMetric
		}[unit]({
			name,
			namespace
		});
		return {
			name,
			namespace,
			unit,
			put(value, options) {
				return putData(metric, value, options);
			}
		};
	});
});
//#endregion
//#region src/lib/server/seed.ts
const seed = { uuid(name) {
	const hash = createHash("sha256").update(name).digest();
	hash[6] = hash[6] & 15 | 80;
	hash[8] = hash[8] & 63 | 128;
	const hex = hash.subarray(0, 16).toString("hex");
	return [
		hex.slice(0, 8),
		hex.slice(8, 12),
		hex.slice(12, 16),
		hex.slice(16, 20),
		hex.slice(20, 32)
	].join("-");
} };
//#endregion
//#region src/lib/server/store.ts
const BUCKET = /*@__PURE__*/ formatResourceName({
	resourceType: "store",
	resourceName: "assets",
	postfix: APP_ID
});
const Store = /*@__PURE__*/ createProxy((stack) => {
	return /* @__PURE__ */ createProxy((name) => {
		const scoped = (key) => `store/${kebabCase(stack)}/${kebabCase(name)}/${key}`;
		return {
			name: BUCKET,
			folder: scoped(""),
			async put(key, body, options = {}) {
				await putObject({
					bucket: BUCKET,
					key: scoped(key),
					body,
					...options
				});
			},
			async get(key) {
				const object = await getObject({
					bucket: BUCKET,
					key: scoped(key)
				});
				if (object) return object.body;
			},
			async has(key) {
				return !!await headObject({
					bucket: BUCKET,
					key: scoped(key)
				});
			},
			delete(key) {
				return deleteObject({
					bucket: BUCKET,
					key: scoped(key)
				});
			}
		};
	});
});
//#endregion
export { APP, Alert, Auth, Cache, Config, Cron, Email, Fn, Instance, Job, LIVE_BUNDLE_ALIAS, Metric, PubSub, Queue, ROUTE_HEADER, ROUTE_PROPERTY, Search, Store, Table, Task, Topic, captureInvokedQualifier, formatRouteEnvName, formatRouteKey, formatRoutePayload, getAlertName, getAuthProps, getBundleName, getCacheProps, getConfigName, getConfigValue, getCronName, getCurrentRoute, getFunctionName, getInstanceQueueName, getInstanceQueueUrl, getInvokedQualifier, getJobName, getMetricName, getMetricNamespace, getPubSubPublisherName, getQueueName, getQueueUrl, getRouteEnv, getSearchProps, getStack, getStandaloneFunctionName, getTableName, getTableProps, getTaskName, getTopicName, handle_exports as h, hasBundleRoute, internalInvoke, invokeBundle, isInsideBundle, mock, mockBaselines, mockState, onFailureBucketArn, onFailureBucketName, onFailureQueueArn, onFailureQueueName, s, seed, setBundleRoutes, setConfigValue, setupTestEnv, t, testRegistry, v, withBundleRouteContext };
