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
var src_exports = {};
__export(src_exports, {
  LambdaClient: () => import_client_lambda4.LambdaClient,
  TimeoutError: () => TimeoutError,
  ValidationError: () => ValidationError,
  ViewableError: () => ViewableError,
  getViewableErrorData: () => getViewableErrorData,
  invoke: () => invoke,
  isViewableError: () => isViewableError,
  isViewableErrorString: () => isViewableErrorString,
  isViewableErrorType: () => isViewableErrorType,
  lambda: () => lambda,
  lambdaClient: () => lambdaClient,
  mockLambda: () => mockLambda,
  parseViewableErrorString: () => parseViewableErrorString
});
module.exports = __toCommonJS(src_exports);

// src/errors/validation.ts
var import_validate = require("@awsless/validate");

// src/errors/viewable.ts
var prefix = "[viewable]";
var ViewableError = class extends Error {
  constructor(type, message, data) {
    super(
      `${prefix} ${JSON.stringify({
        type,
        message,
        data
      })}`
    );
    this.type = type;
    this.data = data;
  }
  name = "ViewableError";
};
var isViewableErrorType = (error, type) => {
  return isViewableError(error) && getViewableErrorData(error).type === type;
};
var isViewableError = (error) => {
  return error instanceof ViewableError || error instanceof Error && isViewableErrorString(error.message);
};
var isViewableErrorString = (value) => {
  return 0 === value.indexOf(prefix);
};
var parseViewableErrorString = (value) => {
  const json = value.substring(prefix.length);
  const data = JSON.parse(json);
  if (typeof data.type !== "string" || typeof data.message !== "string") {
    throw new TypeError("Invalid viewable error string");
  }
  return data;
};
var getViewableErrorData = (error) => {
  return parseViewableErrorString(error.message);
};

// src/errors/validation.ts
var ValidationError = class extends ViewableError {
  constructor(failures) {
    super("validation", "Validation Error", {
      failures: failures.map((failure) => ({
        key: failure.key,
        path: failure.path,
        type: failure.type,
        message: failure.message
      }))
    });
  }
};
var transformValidationErrors = async (callback) => {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof import_validate.StructError) {
      throw new ValidationError(error.failures());
    }
    throw error;
  }
};

// src/lambda.ts
var import_validate2 = require("@awsless/validate");

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

// src/helpers/warm-up.ts
var import_crypto = require("crypto");

// src/commands/invoke.ts
var import_util_utf8_node = require("@aws-sdk/util-utf8-node");
var import_client_lambda2 = require("@aws-sdk/client-lambda");

// src/helpers/client.ts
var import_client_lambda = require("@aws-sdk/client-lambda");
var import_utils = require("@awsless/utils");
var lambdaClient = (0, import_utils.globalClient)(() => {
  return new import_client_lambda.LambdaClient({});
});

// src/commands/invoke.ts
var isErrorResponse = (response) => {
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
    Payload: payload ? (0, import_util_utf8_node.fromUtf8)(JSON.stringify(payload)) : void 0,
    Qualifier: qualifier
  });
  const result = await client.send(command);
  if (!result.Payload) {
    return void 0;
  }
  const json = (0, import_util_utf8_node.toUtf8)(result.Payload);
  if (!json) {
    return void 0;
  }
  const response = JSON.parse(json);
  if (isErrorResponse(response)) {
    let error;
    if (isViewableErrorString(response.errorMessage)) {
      const errorData = parseViewableErrorString(response.errorMessage);
      if (reflectViewableErrors) {
        error = new ViewableError(errorData.type, errorData.message, errorData.data);
      } else {
        error = new Error(errorData.message);
      }
    } else {
      error = new Error(response.errorMessage);
    }
    error.name = response.errorType;
    error.response = response;
    error.metadata = {
      service: name
    };
    throw error;
  }
  return response;
};

