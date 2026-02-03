"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ExpectedError: () => ExpectedError,
  LambdaClient: () => import_client_lambda5.LambdaClient,
  TimeoutError: () => TimeoutError,
  ValidationError: () => ValidationError,
  ViewableError: () => ViewableError,
  invoke: () => invoke,
  isErrorResponse: () => isErrorResponse,
  lambda: () => lambda,
  lambdaClient: () => lambdaClient,
  listFunctions: () => listFunctions,
  mockLambda: () => mockLambda,
  toErrorResponse: () => toErrorResponse
});
module.exports = __toCommonJS(index_exports);
var import_client_lambda5 = require("@aws-sdk/client-lambda");

// src/commands/invoke.ts
var import_client_lambda2 = require("@aws-sdk/client-lambda");
var import_util_utf8_node = require("@aws-sdk/util-utf8-node");
var import_json = require("@awsless/json");

// src/errors/expected.ts
var ExpectedError = class extends Error {
  type = "expected";
  constructor(message) {
    super(message);
  }
};

// src/errors/response.ts
var isErrorResponse = (response) => {
  return typeof response === "object" && response !== null && "__error__" in response && typeof response.__error__ === "object";
};
var toErrorResponse = (error) => {
  return {
    __error__: {
      type: error.type,
      // name: error.name,
      message: error.message
    }
  };
};

// src/helpers/client.ts
var import_client_lambda = require("@aws-sdk/client-lambda");
var import_utils = require("@awsless/utils");
var lambdaClient = (0, import_utils.globalClient)(() => {
  return new import_client_lambda.LambdaClient({});
});

// src/commands/invoke.ts
var isLambdaErrorResponse = (response) => {
  return typeof response === "object" && response !== null && typeof response.errorMessage === "string";
};
var invoke = async ({
  client = lambdaClient(),
  name,
  qualifier,
  type = "RequestResponse",
  payload,
  reflectViewableErrors = true
}) => {
  const command = new import_client_lambda2.InvokeCommand({
    InvocationType: type,
    FunctionName: name,
    Payload: payload ? (0, import_util_utf8_node.fromUtf8)((0, import_json.stringify)(payload)) : void 0,
    Qualifier: qualifier
  });
  const result = await client.send(command);
  if (!result.Payload) {
    return;
  }
  const json = (0, import_util_utf8_node.toUtf8)(result.Payload);
  if (!json) {
    return;
  }
  const response = (0, import_json.parse)(json);
  if (isErrorResponse(response)) {
    const e = response.__error__;
    if (reflectViewableErrors) {
      throw new ExpectedError(e.message);
    } else {
      throw new Error(e.message);
    }
  }
  if (isLambdaErrorResponse(response)) {
    const error = new Error(response.errorMessage);
    error.name = response.errorType;
    throw error;
  }
  return response;
};

// src/commands/list-functions.ts
var import_client_lambda3 = require("@aws-sdk/client-lambda");
var listFunctions = async ({
  client = lambdaClient(),
  ...params
}) => {
  const command = new import_client_lambda3.ListFunctionsCommand(params);
  const result = await client.send(command);
  if (!result.Functions) {
    return;
  }
  return result;
};

// src/errors/timeout.ts
var TimeoutError = class extends Error {
  constructor(remainingTime) {
    super(`Lambda will timeout in ${remainingTime}ms`);
  }
};
var createTimeoutWrap = async (context, log, callback) => {
  if (!context) {
    return callback();
  }
  const time = context.getRemainingTimeInMillis();
  const delay = Math.max(time - 1e3, 1e3);
  const id = setTimeout(() => {
    log(new TimeoutError(context.getRemainingTimeInMillis()));
  }, delay);
  try {
    return await callback();
  } finally {
    clearTimeout(id);
  }
};

// src/errors/validation.ts
var import_validate = require("@awsless/validate");

// src/errors/viewable.ts
var ViewableError = class extends Error {
  constructor(type, message, data) {
    super(message);
    this.type = type;
    this.data = data;
  }
  name = "ViewableError";
};

// src/errors/validation.ts
var ValidationError = class extends ViewableError {
  constructor(message, issues) {
    super("validation", message, {
      issues: issues.map((issue) => ({
        path: issue.path?.map((path) => ({
          key: path.key,
          type: path.type
        })),
        // reason: issue.reason,
        message: issue.message,
        received: issue.received,
        expected: issue.expected
      }))
    });
  }
};
var transformValidationErrors = async (callback) => {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof import_validate.ValiError) {
      throw new ValidationError(error.message, error.issues);
    }
    throw error;
  }
};

