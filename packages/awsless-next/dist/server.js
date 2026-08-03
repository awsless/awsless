import {
  createProxy
} from "./chunk-XERFMF6Z.js";
import {
  __export
} from "./chunk-MLKGABMK.js";

// src/server.ts
import * as s from "@awsless/open-search";
import * as t from "@awsless/dynamodb";
import * as v from "@awsless/validate";

// src/lib/handle/index.ts
var handle_exports = {};
__export(handle_exports, {
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

// src/lib/handle/failure.ts
import {
  array,
  date,
  isoTimestamp,
  object,
  optional,
  picklist,
  pipe,
  string,
  transform,
  union,
  unknown
} from "@awsless/validate";

// src/lib/handle/util.ts
import { lambda } from "@awsless/lambda";
var consumer = (schema, handle) => {
  return lambda({
    schema,
    handle,
    throwExpectedErrors: true
  });
};

// src/lib/handle/failure.ts
var onErrorLogSchema = object({
  hash: string(),
  requestId: string(),
  origin: string(),
  level: picklist(["warn", "error", "fatal"]),
  type: string(),
  message: string(),
  stackTrace: optional(array(string())),
  data: optional(unknown()),
  date: union([
    date(),
    pipe(
      string(),
      isoTimestamp(),
      transform((v2) => new Date(v2))
    )
  ])
});
var failure = (handle) => {
  return consumer(void 0, handle);
};
var error = (handle) => {
  return consumer(onErrorLogSchema, handle);
};

// src/lib/handle/func.ts
import { lambda as lambda2 } from "@awsless/lambda";
function func(arg1, arg2) {
  const schema = arg2 ? arg1 : void 0;
  const handle = arg2 ?? arg1;
  return lambda2({
    schema,
    handle,
    throwExpectedErrors: !!process.env.THROW_EXPECTED_ERRORS
  });
}
function task(arg1, arg2) {
  const schema = arg2 ? arg1 : void 0;
  const handle = arg2 ?? arg1;
  return consumer(schema, handle);
}
var cron = (handle) => {
  return consumer(void 0, handle);
};

// src/lib/handle/image.ts
import { object as object2, string as string2 } from "@awsless/validate";
var imageOriginSchema = object2(
  {
    path: string2()
  },
  "Invalid image origin input"
);
var image = (handle) => {
  return consumer(imageOriginSchema, handle);
};
var icon = image;

// src/lib/handle/queue.ts
import { sqsQueue } from "@awsless/validate";
var queue = (schema, handle) => {
  return consumer(sqsQueue(schema), handle);
};

// src/lib/handle/route.ts
import { isErrorResponse, lambda as lambda3 } from "@awsless/lambda";
import {
  boolean,
  custom,
  json,
  object as object3,
  optional as optional2,
  picklist as picklist2,
  pipe as pipe2,
  record,
  string as string3,
  transform as transform2,
  unknown as unknown2
} from "@awsless/validate";
var RouteRequest = class {
  method;
  url;
  headers;
  // The validated route extras.
  params;
  query;
  // The parsed & validated request body, when a body schema is given.
  data;
  ip;
  userAgent;
  // The raw request body bytes.
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
  // The body decoded as text.
  text() {
    return this.body?.toString();
  }
  // The body parsed as json.
  json() {
    return JSON.parse(this.text() ?? "null");
  }
};
var envelopeSchema = object3({
  rawPath: optional2(string3()),
  rawQueryString: optional2(string3()),
  body: optional2(string3()),
  isBase64Encoded: optional2(boolean()),
  headers: optional2(record(string3(), string3())),
  pathParameters: optional2(record(string3(), string3())),
  queryStringParameters: optional2(record(string3(), string3())),
  requestContext: object3({
    domainName: string3(),
    http: object3({
      method: picklist2(["GET", "POST", "HEAD", "OPTIONS", "PUT", "PATCH", "DELETE"]),
      path: string3(),
      sourceIp: string3(),
      userAgent: string3()
    })
  })
});
var extractParts = (event2) => {
  let params = event2.pathParameters ?? {};
  if (Object.keys(params).length === 0) {
    for (const [name, value] of Object.entries(event2.headers ?? {})) {
      if (name.startsWith("x-param-")) {
        params[name.slice("x-param-".length)] = value;
      }
    }
  }
  let query = event2.queryStringParameters ?? {};
  if (Object.keys(query).length === 0 && event2.rawQueryString) {
    query = Object.fromEntries(new URLSearchParams(event2.rawQueryString));
  }
  const body = typeof event2.body === "string" ? event2.isBase64Encoded ? Buffer.from(event2.body, "base64").toString() : event2.body : void 0;
  return { event: event2, params, query, body };
};
var partsSchema = (props) => {
  return object3({
    event: custom(() => true),
    params: props.params ?? optional2(unknown2()),
    query: props.query ?? optional2(unknown2()),
    body: props.body ? json(props.body) : optional2(unknown2())
  });
};
var buildRequest = (props, parts) => {
  const { event: event2, params, query, body } = parts;
  const headers = new Headers();
  for (const [name, value] of Object.entries(event2.headers ?? {})) {
    headers.set(name, value);
  }
  const method = event2.requestContext.http.method;
  const domain = event2.requestContext.domainName;
  const path = event2.rawPath ?? event2.requestContext.http.path;
  const protocol = headers.get("x-forwarded-proto") ?? "https";
  const url = `${protocol}://${domain}${path}${event2.rawQueryString ? `?${event2.rawQueryString}` : ""}`;
  const rawBody = typeof event2.body === "undefined" ? void 0 : event2.isBase64Encoded ? Buffer.from(event2.body, "base64") : Buffer.from(event2.body);
  const data2 = props.body ? body : void 0;
  return new RouteRequest({
    method,
    url,
    headers,
    params,
    query,
    data: data2,
    ip: event2.requestContext.http.sourceIp,
    userAgent: event2.requestContext.http.userAgent,
    body: rawBody
  });
};
var routeSchema = (props) => {
  return pipe2(
    envelopeSchema,
    transform2(extractParts),
    partsSchema(props),
    transform2((parts) => buildRequest(props, parts))
  );
};
var isTextual = (contentType) => {
  return contentType.startsWith("text/") || contentType.includes("json") || contentType.includes("xml") || contentType.includes("javascript") || contentType.includes("x-www-form-urlencoded");
};
var toLambdaUrlResult = async (response) => {
  const headers = {};
  const cookies = [];
  response.headers.forEach((value, name) => {
    if (name.toLowerCase() === "set-cookie") {
      cookies.push(value);
    } else {
      headers[name] = value;
    }
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  const textual = isTextual(headers["content-type"] ?? "text/plain");
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
  const handler = lambda3({
    schema: routeSchema(props),
    handle: async (request, context) => {
      const result = await handle(request, context);
      return result instanceof Response ? toLambdaUrlResult(result) : result;
    }
  });
  return async (event2, context) => {
    const result = await handler(event2, context);
    if (isErrorResponse(result)) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: result.__error__.message })
      };
    }
    return result;
  };
}
var site = (handle) => {
  return lambda3({
    schema: routeSchema({}),
    handle: async (request, context) => {
      const result = await handle(request, context);
      return result instanceof Response ? toLambdaUrlResult(result) : result;
    }
  });
};

