import {
  createProxy
} from "./chunk-XERFMF6Z.js";

// src/lib/mock/job.ts
import { mockEcs } from "@awsless/ecs";

// src/lib/server/job.ts
import { runTask } from "@awsless/ecs";
import { stringify } from "@awsless/json";
import { putObject } from "@awsless/s3";
import { kebabCase as kebabCase3 } from "change-case";
import { randomUUID } from "crypto";

// src/lib/server/util.ts
import { kebabCase as kebabCase2 } from "change-case";

// src/lib/server/bundle.ts
import { invoke } from "@awsless/lambda";
import { kebabCase } from "change-case";
import { AsyncLocalStorage } from "async_hooks";
var ROUTE_PROPERTY = "$awsless-route";
var LATEST_BUNDLE_ALIAS = "latest";
var getBundleName = () => `${process.env.APP ?? "app"}--function--bundle`;
var formatRouteKey = (stackName, resourceType, resourceName) => {
  return [stackName, resourceType, resourceName].map((v) => kebabCase(v)).join(":");
};
var formatRoutePayload = (routeKey, event) => {
  return {
    [ROUTE_PROPERTY]: routeKey,
    event
  };
};
var invokeBundle = ({ routeKey, payload, ...options }) => {
  return invoke({
    ...options,
    name: getBundleName(),
    qualifier: options.qualifier ?? process.env.AWS_LAMBDA_FUNCTION_VERSION ?? LATEST_BUNDLE_ALIAS,
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
  ].filter((v) => typeof v === "string").map((v) => kebabCase2(v)).join(opt.seperator ?? "--");
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

// src/lib/server/job.ts
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
          await putObject({ bucket, key, body: stringify(payload), contentType: "application/json" });
          storedPayload = `s3://${bucket}/${key}`;
        }
        return runTask({
          cluster,
          taskDefinition: name,
          subnets,
          securityGroups: [securityGroup],
          container: `container-${kebabCase3(jobName)}`,
          payload: storedPayload
        });
      }
    };
    return ctx[name];
  });
});

// src/lib/mock/job.ts
var mockJob = (cb) => {
  process.env.JOB_SUBNETS = JSON.stringify(["mock-subnet"]);
  process.env.JOB_SECURITY_GROUP = "mock-sg";
  const list = {};
  const mock = createProxy((stack) => {
    return createProxy((name) => {
      return (handle = () => {
      }) => {
        list[getJobName(name, stack)] = handle;
      };
    });
  });
  cb(mock);
  const mocks = mockEcs(list);
  return createProxy((stack) => {
    return createProxy((name) => {
      return mocks[getJobName(name, stack)];
    });
  });
};

// src/lib/mock/alert.ts
import { mockSNS } from "@awsless/sns";

// src/lib/server/alert.ts
import { stringify as stringify2 } from "@awsless/json";
import { publish } from "@awsless/sns";
var getAlertName = bindGlobalResourceName("alert");
var Alert = /* @__PURE__ */ createProxy((name) => {
  const topic = getAlertName(name);
  const ctx = {
    [topic]: async (subject, payload, options = {}) => {
      await publish({
        ...options,
        topic,
        subject,
        payload: typeof payload === "string" || typeof payload === "undefined" ? payload : stringify2(payload)
      });
    }
  };
  const call = ctx[topic];
  return call;
});

// src/lib/mock/alert.ts
var mockAlert = (cb) => {
  const list = {};
  const mock = createProxy((name) => {
    return (handle) => {
      list[getAlertName(name)] = handle ?? (() => {
      });
    };
  });
  cb(mock);
  const result = mockSNS(list);
  return createProxy((name) => {
    return result[getAlertName(name)];
  });
};

// src/lib/mock/cache.ts
import { mockRedis } from "@awsless/redis";
var mockCache = () => {
  return mockRedis();
};

// src/lib/mock/function.ts
import { mockLambda } from "@awsless/lambda";

