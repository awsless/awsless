// src/errors/validation.ts
import { ValiError } from "@awsless/validate";

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
  constructor(issues) {
    super("validation", "Validation Error", {
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
      throw new ValidationError(error.issues);
    }
    throw error;
  }
};

// src/lambda.ts
import { parse } from "@awsless/validate";

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
import { randomUUID } from "crypto";

// src/commands/invoke.ts
import { fromUtf8, toUtf8 } from "@aws-sdk/util-utf8-node";
import { InvokeCommand } from "@aws-sdk/client-lambda";

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
    Payload: payload ? fromUtf8(JSON.stringify(payload)) : void 0,
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
      await Promise.all(
        list.map((logger) => {
          return logger?.(error, {
            input: event
          });
        })
      );
    };
    try {
      const warmUpEvent = getWarmUpEvent(event);
      if (warmUpEvent) {
        await warmUp(warmUpEvent, context);
        return void 0;
      }
      const result = await createTimeoutWrap(context, log, () => {
        return transformValidationErrors(() => {
          const input = options.schema ? parse(options.schema, event) : event;
          const extendedContext = { ...context ?? {}, event, log };
          return options.handle(input, extendedContext);
        });
      });
      if (result && process.env.NODE_ENV === "test") {
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
import { nextTick, mockObjectValues } from "@awsless/utils";
import { InvokeCommand as InvokeCommand2, LambdaClient as LambdaClient2 } from "@aws-sdk/client-lambda";
import { fromUtf8 as fromUtf82, toUtf8 as toUtf82 } from "@aws-sdk/util-utf8-node";
import { mockClient } from "aws-sdk-client-mock";
var mockLambda = (lambdas) => {
  const list = mockObjectValues(lambdas);
  mockClient(LambdaClient2).on(InvokeCommand2).callsFake(async (input) => {
    const name = input.FunctionName ?? "";
    const type = input.InvocationType ?? "RequestResponse";
    const payload = input.Payload ? JSON.parse(toUtf82(input.Payload)) : void 0;
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`Lambda mock function not defined for: ${name}`);
    }
    const result = await nextTick(callback, payload);
    if (type === "RequestResponse" && result) {
      return {
        Payload: fromUtf82(JSON.stringify(result))
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
import { LambdaClient as LambdaClient3 } from "@aws-sdk/client-lambda";
export {
  LambdaClient3 as LambdaClient,
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
};