// src/lib/handle/topic.ts
import { snsTopic } from "@awsless/validate";
function subscribe(source, handle) {
  const schema = typeof source === "function" ? source.schema : source;
  return consumer(snsTopic(schema), handle);
}

// src/lib/handle/pubsub.ts
var pubsub_exports = {};
__export(pubsub_exports, {
  auth: () => auth,
  connected: () => connected,
  disconnected: () => disconnected,
  subscribed: () => subscribed,
  unsubscribed: () => unsubscribed
});
import { array as array2, date as date2, literal, object as object4, optional as optional3, snsTopic as snsTopic2, string as string4, unknown as unknown3 } from "@awsless/validate";
var authEventSchema = object4({
  token: optional3(string4())
});
var auth = (handle) => {
  return consumer(authEventSchema, handle);
};
var lifecycle = (event2) => {
  return object4({
    event: literal(event2),
    date: date2(),
    socketId: string4(),
    ip: string4(),
    context: optional3(unknown3())
  });
};
var lifecycleWithTopics = (event2) => {
  return object4({
    event: literal(event2),
    date: date2(),
    socketId: string4(),
    ip: string4(),
    context: optional3(unknown3()),
    topics: array2(string4())
  });
};
var connectedSchema = snsTopic2(lifecycle("connected"));
var disconnectedSchema = snsTopic2(lifecycle("disconnected"));
var subscribedSchema = snsTopic2(lifecycleWithTopics("subscribed"));
var unsubscribedSchema = snsTopic2(lifecycleWithTopics("unsubscribed"));
var connected = (handle) => {
  return consumer(connectedSchema, handle);
};
var disconnected = (handle) => {
  return consumer(disconnectedSchema, handle);
};
var subscribed = (handle) => {
  return consumer(subscribedSchema, handle);
};
var unsubscribed = (handle) => {
  return consumer(unsubscribedSchema, handle);
};

// src/lib/handle/rpc.ts
var rpc_exports = {};
__export(rpc_exports, {
  auth: () => auth2
});
import { object as object5, string as string5 } from "@awsless/validate";
var authEventSchema2 = object5({
  token: string5()
});
var auth2 = (handle) => {
  return consumer(authEventSchema2, handle);
};

// src/lib/handle/store.ts
var store_exports = {};
__export(store_exports, {
  event: () => event
});
import { array as array3, object as object6, pipe as pipe3, string as string6, transform as transform3, union as union2 } from "@awsless/validate";
var storeNotificationSchema = union2(
  [
    pipe3(
      object6({ bucket: string6(), key: string6() }),
      transform3((v2) => [v2])
    ),
    array3(object6({ bucket: string6(), key: string6() })),
    pipe3(
      object6({
        Records: array3(
          object6({
            s3: object6({
              bucket: object6({ name: string6() }),
              object: object6({ key: string6() })
            })
          })
        )
      }),
      transform3((input) => {
        return input.Records.map((record2) => ({
          bucket: record2.s3.bucket.name,
          key: record2.s3.object.key
        }));
      })
    )
  ],
  "Invalid store notification input"
);
var event = (handle) => {
  return consumer(storeNotificationSchema, handle);
};