// src/lib/server/function.ts
import { stringify as stringify3 } from "@awsless/json";
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
        const cacheKey = stringify3([routeKey, payload, invokeOptions.qualifier]);
        const cached = cache.get(cacheKey);
        if (cached) {
          return cached;
        }
        const pending = send(payload, invokeOptions).catch((error) => {
          cache.delete(cacheKey);
          throw error;
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

// src/lib/mock/function.ts
var mockFunction = (cb) => {
  const list = {};
  const mock = createProxy((stack) => {
    return createProxy((name) => {
      return (handleOrResponse) => {
        const handle = typeof handleOrResponse === "function" ? handleOrResponse : () => handleOrResponse;
        list[getFunctionName(name, stack)] = handle;
      };
    });
  });
  cb(mock);
  const result = mockLambda(list);
  return createProxy((stack) => {
    return createProxy((name) => {
      return result[getFunctionName(name, stack)];
    });
  });
};

// src/lib/mock/metric.ts
import { mockCloudWatch } from "@awsless/cloudwatch";
var mockMetric = () => {
  return mockCloudWatch();
};

// src/lib/mock/instance.ts
import { mockSQS } from "@awsless/sqs";

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
    const queue = getInstanceQueueName(name, stack);
    const ctx = {
      [queue]: async (payload, options = {}) => {
        const resolved = url ?? await getCachedQueueUrl(queue);
        return sendMessage({
          ...options,
          queue: resolved,
          payload,
          attributes: {
            ...options.attributes ?? {},
            queueUrl: resolved,
            queueName: queue
          }
        });
      }
    };
    const send = ctx[queue];
    send.url = url;
    return send;
  });
});

// src/lib/mock/instance.ts
var mockInstance = (cb) => {
  const list = {};
  const mock = createProxy((stack) => {
    return createProxy((name) => {
      return (handle) => {
        list[getInstanceQueueName(name, stack)] = handle ?? (() => {
        });
      };
    });
  });
  cb(mock);
  const result = mockSQS(list);
  return createProxy((stack) => {
    return createProxy((name) => {
      return result[getInstanceQueueName(name, stack)];
    });
  });
};

// src/lib/mock/pubsub.ts
import { mockLambda as mockLambda2 } from "@awsless/lambda";

// src/lib/server/pubsub.ts
import { invoke as invoke3 } from "@awsless/lambda";
var getPubSubPublisherName = bindGlobalResourceName("pubsub-publisher");
var PubSub = /* @__PURE__ */ createProxy((name) => {
  const routeKey = formatRouteKey(APP, "pubsub", `${name}-publisher`);
  return {
    publish: async (topic, event, payload) => {
      const message = { topic, event, payload };
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

// src/lib/mock/pubsub.ts
var mockPubSub = (cb) => {
  const list = {};
  const mock = createProxy((name) => {
    return (handle) => {
      list[getPubSubPublisherName(name)] = handle ?? (() => {
      });
    };
  });
  cb(mock);
  const result = mockLambda2(list);
  return createProxy((name) => {
    return result[getPubSubPublisherName(name)];
  });
};

// src/lib/mock/queue.ts
import { mockSQS as mockSQS2 } from "@awsless/sqs";

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
  return createProxy((queue) => {
    const url = getQueueUrl(queue, stack);
    const name = getQueueName(queue, stack);
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

// src/lib/mock/queue.ts
var mockQueue = (cb) => {
  const list = {};
  const mock = createProxy((stack) => {
    return createProxy((name) => {
      return (handle) => {
        list[getQueueName(name, stack)] = handle ?? (() => {
        });
      };
    });
  });
  cb(mock);
  const result = mockSQS2(list);
  return createProxy((stack) => {
    return createProxy((name) => {
      return result[getQueueName(name, stack)];
    });
  });
};

// src/lib/mock/task.ts
import { mockLambda as mockLambda3 } from "@awsless/lambda";
import { mockScheduler } from "@awsless/scheduler";

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
            name: `${getBundleName()}:${LATEST_BUNDLE_ALIAS}`,
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

// src/lib/mock/task.ts
var mockTask = (cb) => {
  const list = {};
  const mock = createProxy((stack) => {
    return createProxy((name) => {
      return (handle) => {
        list[getTaskName(name, stack)] = vi.fn(handle);
      };
    });
  });
  cb(mock);
  mockLambda3(list);
  mockScheduler(list);
  beforeEach && beforeEach(() => {
    for (const item of Object.values(list)) {
      item.mockClear();
    }
  });
  return createProxy((stack) => {
    return createProxy((name) => {
      return list[getTaskName(name, stack)];
    });
  });
};

// src/lib/mock/topic.ts
import { mockSNS as mockSNS2 } from "@awsless/sns";

// src/lib/server/topic.ts
import { stringify as stringify4 } from "@awsless/json";
import { publish as publish2 } from "@awsless/sns";
var getTopicName = bindGlobalResourceName("topic");
var Topic = /* @__PURE__ */ createProxy((name) => {
  const topic = getTopicName(name);
  const ctx = {
    [topic]: async (payload, options = {}) => {
      await publish2({
        ...options,
        topic,
        payload: stringify4(payload)
      });
    }
  };
  const call = ctx[topic];
  return call;
});

// src/lib/mock/topic.ts
var mockTopic = (cb) => {
  const list = {};
  const mock = createProxy((name) => {
    return (handle) => {
      list[getTopicName(name)] = handle ?? (() => {
      });
    };
  });
  cb(mock);
  const result = mockSNS2(list);
  return createProxy((name) => {
    return result[getTopicName(name)];
  });
};

// src/lib/server/auth.ts
import { constantCase as constantCase3 } from "change-case";
var getAuthProps = (name) => {
  return {
    userPoolId: process.env[`AUTH_${constantCase3(name)}_USER_POOL_ID`],
    clientId: process.env[`AUTH_${constantCase3(name)}_CLIENT_ID`]
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
import { constantCase as constantCase4 } from "change-case";
var getCacheProps = (name, stack = getStack()) => {
  const prefix = `CACHE_${constantCase4(stack)}_${constantCase4(name)}`;
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
          cluster: true,
          db,
          tls: {
            checkServerIdentity: () => {
              return void 0;
            }
          }
        });
        getContext().onFinally(() => {
          return client.destroy();
        });
        return client;
      });
    };
  });
});

