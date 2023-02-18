// src/bugsnag.ts
import { request } from "https";

// src/stacktrace.ts
var CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+:\d+|\(native\))/m;
var getStackString = (error) => {
  const stack = error.stack || error.stacktrace;
  return typeof stack === "string" && stack.length && stack !== `${error.name}: ${error.message}` ? stack : void 0;
};
var parseStack = (stackString) => {
  const partialResult = parseV8OrIE(stackString);
  return partialResult.reduce((result, stack) => {
    if (JSON.stringify(stack) === "{}") {
      return result;
    }
    let file = !stack.file && !stack.method && typeof stack.lineNumber === "number" ? "global code" : stack.file || "(unknown file)";
    file = file.replace(/\?.*$/, "").replace(/#.*$/, "");
    let method = stack.method || "(unknown function)";
    method = /^global code$/i.test(method) ? "global code" : method;
    return result.concat([
      {
        file,
        lineNumber: stack.lineNumber,
        columnNumber: stack.columnNumber,
        method
      }
    ]);
  }, []);
};
function parseV8OrIE(stackString) {
  const filtered = stackString.split("\n").filter((line) => !!line.match(CHROME_IE_STACK_REGEXP));
  return filtered.map((line) => {
    if (line.indexOf("(eval ") > -1) {
      line = line.replace(/eval code/g, "eval").replace(/(\(eval at [^()]*)|(\),.*$)/g, "");
    }
    let sanitizedLine = line.replace(/^\s+/, "").replace(/\(eval code/g, "(");
    const location = sanitizedLine.match(/ (\((.+):(\d+):(\d+)\)$)/);
    sanitizedLine = location ? sanitizedLine.replace(location[0], "") : sanitizedLine;
    const tokens = sanitizedLine.split(/\s+/).slice(1);
    const locationParts = extractLocation(location ? location[1] : tokens.pop() || "(no location)");
    const method = tokens.join(" ") || void 0;
    const file = ["eval", "<anonymous>"].indexOf(locationParts[0]) > -1 ? void 0 : locationParts[0];
    return {
      file,
      lineNumber: locationParts[1],
      columnNumber: locationParts[2],
      method
    };
  });
}
function extractLocation(urlLike) {
  if (urlLike.indexOf(":") === -1) {
    return [urlLike];
  }
  const regExp = /(.+?)(?::(\d+))?(?::(\d+))?$/;
  const parts = regExp.exec(urlLike.replace(/[()]/g, ""));
  if (!parts) {
    return [urlLike];
  }
  const line = parts[2] ? parseInt(parts[2], 10) : void 0;
  const col = parts[3] ? parseInt(parts[3], 10) : void 0;
  return [parts[1], line, col];
}

// src/error.ts
function toException(error) {
  const stack = getStackString(error);
  return {
    errorClass: error.name,
    message: error.message,
    stacktrace: stack && parseStack(stack),
    type: "nodejs"
  };
}

// src/bugsnag.ts
var Bugsnag = class {
  apiKey;
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  notify(error, options = {}) {
    return new Promise((resolve, reject) => {
      const req = request({
        hostname: "notify.bugsnag.com",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Bugsnag-Api-Key": this.apiKey,
          "Bugsnag-Payload-Version": 5,
          "Bugsnag-Sent-At": (/* @__PURE__ */ new Date()).toISOString()
        }
      }, (response) => {
        const buffers = [];
        response.on("data", (chunk) => {
          buffers.push(chunk);
        });
        response.on("end", () => {
          const json = Buffer.concat(buffers).toString();
          resolve(json === "OK");
        });
      });
      req.on("error", reject);
      req.end(this.requestBody(error, options));
    });
  }
  requestBody(error, { metaData = {}, unhandled = false } = {}) {
    return JSON.stringify({
      apiKey: this.apiKey,
      payloadVersion: "5",
      notifier: {
        name: "@awsless/bugsnag",
        version: "0.0.1",
        url: "https://github.com/awsless/awsless/tree/master/packages/bugsnag"
      },
      events: [
        {
          exceptions: [toException(error)],
          unhandled,
          severity: "error",
          context: process.env.AWS_LAMBDA_FUNCTION_NAME,
          app: {
            versionCode: process.env.AWS_LAMBDA_FUNCTION_VERSION
          },
          metaData: {
            ...metaData,
            lambda: {
              name: process.env.AWS_LAMBDA_FUNCTION_NAME,
              version: process.env.AWS_LAMBDA_FUNCTION_VERSION,
              region: process.env.AWS_REGION,
              runtime: process.env.AWS_EXECUTION_ENV,
              memorySize: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE
            }
          }
        }
      ]
    });
  }
};

// src/index.ts
var isTestEnv = () => {
  return !!(process.env.TEST || process.env.JEST_WORKER_ID || process.env.VITEST_WORDER_ID);
};
var bugsnag = ({ apiKey = process.env.BUGSNAG_API_KEY } = {}) => {
  const client = new Bugsnag(apiKey || "");
  return async (error, metaData = {}) => {
    if (isTestEnv()) {
      return;
    }
    const err = error;
    await client.notify(error, {
      metaData: {
        errorData: err.metadata || err.metaData || void 0,
        ...metaData
      }
    });
  };
};
export {
  bugsnag
};