// src/lib/handle/table.ts
var table_exports = {};
__export(table_exports, {
  stream: () => stream
});
import { dynamoDbStream } from "@awsless/validate";
var stream = (table, handle) => {
  return consumer(dynamoDbStream(table), handle);
};

// src/lib/server/alert.ts
import { stringify } from "@awsless/json";
import { publish } from "@awsless/sns";

// src/lib/server/util.ts
import { kebabCase as kebabCase2 } from "change-case";

// src/lib/server/bundle.ts
import { invoke } from "@awsless/lambda";
import { kebabCase } from "change-case";
import { AsyncLocalStorage } from "async_hooks";
var ROUTE_PROPERTY = "$awsless-route";
var LIVE_BUNDLE_ALIAS = "live";
var getBundleName = () => `${process.env.APP ?? "app"}--function--bundle`;
var formatRouteKey = (stackName, resourceType, resourceName) => {
  return [stackName, resourceType, resourceName].map((v2) => kebabCase(v2)).join(":");
};
var formatRoutePayload = (routeKey, event2) => {
  return {
    [ROUTE_PROPERTY]: routeKey,
    event: event2
  };
};
var invokeBundle = ({ routeKey, payload, ...options }) => {
  return invoke({
    ...options,
    name: getBundleName(),
    qualifier: options.qualifier ?? process.env.AWS_LAMBDA_FUNCTION_VERSION ?? LIVE_BUNDLE_ALIAS,
    payload: formatRoutePayload(routeKey, payload)
  });
};
var bundleContext = new AsyncLocalStorage();
var isInsideBundle = () => bundleContext.getStore() !== void 0;
var getCurrentRoute = () => bundleContext.getStore()?.routeKey;
var withBundleRoute = (routeKey, internalInvoke2, callback) => {
  return bundleContext.run({ routeKey, internalInvoke: internalInvoke2 }, callback);
};
var internalInvoke = (routeKey, payload) => {
  const context = bundleContext.getStore();
  if (!context) {
    throw new Error("Internal invocations are only available inside the bundle");
  }
  return context.internalInvoke(routeKey, payload);
};
var formatRouteEnvName = (routeKey, name) => {
  return `${routeKey}:${name}`;
};
var getRouteEnv = (name) => {
  const routeKey = getCurrentRoute() ?? process.env.AWSLESS_ROUTE;
  return process.env[routeKey ? formatRouteEnvName(routeKey, name) : name];
};

// src/lib/server/util.ts
var APP = process.env.APP ?? "app";
var APP_ID = process.env.APP_ID ?? "app-id";
var getStack = () => (getCurrentRoute() ?? process.env.AWSLESS_ROUTE)?.split(":")[0] ?? "stack";
var IS_TEST = process.env.NODE_ENV === "test";
var IS_LOCAL = process.env.AWSLESS_ENV === "local";
var REGION = process.env.AWS_REGION;
var ACCOUNT_ID = process.env.AWS_ACCOUNT_ID;
var build = (opt) => {
  return [
    //
    opt?.prefix,
    APP,
    opt.stackName,
    opt.resourceType,
    opt.resourceName,
    opt?.postfix
  ].filter((v2) => typeof v2 === "string").map((v2) => kebabCase2(v2)).join(opt.seperator ?? "--");
};
var bindLocalResourceName = (resourceType) => {
  return (resourceName, stackName = getStack()) => {
    return build({
      stackName,
      resourceType,
      resourceName
    });
  };
};
var bindGlobalResourceName = (resourceType) => {
  return (resourceName) => {
    return build({
      resourceType,
      resourceName
    });
  };
};

// src/lib/server/alert.ts
var getAlertName = bindGlobalResourceName("alert");
var Alert = /* @__PURE__ */ createProxy((name) => {
  const topic = getAlertName(name);
  const ctx = {
    [topic]: async (subject, payload, options = {}) => {
      await publish({
        ...options,
        topic,
        subject,
        payload: typeof payload === "string" || typeof payload === "undefined" ? payload : stringify(payload)
      });
    }
  };
  const call = ctx[topic];
  return call;
});