// src/helpers/warm-up.ts
var warmerKey = "warmer";
var invocationKey = "__WARMER_INVOCATION_ID__";
var correlationKey = "__WARMER_CORRELATION_ID__";
var concurrencyKey = "concurrency";
var concurrencyLimit = 10;
var isWarmUpEvent = (event) => {
  return typeof event === "object" && event.warmer === true;
};
var getWarmUpEvent = (event) => {
  if (!isWarmUpEvent(event))
    return;
  return {
    invocation: parseInt(String(event[invocationKey]), 10) || 0,
    concurrency: parseInt(String(event[concurrencyKey]), 10) || 3,
    correlation: event[correlationKey]
  };
};
var warmUp = async (input, context) => {
  const event = {
    action: warmerKey,
    functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION
  };
  if (input.concurrency > concurrencyLimit) {
    throw new Error(`Warm up concurrency limit can't be greater than ${concurrencyLimit}`);
  }
  if (input.correlation) {
    console.log({
      ...event,
      ...input
    });
  } else {
    const correlation = context?.awsRequestId || (0, import_crypto.randomUUID)();
    console.log({
      ...event,
      correlation,
      invocation: 1
    });
    await Promise.all(Array.from({ length: input.concurrency - 1 }).map((_, index) => {
      return invoke({
        name: process.env.AWS_LAMBDA_FUNCTION_NAME || "",
        qualifier: "$LATEST",
        payload: {
          [warmerKey]: true,
          [invocationKey]: index + 2,
          [correlationKey]: correlation,
          [concurrencyKey]: input.concurrency
        }
      });
    }));
  }
};

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

// src/lambda.ts
var lambda = (options) => {
  return async (event, context) => {
    const log = async (maybeError) => {
      const error = normalizeError(maybeError);
      const list = [options.logger].flat(10);
      await Promise.all(list.map((logger) => {
        return logger && logger(error, {
          input: event
        });
      }));
    };
    try {
      const warmUpEvent = getWarmUpEvent(event);
      if (warmUpEvent) {
        await warmUp(warmUpEvent, context);
        return void 0;
      }
      const result = await createTimeoutWrap(context, log, async () => {
        const input = await transformValidationErrors(() => options.input ? (0, import_validate2.create)(event, options.input) : event);
        const extendedContext = { ...context || {}, event, log };
        const output = await transformValidationErrors(() => options.handle(input, extendedContext));
        return options.output ? (0, import_validate2.create)(output, options.output) : output;
      });
      if (process.env.NODE_ENV === "test" && result) {
        return JSON.parse(JSON.stringify(result));
      }
      return result;
    } catch (error) {
      if (!isViewableError(error) || options.logViewableErrors) {
        await log(error);
      }
      throw error;
    }
  };
};

// src/helpers/mock.ts
var import_utils2 = require("@awsless/utils");
var import_client_lambda3 = require("@aws-sdk/client-lambda");
var import_util_utf8_node2 = require("@aws-sdk/util-utf8-node");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var mockLambda = (lambdas) => {
  const list = (0, import_utils2.mockObjectValues)(lambdas);
  (0, import_aws_sdk_client_mock.mockClient)(import_client_lambda3.LambdaClient).on(import_client_lambda3.InvokeCommand).callsFake(async (input) => {
    const name = input.FunctionName || "";
    const type = input.InvocationType || "RequestResponse";
    const payload = input.Payload ? JSON.parse((0, import_util_utf8_node2.toUtf8)(input.Payload)) : void 0;
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`Lambda mock function not defined for: ${name}`);
    }
    const result = await (0, import_utils2.nextTick)(callback, payload);
    if (type === "RequestResponse" && result) {
      return {
        Payload: (0, import_util_utf8_node2.fromUtf8)(JSON.stringify(result))
      };
    }
    return {
      Payload: void 0
    };
  });
  beforeEach && beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};

// src/index.ts
var import_client_lambda4 = require("@aws-sdk/client-lambda");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LambdaClient,
  TimeoutError,
  ValidationError,
  ViewableError,
  getViewableErrorData,
  invoke,
  isViewableError,
  isViewableErrorString,
  isViewableErrorType,
  lambda,
  lambdaClient,
  mockLambda,
  parseViewableErrorString
});