// src/helpers/mock.ts
var import_client_lambda4 = require("@aws-sdk/client-lambda");
var import_util_utf8_node2 = require("@aws-sdk/util-utf8-node");
var import_json2 = require("@awsless/json");
var import_utils2 = require("@awsless/utils");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var globalList = {};
var mockLambda = (lambdas) => {
  const alreadyMocked = Object.keys(globalList).length > 0;
  const list = (0, import_utils2.mockObjectValues)(lambdas);
  Object.assign(globalList, list);
  if (alreadyMocked) {
    return list;
  }
  (0, import_aws_sdk_client_mock.mockClient)(import_client_lambda4.LambdaClient).on(import_client_lambda4.ListFunctionsCommand).callsFake(async () => {
    return {
      $metadata: {},
      Functions: [
        {
          FunctionName: "test",
          FunctionArn: "arn:aws:lambda:us-west-2:123456789012:function:project--service--lambda-name"
        }
      ]
    };
  }).on(import_client_lambda4.InvokeCommand).callsFake(async (input) => {
    const name = input.FunctionName ?? "";
    const type = input.InvocationType ?? "RequestResponse";
    const payload = input.Payload ? (0, import_json2.parse)((0, import_util_utf8_node2.toUtf8)(input.Payload)) : void 0;
    const callback = globalList[name];
    if (!callback) {
      throw new TypeError(`Lambda mock function not defined for: ${name}`);
    }
    const result = await (0, import_utils2.nextTick)(callback, payload);
    if (type === "RequestResponse" && result) {
      return {
        Payload: (0, import_util_utf8_node2.fromUtf8)((0, import_json2.stringify)(result))
      };
    }
    return {
      Payload: void 0
    };
  });
  beforeEach && beforeEach(() => {
    Object.values(globalList).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};

// src/lambda.ts
var import_json3 = require("@awsless/json");
var import_validate2 = require("@awsless/validate");

// src/context/global-context.ts
var GlobalContext = class {
  #store;
  async run(store, callback) {
    this.#store = store;
    try {
      const res = await callback();
      return res;
    } finally {
      this.#store = void 0;
    }
  }
  get() {
    return this.#store;
  }
};

// src/context/lambda-context.ts
var eventContext = new GlobalContext();

// src/helpers/error.ts
var normalizeError = (maybeError) => {
  if (maybeError instanceof Error) {
    return maybeError;
  }
  switch (typeof maybeError) {
    case "string":
    case "number":
    case "boolean":
      return new Error(String(maybeError));
    case "object":
      return new Error(JSON.stringify(maybeError));
  }
  const error = new Error("Received a non-error.");
  error.name = "InvalidError";
  return error;
};

// src/helpers/warm-up.ts
var warmerKey = "warmer";
var concurrencyKey = "concurrency";
var concurrencyLimit = 10;
var isWarmUpEvent = (event) => {
  return typeof event === "object" && event.warmer === true;
};
var getWarmUpEvent = (event) => {
  if (!isWarmUpEvent(event)) return;
  return {
    concurrency: parseInt(String(event[concurrencyKey]), 10) || 3
  };
};
var warmUp = async (input) => {
  if (input.concurrency > concurrencyLimit) {
    throw new Error(`Warm up concurrency limit can't be greater than ${concurrencyLimit}`);
  }
  if (input.concurrency <= 1) {
    return;
  }
  await invoke({
    name: process.env.AWS_LAMBDA_FUNCTION_NAME ?? "",
    // qualifier: '$LATEST',
    payload: {
      [warmerKey]: true,
      [concurrencyKey]: input.concurrency - 1
    }
  });
};

// src/lambda.ts
var lambda = (options) => {
  return async (event, context) => {
    const log = async (maybeError) => {
      const error = normalizeError(maybeError);
      const list = [options.logger].flat(10);
      await Promise.all(
        list.map((logger) => {
          return logger?.(error, {
            input: event
          });
        })
      );
    };
    const isTestEnv = process.env.NODE_ENV === "test";
    const successCallbacks = [];
    const failureCallbacks = [];
    const finallyCallbacks = [];
    try {
      const warmUpEvent = getWarmUpEvent(event);
      if (warmUpEvent) {
        await warmUp(warmUpEvent);
        return void 0;
      }
      const result = await createTimeoutWrap(context, log, () => {
        return transformValidationErrors(() => {
          const raw = typeof event === "undefined" || isTestEnv ? event : (0, import_json3.patch)(event);
          const input = options.schema ? (0, import_validate2.parse)(options.schema, raw) : raw;
          const extendedContext = {
            // ...(context ?? {}),
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
      if (isTestEnv) {
        return (0, import_json3.parse)((0, import_json3.stringify)(result));
      }
      return (0, import_json3.unpatch)(result);
    } catch (error) {
      await Promise.all(failureCallbacks.map((cb) => cb(error)));
      if (!(error instanceof ViewableError) && !(error instanceof ExpectedError) || options.logViewableErrors) {
        await log(error);
      }
      if (!isTestEnv) {
        if (error instanceof ViewableError) {
          return toErrorResponse(error);
        }
        if (error instanceof ExpectedError) {
          return toErrorResponse(error);
        }
      }
      throw error;
    } finally {
      await Promise.all(finallyCallbacks.map((cb) => cb()));
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ExpectedError,
  LambdaClient,
  TimeoutError,
  ValidationError,
  ViewableError,
  invoke,
  isErrorResponse,
  lambda,
  lambdaClient,
  listFunctions,
  mockLambda,
  toErrorResponse
});