// src/lib/server/config.ts
import { ssm } from "@awsless/ssm";
import { kebabCase as kebabCase3 } from "change-case";
var getConfigName = (name) => {
  return `/.awsless/${APP}/${name}`;
};
var loadConfigData = /* @__NO_SIDE_EFFECTS__ */ async () => {
  if (!IS_TEST) {
    const keys = [];
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("CONFIG_")) {
        keys.push(process.env[key]);
      }
    }
    if (keys.length > 0) {
      const paths = {};
      for (const key of keys) {
        paths[kebabCase3(key)] = getConfigName(key);
      }
      return ssm(paths);
    }
  }
  return {};
};
var data = await /* @__PURE__ */ loadConfigData();
var getConfigValue = (name) => {
  const key = kebabCase3(name);
  const value = data[key];
  if (typeof value === "undefined") {
    throw new Error(
      `The "${name}" config value hasn't been set yet. ${IS_TEST ? `Use "Config.${name} = 'VAlUE'" to define your mock value.` : `Define access to the desired config value inside your awsless stack file.`}`
    );
  }
  return value;
};
var setConfigValue = (name, value) => {
  const key = kebabCase3(name);
  data[key] = value;
};
var Config = /* @__PURE__ */ new Proxy(
  {},
  {
    get(_, name) {
      return getConfigValue(name);
    },
    set(_, name, value) {
      setConfigValue(name, value);
      return true;
    }
  }
);

// src/lib/server/function.ts
import { stringify as stringify2 } from "@awsless/json";
import { invoke as invoke2 } from "@awsless/lambda";
import { WeakCache } from "@awsless/weak-cache";
var cache = new WeakCache();
var getFunctionName = bindLocalResourceName("function");
var Fn = /* @__PURE__ */ createProxy((stackName) => {
  return createProxy((funcName) => {
    const name = getFunctionName(funcName, stackName);
    const routeKey = formatRouteKey(stackName, "function", funcName);
    const send = async (payload, options = {}) => {
      if (IS_TEST) {
        return invoke2({
          ...options,
          name,
          payload
        });
      }
      if (isInsideBundle() && !options.qualifier && !options.client) {
        return internalInvoke(routeKey, payload);
      }
      return invokeBundle({
        ...options,
        routeKey,
        payload
      });
    };
    const ctx = {
      [name]: (payload, options = {}) => {
        const { cache: shouldCache, ...invokeOptions } = options;
        if (!shouldCache) {
          return send(payload, invokeOptions);
        }
        const cacheKey = stringify2([routeKey, payload, invokeOptions.qualifier]);
        const cached = cache.get(cacheKey);
        if (cached) {
          return cached;
        }
        const pending = send(payload, invokeOptions).catch((error2) => {
          cache.delete(cacheKey);
          throw error2;
        });
        cache.set(cacheKey, pending);
        return pending;
      }
    };
    const call = ctx[name];
    call.cached = (payload, options = {}) => {
      return call(payload, { ...options, cache: true });
    };
    return call;
  });
});

// src/lib/server/instance.ts
import { getCachedQueueUrl, sendMessage } from "@awsless/sqs";
import { constantCase } from "change-case";
var getInstanceQueueName = bindLocalResourceName("instance");
var getInstanceQueueUrl = (name, stack = getStack()) => {
  return process.env[`INSTANCE_${constantCase(stack)}_${constantCase(name)}_URL`];
};
var Instance = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((name) => {
    const url = getInstanceQueueUrl(name, stack);
    const queue2 = getInstanceQueueName(name, stack);
    const ctx = {
      [queue2]: async (payload, options = {}) => {
        const resolved = url ?? await getCachedQueueUrl(queue2);
        return sendMessage({
          ...options,
          queue: resolved,
          payload,
          attributes: {
            ...options.attributes ?? {},
            queueUrl: resolved,
            queueName: queue2
          }
        });
      }
    };
    const send = ctx[queue2];
    send.url = url;
    return send;
  });
});

// src/lib/server/job.ts
import { runTask } from "@awsless/ecs";
import { stringify as stringify3 } from "@awsless/json";
import { putObject } from "@awsless/s3";
import { kebabCase as kebabCase4 } from "change-case";
import { randomUUID } from "crypto";
var getJobName = bindLocalResourceName("job");
var Job = /* @__PURE__ */ createProxy((stackName) => {
  return createProxy((jobName) => {
    const name = getJobName(jobName, stackName);
    const ctx = {
      [name]: async (payload) => {
        const cluster = `${APP}-job`;
        if (!process.env.JOB_SUBNETS) throw new Error("JOB_SUBNETS env var is not set. Is the job feature deployed?");
        if (!process.env.JOB_SECURITY_GROUP) throw new Error("JOB_SECURITY_GROUP env var is not set. Is the job feature deployed?");
        const subnets = JSON.parse(process.env.JOB_SUBNETS);
        const securityGroup = process.env.JOB_SECURITY_GROUP;
        let storedPayload = payload;
        const bucket = process.env.JOB_PAYLOAD_BUCKET;
        if (payload !== void 0 && bucket) {
          const key = `job/payloads/${randomUUID()}.json`;
          await putObject({ bucket, key, body: stringify3(payload), contentType: "application/json" });
          storedPayload = `s3://${bucket}/${key}`;
        }
        return runTask({
          cluster,
          taskDefinition: name,
          subnets,
          securityGroups: [securityGroup],
          container: `container-${kebabCase4(jobName)}`,
          payload: storedPayload
        });
      }
    };
    return ctx[name];
  });
});

