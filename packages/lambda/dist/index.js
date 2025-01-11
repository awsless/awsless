// src/index.ts
import { LambdaClient as LambdaClient3 } from "@aws-sdk/client-lambda";

// src/commands/invoke.ts
import { InvokeCommand } from "@aws-sdk/client-lambda";
import { fromUtf8, toUtf8 } from "@aws-sdk/util-utf8-node";
import { parse, stringify } from "@awsless/json";

// src/errors/viewable.ts
var ViewableError = class extends Error {
  constructor(type, message, data) {
    super(message);
    this.type = type;
    this.data = data;
  }
  name = "ViewableError";
};
var isViewableErrorResponse = (response) => {
  return typeof response === "object" && response !== null && "__error__" in response && typeof response.__error__ === "object";
};
var toViewableErrorResponse = (error) => {
  return {
    __error__: {
      type: error.type,
      data: error.data,
      message: error.message
    }
  };
};

// src/helpers/client.ts
import { LambdaClient } from "@aws-sdk/client-lambda";
import { globalClient } from "@awsless/utils";
var lambdaClient = globalClient(() => {
  return new LambdaClient({});
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
  const command = new InvokeCommand({
    InvocationType: type,
    FunctionName: name,
    Payload: payload ? fromUtf8(stringify(payload)) : void 0,
    Qualifier: qualifier
  });
  const result = await client.send(command);
  if (!result.Payload) {
    return void 0;
  }
  const json = toUtf8(result.Payload);
  if (!json) {
    return void 0;
  }
  const response = parse(json);
  if (isViewableErrorResponse(response)) {
    const e = response.__error__;
    const error = reflectViewableErrors ? new ViewableError(e.type, e.message, e.data) : new Error(e.message);
    error.metadata = {
      functionName: name
    };
    throw error;
  }
  if (isErrorResponse(response)) {
    const error = new Error(response.errorMessage);
    error.name = response.errorType;
    error.metadata = {
      functionName: name
    };
    throw error;
  }
  return response;
};

// src/commands/list-functions.ts
import { ListFunctionsCommand } from "@aws-sdk/client-lambda";
var listFunctions = async ({
  client = lambdaClient(),
  ...params
}) => {
  const command = new ListFunctionsCommand(params);
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
import { ValiError } from "@awsless/validate";
var ValidationError = class extends ViewableError {
  constructor(message, issues) {
    super("validation", message, {
      issues: issues.map((issue) => ({
        path: issue.path?.map((path) => ({
          key: path.key,
          type: path.type
        })),
        reason: issue.reason,
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
    if (error instanceof ValiError) {
      throw new ValidationError(error.message, error.issues);
    }
    throw error;
  }
};

// src/helpers/mock.ts
import {
  InvokeCommand as InvokeCommand2,
  LambdaClient as LambdaClient2,
  ListFunctionsCommand as ListFunctionsCommand2
} from "@aws-sdk/client-lambda";
import { fromUtf8 as fromUtf82, toUtf8 as toUtf82 } from "@aws-sdk/util-utf8-node";
import { parse as parse2, stringify as stringify2 } from "@awsless/json";
import { mockObjectValues, nextTick } from "@awsless/utils";
import { mockClient } from "aws-sdk-client-mock";
var globalList = {};
var mockLambda = (lambdas) => {
  const alreadyMocked = Object.keys(globalList).length > 0;
  const list = mockObjectValues(lambdas);
  Object.assign(globalList, list);
  if (alreadyMocked) {
    return list;
  }
  mockClient(LambdaClient2).on(ListFunctionsCommand2).callsFake(async () => {
    return {
      $metadata: {},
      Functions: [
        {
          FunctionName: "test",
          FunctionArn: "arn:aws:lambda:us-west-2:123456789012:function:project--service--lambda-name"
        }
      ]
    };
  }).on(InvokeCommand2).callsFake(async (input) => {
    const name = input.FunctionName ?? "";
    const type = input.InvocationType ?? "RequestResponse";
    const payload = input.Payload ? parse2(toUtf82(input.Payload)) : void 0;
    const callback = globalList[name];
    if (!callback) {
      throw new TypeError(`Lambda mock function not defined for: ${name}`);
    }
    const result = await nextTick(callback, payload);
    if (type === "RequestResponse" && result) {
      return {
        Payload: fromUtf82(stringify2(result))
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
import { unpatch } from "@awsless/json";
import { parse as parse3 } from "@awsless/validate";

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
import { randomUUID } from "crypto";
var warmerKey = "warmer";
var invocationKey = "__WARMER_INVOCATION_ID__";
var correlationKey = "__WARMER_CORRELATION_ID__";
var concurrencyKey = "concurrency";
var concurrencyLimit = 10;
var isWarmUpEvent = (event) => {
  return typeof event === "object" && event.warmer === true;
};
var getWarmUpEvent = (event) => {
  if (!isWarmUpEvent(event)) return;
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
    const correlation = context?.awsRequestId || randomUUID();
    console.log({
      ...event,
      correlation,
      invocation: 1
    });
    await Promise.all(
      Array.from({ length: input.concurrency - 1 }).map((_, index) => {
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
      })
    );
  }
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
    try {
      const warmUpEvent = getWarmUpEvent(event);
      if (warmUpEvent) {
        await warmUp(warmUpEvent, context);
        return void 0;
      }
      const result = await createTimeoutWrap(context, log, () => {
        return transformValidationErrors(() => {
          const input = options.schema ? parse3(options.schema, event) : event;
          const extendedContext = { ...context ?? {}, event, log };
          return options.handle(input, extendedContext);
        });
      });
      if (isTestEnv) {
        return result;
      }
      return unpatch(result);
    } catch (error) {
      if (!(error instanceof ViewableError) || options.logViewableErrors) {
        await log(error);
      }
      if (error instanceof ViewableError && !isTestEnv) {
        return toViewableErrorResponse(error);
      }
      throw error;
    }
  };
};
export {
  LambdaClient3 as LambdaClient,
  TimeoutError,
  ValidationError,
  ViewableError,
  invoke,
  isViewableErrorResponse,
  lambda,
  lambdaClient,
  listFunctions,
  mockLambda,
  toViewableErrorResponse
};