// src/lib/server/config.ts
import { ssm } from "@awsless/ssm";
import { kebabCase as kebabCase4 } from "change-case";
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
        paths[kebabCase4(key)] = getConfigName(key);
      }
      return ssm(paths);
    }
  }
  return {};
};
var data = await /* @__PURE__ */ loadConfigData();
var getConfigValue = (name) => {
  const key = kebabCase4(name);
  const value = data[key];
  if (typeof value === "undefined") {
    throw new Error(
      `The "${name}" config value hasn't been set yet. ${IS_TEST ? `Use "Config.${name} = 'VAlUE'" to define your mock value.` : `Define access to the desired config value inside your awsless stack file.`}`
    );
  }
  return value;
};
var setConfigValue = (name, value) => {
  const key = kebabCase4(name);
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
import { constantCase as constantCase5, kebabCase as kebabCase5 } from "change-case";
var getMetricName = (name) => {
  return kebabCase5(name);
};
var getMetricNamespace = (stack = getStack(), app = APP) => {
  return `awsless/${kebabCase5(app)}/${kebabCase5(stack)}`;
};
var Metric = /* @__PURE__ */ createProxy((stack) => {
  if (stack === "batch") {
    return batchPutData;
  }
  return createProxy((metricName) => {
    const name = getMetricName(metricName);
    const namespace = getMetricNamespace(stack);
    const unit = process.env[`METRIC_${constantCase5(stack)}_${constantCase5(metricName)}`];
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

// src/lib/server/on-error-log.ts
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
      transform((v) => new Date(v))
    )
  ])
});

// src/lib/server/search.ts
import { define, searchClient } from "@awsless/open-search";
import { constantCase as constantCase6 } from "change-case";
var getSearchName = bindLocalResourceName("search");
var getSearchProps = (name, stack = getStack()) => {
  return {
    domain: process.env[`SEARCH_${constantCase6(stack)}_${constantCase6(name)}_DOMAIN`]
  };
};
var Search = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((name) => {
    const { domain } = getSearchProps(name, stack);
    let client;
    return {
      domain,
      defineTable(tableName, schema) {
        return define(tableName, schema, () => {
          if (!client) client = searchClient({ node: `https://${domain}` }, "es");
          return client;
        });
      }
    };
  });
});

// src/lib/server/store.ts
import { deleteObject, getObject, headObject, putObject as putObject2 } from "@awsless/s3";
import { kebabCase as kebabCase6 } from "change-case";
var BUCKET = `${APP}--store--assets--${APP_ID}`;
var Store = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((name) => {
    const scoped = (key) => `store/${kebabCase6(stack)}/${kebabCase6(name)}/${key}`;
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
        const object2 = await getObject({ bucket: BUCKET, key: scoped(key) });
        if (object2) {
          return object2.body;
        }
        return void 0;
      },
      async has(key) {
        const object2 = await headObject({ bucket: BUCKET, key: scoped(key) });
        return !!object2;
      },
      delete(key) {
        return deleteObject({ bucket: BUCKET, key: scoped(key) });
      }
    };
  });
});

// src/lib/server/table.ts
var getTableName = bindLocalResourceName("table");
var Table = /* @__PURE__ */ createProxy((stack) => {
  return createProxy((name) => {
    return getTableName(name, stack);
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
  LATEST_BUNDLE_ALIAS,
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
  getSearchName,
  getSearchProps,
  getStack,
  getTableName,
  getTaskName,
  getTopicName,
  internalInvoke,
  invokeBundle,
  isInsideBundle,
  mockAlert,
  mockCache,
  mockFunction,
  mockInstance,
  mockJob,
  mockMetric,
  mockPubSub,
  mockQueue,
  mockTask,
  mockTopic,
  onErrorLogSchema,
  onFailureBucketArn,
  onFailureBucketName,
  onFailureQueueArn,
  onFailureQueueName,
  setConfigValue,
  withBundleRoute
};