// src/lib/server/pubsub.ts
import { invoke as invoke3 } from "@awsless/lambda";
var getPubSubPublisherName = bindGlobalResourceName("pubsub-publisher");
var PubSub = /* @__PURE__ */ createProxy((name) => {
  const routeKey = formatRouteKey("base", "pubsub", `${name}-publisher`);
  return {
    publish: async (topic, event2, payload) => {
      const message = { topic, event: event2, payload };
      if (IS_TEST) {
        await invoke3({
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
    }
  };
});

// src/lib/server/queue.ts
import {
  sendMessage as sendMessage2,
  sendMessageBatch
} from "@awsless/sqs";
import { constantCase as constantCase2 } from "change-case";
var bindQueueBaseName = bindLocalResourceName("queue");
var getQueueName = (name, stack = getStack()) => {
  return `${bindQueueBaseName(name, stack)}.fifo`;
};
var getQueueUrl = (name, stack = getStack()) => {
  return process.env[`QUEUE_${constantCase2(stack)}_${constantCase2(name)}_URL`];
};
var Queue = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((queue2) => {
    const url = getQueueUrl(queue2, stack);
    const name = getQueueName(queue2, stack);
    const ctx = {
      [name]: (payload, options = {}) => {
        return sendMessage2({
          ...options,
          queue: url ?? name,
          payload,
          attributes: {
            ...options.attributes ?? {},
            ...url ? { queueUrl: url } : {},
            queueName: name
          }
        });
      }
    };
    const send = ctx[name];
    send.url = url;
    send.batch = (items, options = {}) => {
      return sendMessageBatch({
        ...options,
        queue: url ?? name,
        items: items.map((item) => ({
          ...item,
          attributes: {
            ...item.attributes ?? {},
            ...url ? { queueUrl: url } : {},
            queueName: name
          }
        }))
      });
    };
    return send;
  });
});

// src/lib/server/task.ts
import { invoke as invoke4 } from "@awsless/lambda";
import { schedule } from "@awsless/scheduler";

// src/lib/server/on-failure.ts
var onFailureBucketName = build({
  resourceType: "on-failure",
  resourceName: "failure",
  postfix: APP_ID
});
var onFailureQueueName = build({
  resourceType: "on-failure",
  resourceName: "failure"
});
var onFailureBucketArn = `arn:aws:s3:::${onFailureBucketName}`;
var onFailureQueueArn = `arn:aws:sqs:${REGION}:${ACCOUNT_ID}:${onFailureQueueName}`;

// src/lib/server/task.ts
var getTaskName = bindLocalResourceName("task");
var Task = /* @__PURE__ */ createProxy((stackName) => {
  return createProxy((taskName) => {
    const name = getTaskName(taskName, stackName);
    const routeKey = formatRouteKey(stackName, "task", taskName);
    const ctx = {
      [name]: async (payload, options = {}) => {
        if (IS_TEST) {
          await invoke4({
            ...options,
            type: "Event",
            name,
            payload
          });
        } else if (options.schedule) {
          const resourceTaskName = bindGlobalResourceName("task");
          await schedule({
            name: `${getBundleName()}:${LIVE_BUNDLE_ALIAS}`,
            payload: formatRoutePayload(routeKey, payload),
            schedule: options.schedule,
            group: resourceTaskName("group"),
            roleArn: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/${resourceTaskName("schedule")}`,
            deadLetterArn: onFailureQueueArn
          });
        } else {
          await invokeBundle({
            ...options,
            routeKey,
            payload,
            type: "Event"
          });
        }
      }
    };
    return ctx[name];
  });
});

// src/lib/server/topic.ts
import { stringify as stringify4 } from "@awsless/json";
import { publish as publish2 } from "@awsless/sns";
import { parse } from "@awsless/validate";
var getTopicName = bindGlobalResourceName("topic");
var Topic = /* @__PURE__ */ createProxy((name) => {
  const topic = getTopicName(name);
  return {
    name: topic,
    define(schema) {
      const publisher = async (payload, options = {}) => {
        await publish2({
          ...options,
          topic,
          payload: stringify4(parse(schema, payload))
        });
      };
      Object.defineProperty(publisher, "name", { value: topic });
      Object.defineProperty(publisher, "schema", { value: schema });
      return publisher;
    }
  };
});

// src/lib/server/search.ts
import { define, searchClient } from "@awsless/open-search";
import { kebabCase as kebabCase5 } from "change-case";
var getSearchProps = (name, stack = getStack()) => {
  return {
    domain: process.env.SEARCH_DOMAIN,
    name: IS_TEST ? `${kebabCase5(APP)}--${kebabCase5(stack)}--${name}` : `${kebabCase5(stack)}--${name}`
  };
};
var Search = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((name) => {
    const { domain, name: index } = getSearchProps(name, stack);
    let client;
    return {
      name: index,
      domain,
      define(schema) {
        return define(index, schema, () => {
          if (!client) {
            client = searchClient({ node: `${IS_LOCAL || IS_TEST ? "http" : "https"}://${domain}` }, "es");
          }
          return client;
        });
      }
    };
  });
});

// src/lib/server/table.ts
import { define as define2 } from "@awsless/dynamodb";
import { constantCase as constantCase3 } from "change-case";
var getTableName = bindLocalResourceName("table");
var getTableProps = (name, stack = getStack()) => {
  const raw = process.env[`TABLE_${constantCase3(stack)}_${constantCase3(name)}_KEYS`];
  return {
    name: getTableName(name, stack),
    keys: raw ? JSON.parse(raw) : void 0
  };
};
var Table = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((name) => {
    return {
      name: getTableName(name, stack),
      define(schema) {
        const { name: tableName, keys } = getTableProps(name, stack);
        if (!keys) {
          throw new Error(
            `No table key config found for "${stack}.${name}". Is the table defined in your stack file?`
          );
        }
        return define2(tableName, {
          hash: keys.hash,
          sort: keys.sort,
          indexes: keys.indexes,
          schema
        });
      }
    };
  });
});

