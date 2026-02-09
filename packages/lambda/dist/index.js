// src/index.ts
import { LambdaClient as LambdaClient3 } from "@aws-sdk/client-lambda";

// src/commands/invoke.ts
import { InvokeCommand } from "@aws-sdk/client-lambda";
import { fromUtf8, toUtf8 } from "@aws-sdk/util-utf8-node";
import { parse, stringify } from "@awsless/json";

// src/errors/expected.ts
var ExpectedError = class extends Error {
  // readonly type = 'expected'
  constructor(type, message) {
    super(message);
    this.type = type;
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
import { LambdaClient } from "@aws-sdk/client-lambda";
import { globalClient } from "@awsless/utils";
var lambdaClient = globalClient(() => {
  return new LambdaClient({});
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
  const command = new InvokeCommand({
    InvocationType: type,
    FunctionName: name,
    Payload: payload ? fromUtf8(stringify(payload)) : void 0,
    Qualifier: qualifier
  });
  const result = await client.send(command);
  if (!result.Payload) {
    return;
  }
  const json = toUtf8(result.Payload);
  if (!json) {
    return;
  }
  const response = parse(json);
  if (isErrorResponse(response)) {
    const e = response.__error__;
    if (reflectViewableErrors) {
      throw new ExpectedError(e.type, e.message);
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
var ValidationError = class extends ExpectedError {
  constructor(message) {
    super("validation", message);
  }
};
var transformValidationErrors = async (callback) => {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof ValiError) {
      throw new ValidationError(error.message);
    }
    throw error;
  }
};

// src/errors/viewable.ts
var ViewableError = class extends Error {
  constructor(type, message, data) {
    super(message);
    this.type = type;
    this.data = data;
  }
  name = "ViewableError";
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
import { parse as parse3, patch, stringify as stringify3, unpatch } from "@awsless/json";
import { parse as valiParse } from "@awsless/validate";

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
          const raw = typeof event === "undefined" || isTestEnv ? event : patch(event);
          const input = options.schema ? valiParse(options.schema, raw) : raw;
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
        return parse3(stringify3(result));
      }
      return unpatch(result);
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
export {
  ExpectedError,
  LambdaClient3 as LambdaClient,
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
};