// src/lib/test/cleanup.ts
var callbacks = [];
var hooked = false;
var registerTestCleanup = (callback) => {
  callbacks.push(callback);
};
var hookTestCleanup = () => {
  if (hooked || typeof afterAll === "undefined") {
    return;
  }
  hooked = true;
  afterAll(async () => {
    await Promise.all(callbacks.splice(0).map((callback) => callback()));
  });
};

// src/lib/test/setup.ts
var testRegistry = {
  functions: {},
  tasks: {},
  queues: {},
  topics: {},
  pubsub: {},
  alerts: {},
  jobs: {},
  instances: {}
};
var realHandler = (importFile, file) => {
  let cached;
  return vi.fn((payload) => {
    cached ??= importFile(file).then((module) => {
      const handle = module.default;
      if (typeof handle !== "function") {
        throw new Error(`The handler file has no default export: ${file}`);
      }
      return handle;
    });
    return cached.then((handle) => handle(payload));
  });
};
var setupTestEnv = async (manifest, options) => {
  const [
    { mockDynamoDB, migrate, DynamoDBClient, streamTable, define: define3, object: object7, any },
    { mockLambda },
    { mockS3 },
    { mockScheduler },
    { mockSNS },
    { mockSQS },
    { mockCloudWatch },
    { mockEcs }
  ] = await Promise.all([
    import("@awsless/dynamodb"),
    import("@awsless/lambda"),
    import("@awsless/s3"),
    import("@awsless/scheduler"),
    import("@awsless/sns"),
    import("@awsless/sqs"),
    import("@awsless/cloudwatch"),
    import("@awsless/ecs")
  ]);
  mockCloudWatch();
  hookTestCleanup();
  for (const [name, value] of Object.entries(manifest.configs)) {
    setConfigValue(name, value);
  }
  if (manifest.tables.length > 0) {
    const app = process.env.APP;
    const tables = manifest.tables.map((table) => ({
      ...table,
      TableName: table.TableName.replace(`${manifest.app}--`, `${app}--`)
    }));
    const shared = manifest.servers?.dynamo;
    if (shared) {
      const client = new DynamoDBClient({
        endpoint: shared.endpoint,
        region: manifest.region,
        credentials: { accessKeyId: "local", secretAccessKey: "local" }
      });
      await migrate(client, tables);
      client.destroy();
    } else {
      const streams = (manifest.streams ?? []).map((entry) => {
        return streamTable(
          define3(getTableName(entry.id, entry.stack), {
            hash: entry.hash,
            sort: entry.sort,
            schema: object7({}, any())
          }),
          async (payload) => {
            const consumer2 = await options.importFile(entry.file);
            await consumer2.default(payload);
          }
        );
      });
      mockDynamoDB({ tables, stream: streams });
    }
  }
  if (manifest.servers?.search) {
    const domain = manifest.servers.search.domain;
    for (const entry of manifest.searches ?? []) {
      const { name } = getSearchProps(entry.id, entry.stack);
      const result = await fetch(`http://${domain}/${name}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mappings: entry.mappings, settings: entry.settings })
      });
      if (!result.ok) {
        throw new Error(`Failed to create the search index "${name}": ${await result.text()}`);
      }
    }
  }
  mockS3();
  if ((manifest.caches ?? []).length > 0) {
    const shared = manifest.servers?.redis;
    if (shared) {
      const { createIoRedisClient: createIoRedisClient2, overrideOptions } = await import("@awsless/redis");
      const db = (parseInt(process.env.VITEST_POOL_ID ?? "1", 10) || 1) % 256;
      overrideOptions({
        host: shared.host,
        port: shared.port,
        db,
        cluster: false,
        tls: void 0
      });
      const client = createIoRedisClient2({ host: shared.host, port: shared.port, db });
      await client.send("FLUSHDB", []);
      await client.destroy();
    } else {
      const { mockCache } = await import("./cache-G4ZG5FQ4.js");
      mockCache();
    }
  }
  const lambdas = {};
  const tasks = {};
  const queues = {};
  const topics = {};
  for (const entry of manifest.functions) {
    const spy = realHandler(options.importFile, entry.file);
    testRegistry.functions[getFunctionName(entry.id, entry.stack)] = spy;
    lambdas[getFunctionName(entry.id, entry.stack)] = spy;
  }
  for (const entry of manifest.tasks) {
    const spy = realHandler(options.importFile, entry.file);
    testRegistry.tasks[getTaskName(entry.id, entry.stack)] = spy;
    lambdas[getTaskName(entry.id, entry.stack)] = spy;
    tasks[getTaskName(entry.id, entry.stack)] = spy;
  }
  for (const id of manifest.pubsub) {
    const spy = vi.fn(() => {
    });
    testRegistry.pubsub[getPubSubPublisherName(id)] = spy;
    lambdas[getPubSubPublisherName(id)] = spy;
  }
  for (const entry of manifest.queues) {
    const spy = realHandler(options.importFile, entry.file);
    testRegistry.queues[getQueueName(entry.id, entry.stack)] = spy;
    queues[getQueueName(entry.id, entry.stack)] = spy;
  }
  for (const id of manifest.topics) {
    const spy = vi.fn(() => {
    });
    testRegistry.topics[getTopicName(id)] = spy;
    topics[getTopicName(id)] = spy;
  }
  for (const id of manifest.alerts ?? []) {
    const spy = vi.fn(() => {
    });
    testRegistry.alerts[getAlertName(id)] = spy;
    topics[getAlertName(id)] = spy;
  }
  for (const entry of manifest.instances ?? []) {
    const spy = vi.fn(() => {
    });
    testRegistry.instances[getInstanceQueueName(entry.id, entry.stack)] = spy;
    queues[getInstanceQueueName(entry.id, entry.stack)] = spy;
  }
  const jobs = {};
  for (const entry of manifest.jobs ?? []) {
    const spy = vi.fn(() => {
    });
    testRegistry.jobs[getJobName(entry.id, entry.stack)] = spy;
    jobs[getJobName(entry.id, entry.stack)] = spy;
  }
  mockLambda(lambdas);
  mockScheduler(tasks);
  mockSQS(queues);
  mockSNS(topics);
  mockEcs(jobs);
  beforeEach(() => {
    for (const registry of Object.values(testRegistry)) {
      for (const spy of Object.values(registry)) {
        spy.mockClear();
      }
    }
  });
};

// src/lib/test/mock.ts
var overridable = (registry, name) => {
  const spy = registry[name];
  if (!spy) {
    throw new Error(
      `No test mock exists for "${name}". Make sure the resource is declared in your app config & the tests run through "awsless test".`
    );
  }
  return new Proxy(spy, {
    apply(_target, _thisArg, args) {
      const impl = args[0];
      spy.mockImplementation(typeof impl === "function" ? impl : async () => impl);
    }
  });
};
var mock = {
  function: createProxy((stack) => {
    return createProxy((name) => overridable(testRegistry.functions, getFunctionName(name, stack)));
  }),
  task: createProxy((stack) => {
    return createProxy((name) => overridable(testRegistry.tasks, getTaskName(name, stack)));
  }),
  queue: createProxy((stack) => {
    return createProxy((name) => overridable(testRegistry.queues, getQueueName(name, stack)));
  }),
  topic: createProxy((name) => overridable(testRegistry.topics, getTopicName(name))),
  pubsub: createProxy((name) => overridable(testRegistry.pubsub, getPubSubPublisherName(name))),
  alert: createProxy((name) => overridable(testRegistry.alerts, getAlertName(name))),
  job: createProxy((stack) => {
    return createProxy((name) => overridable(testRegistry.jobs, getJobName(name, stack)));
  }),
  instance: createProxy((stack) => {
    return createProxy((name) => overridable(testRegistry.instances, getInstanceQueueName(name, stack)));
  }),
  config: createProxy((name) => (value) => setConfigValue(name, value))
};

// src/lib/server/auth.ts
import { constantCase as constantCase4 } from "change-case";
var getAuthProps = (name) => {
  return {
    userPoolId: process.env[`AUTH_${constantCase4(name)}_USER_POOL_ID`],
    clientId: process.env[`AUTH_${constantCase4(name)}_CLIENT_ID`]
  };
};
var Auth = /* @__PURE__ */ createProxy((name) => {
  const { userPoolId, clientId } = getAuthProps(name);
  return {
    userPoolId,
    clientId
    // async listUsers(limit: number, filter?: string) {
    // 	return client.send(
    // 		new ListUsersCommand({
    // 			UserPoolId: userPoolId,
    // 			Limit: limit,
    // 			Filter: filter,
    // 		})
    // 	)
    // },
  };
});

// src/lib/server/cache.ts
import { getContext } from "@awsless/lambda";
import { createIoRedisClient, createLazyClient } from "@awsless/redis";
import { constantCase as constantCase5 } from "change-case";
var getCacheProps = (name, stack = getStack()) => {
  const prefix = `CACHE_${constantCase5(stack)}_${constantCase5(name)}`;
  return {
    host: process.env[`${prefix}_HOST`],
    port: parseInt(process.env[`${prefix}_PORT`], 10)
  };
};
var Cache = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((name) => {
    return (db = 0) => {
      return createLazyClient(() => {
        const client = createIoRedisClient({
          ...getCacheProps(name, stack),
          db,
          // The local dev cache runs a plain single node redis
          // without tls.
          ...IS_LOCAL ? {
            cluster: false,
            tls: void 0
          } : {
            cluster: true,
            tls: {
              checkServerIdentity: () => {
                return void 0;
              }
            }
          }
        });
        if (IS_TEST) {
          registerTestCleanup(() => client.destroy());
        } else {
          getContext().onFinally(() => {
            return client.destroy();
          });
        }
        return client;
      });
    };
  });
});

// src/lib/server/cron.ts
import { invoke as invoke5 } from "@awsless/lambda";
var getCronName = bindLocalResourceName("cron");
var Cron = /* @__PURE__ */ createProxy((stackName) => {
  return createProxy((cronName) => {
    const name = getCronName(cronName, stackName);
    const routeKey = formatRouteKey(stackName, "cron", cronName);
    const ctx = {
      [name]: async (payload, options = {}) => {
        if (IS_TEST) {
          await invoke5({
            ...options,
            type: "Event",
            name,
            payload
          });
          return;
        }
        await invokeBundle({
          ...options,
          routeKey,
          payload,
          type: "Event"
        });
      }
    };
    return ctx[name];
  });
});

// src/lib/server/metric.ts
import {
  batchPutData,
  createDurationMetric,
  createMetric,
  createSizeMetric,
  putData
} from "@awsless/cloudwatch";
import { constantCase as constantCase6, kebabCase as kebabCase6 } from "change-case";
var getMetricName = (name) => {
  return kebabCase6(name);
};
var getMetricNamespace = (stack = getStack(), app = APP) => {
  return `awsless/${kebabCase6(app)}/${kebabCase6(stack)}`;
};
var Metric = /* @__PURE__ */ createProxy((stack) => {
  if (stack === "batch") {
    return batchPutData;
  }
  return createProxy((metricName) => {
    const name = getMetricName(metricName);
    const namespace = getMetricNamespace(stack);
    const unit = process.env[`METRIC_${constantCase6(stack)}_${constantCase6(metricName)}`];
    let metric;
    if (!unit && !IS_TEST) {
      throw new TypeError(`Metric "${name}" isn't defined in your stack.`);
    } else if (!unit) {
      metric = createMetric({ name, namespace });
    } else {
      const factories = {
        number: createMetric,
        size: createSizeMetric,
        duration: createDurationMetric
      };
      metric = factories[unit]({
        name,
        namespace
      });
    }
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

// src/lib/server/store.ts
import { deleteObject, getObject, headObject, putObject as putObject2 } from "@awsless/s3";
import { kebabCase as kebabCase7 } from "change-case";
var BUCKET = `${APP}--store--assets--${APP_ID}`;
var Store = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((name) => {
    const scoped = (key) => `store/${kebabCase7(stack)}/${kebabCase7(name)}/${key}`;
    return {
      name: BUCKET,
      async put(key, body, options = {}) {
        await putObject2({
          bucket: BUCKET,
          key: scoped(key),
          body,
          ...options
        });
      },
      async get(key) {
        const object7 = await getObject({ bucket: BUCKET, key: scoped(key) });
        if (object7) {
          return object7.body;
        }
        return void 0;
      },
      async has(key) {
        const object7 = await headObject({ bucket: BUCKET, key: scoped(key) });
        return !!object7;
      },
      delete(key) {
        return deleteObject({ bucket: BUCKET, key: scoped(key) });
      }
    };
  });
});
export {
  APP,
  Alert,
  Auth,
  Cache,
  Config,
  Cron,
  Fn,
  Instance,
  Job,
  LIVE_BUNDLE_ALIAS,
  Metric,
  PubSub,
  Queue,
  ROUTE_PROPERTY,
  Search,
  Store,
  Table,
  Task,
  Topic,
  formatRouteEnvName,
  formatRouteKey,
  formatRoutePayload,
  getAlertName,
  getAuthProps,
  getBundleName,
  getCacheProps,
  getConfigName,
  getConfigValue,
  getCronName,
  getCurrentRoute,
  getFunctionName,
  getInstanceQueueName,
  getInstanceQueueUrl,
  getJobName,
  getMetricName,
  getMetricNamespace,
  getPubSubPublisherName,
  getQueueName,
  getQueueUrl,
  getRouteEnv,
  getSearchProps,
  getStack,
  getTableName,
  getTableProps,
  getTaskName,
  getTopicName,
  handle_exports as h,
  internalInvoke,
  invokeBundle,
  isInsideBundle,
  mock,
  onFailureBucketArn,
  onFailureBucketName,
  onFailureQueueArn,
  onFailureQueueName,
  s,
  setConfigValue,
  setupTestEnv,
  t,
  testRegistry,
  v,
  withBundleRoute
};
