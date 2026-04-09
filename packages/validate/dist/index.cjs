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
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  applyRedaction: () => applyRedaction,
  bigfloat: () => bigfloat,
  duration: () => duration,
  dynamoDbStream: () => dynamoDbStream,
  json: () => json,
  maxDuration: () => maxDuration,
  minDuration: () => minDuration,
  positive: () => positive,
  precision: () => precision,
  redact: () => redact,
  s3Event: () => s3Event,
  snsTopic: () => snsTopic,
  sqsQueue: () => sqsQueue,
  unique: () => unique,
  uuid: () => uuid
});
module.exports = __toCommonJS(index_exports);
__reExport(index_exports, require("valibot"), module.exports);

// src/action/redact.ts
var import_valibot = require("valibot");
var REDACTED = "[REDACTED]";
var redact = () => {
  return (0, import_valibot.metadata)({ redact: true });
};
var isPlainObject = (input) => input?.constructor === Object;
var applyRedaction = (schema, input) => {
  const metadata2 = (0, import_valibot.getMetadata)(schema);
  if (metadata2.redact === true) {
    return REDACTED;
  }
  if (schema.type === "union" || schema.type === "variant") {
    const s = schema;
    const matchingBranch = s.options.find((option) => (0, import_valibot.safeParse)(option, input).success);
    if (matchingBranch) {
      return applyRedaction(matchingBranch, input);
    }
  }
  if (schema.type === "array" && Array.isArray(input)) {
    const s = schema;
    const i = input;
    return i.map((item) => applyRedaction(s.item, item));
  }
  if (schema.type === "object" && isPlainObject(input)) {
    const s = schema;
    const i = input;
    const redacted = {};
    for (const key in s.entries) {
      if (key in i) {
        redacted[key] = applyRedaction(s.entries[key], i[key]);
      }
    }
    return redacted;
  }
  if (schema.type === "record" && isPlainObject(input)) {
    const s = schema;
    const i = input;
    const redacted = {};
    for (const key in i) {
      redacted[applyRedaction(s.key, key)] = applyRedaction(s.value, i[key]);
    }
    return redacted;
  }
  if (schema.type === "set" && input instanceof Set) {
    const s = schema;
    const redacted = /* @__PURE__ */ new Set();
    for (const value of input) {
      redacted.add(applyRedaction(s.value, value));
    }
    return redacted;
  }
  if (schema.type === "map" && input instanceof Map) {
    const s = schema;
    const redacted = /* @__PURE__ */ new Map();
    for (const [key, value] of input.entries()) {
      redacted.set(applyRedaction(s.key, key), applyRedaction(s.value, value));
    }
    return redacted;
  }
  return input;
};

// src/schema/json.ts
var import_json = require("@awsless/json");
var import_valibot2 = require("valibot");
var json = (schema, message = "Invalid JSON") => {
  return (0, import_valibot2.pipe)(
    (0, import_valibot2.string)(message),
    (0, import_valibot2.rawTransform)((ctx) => {
      let result;
      try {
        result = (0, import_json.parse)(ctx.dataset.value);
      } catch (_error) {
        ctx.addIssue({
          message
        });
        return ctx.NEVER;
      }
      return result;
    }),
    schema
  );
};

// src/schema/bigfloat.ts
var import_big_float = require("@awsless/big-float");
var import_valibot3 = require("valibot");
function bigfloat(message = "Invalid bigfloat") {
  return (0, import_valibot3.union)(
    [
      (0, import_valibot3.instance)(import_big_float.BigFloat),
      (0, import_valibot3.pipe)(
        (0, import_valibot3.string)(),
        (0, import_valibot3.regex)(/^[+-]?((\d+\.?\d*)|(\.\d+))([eE][+-]?\d+)?$/),
        (0, import_valibot3.transform)((v) => (0, import_big_float.parse)(v))
      ),
      (0, import_valibot3.pipe)(
        (0, import_valibot3.bigint)(),
        (0, import_valibot3.transform)((v) => (0, import_big_float.parse)(v))
      ),
      (0, import_valibot3.pipe)(
        (0, import_valibot3.number)(),
        (0, import_valibot3.transform)((v) => (0, import_big_float.parse)(v))
      )
    ],
    message
  );
}

// src/schema/uuid.ts
var import_valibot4 = require("valibot");
var uuid = (message = "Invalid UUID") => {
  return (0, import_valibot4.pipe)((0, import_valibot4.string)(message), (0, import_valibot4.uuid)(message));
};

// src/schema/duration.ts
var import_duration = require("@awsless/duration");
var import_valibot5 = require("valibot");
function duration(message = "Invalid duration") {
  return (0, import_valibot5.instance)(import_duration.Duration, message);
}

// src/schema/aws/sqs-queue.ts
var import_valibot6 = require("valibot");
var sqsQueue = (schema, message = "Invalid SQS Queue payload") => {
  return (0, import_valibot6.union)(
    [
      // Prioritize the expected payload during production
      (0, import_valibot6.pipe)(
        (0, import_valibot6.object)({
          Records: (0, import_valibot6.array)(
            (0, import_valibot6.object)({
              body: json(schema)
            })
          )
        }),
        (0, import_valibot6.transform)((v) => v.Records.map((r) => r.body))
      ),
      // These are allowed during testing
      (0, import_valibot6.pipe)(
        schema,
        (0, import_valibot6.transform)((v) => [v])
      ),
      (0, import_valibot6.array)(schema)
    ],
    message
  );
};

// src/schema/aws/sns-topic.ts
var import_valibot7 = require("valibot");
var snsTopic = (schema, message = "Invalid SNS Topic payload") => {
  return (0, import_valibot7.union)(
    [
      // Prioritize the expected payload during production
      (0, import_valibot7.pipe)(
        (0, import_valibot7.object)({
          Records: (0, import_valibot7.array)(
            (0, import_valibot7.object)({
              Sns: (0, import_valibot7.object)({
                Message: json(schema)
              })
            })
          )
        }),
        (0, import_valibot7.transform)((v) => v.Records.map((r) => r.Sns.Message))
      ),
      // These are allowed during testing
      (0, import_valibot7.pipe)(
        schema,
        (0, import_valibot7.transform)((v) => [v])
      ),
      (0, import_valibot7.array)(schema)
    ],
    message
  );
};

// src/schema/aws/dynamodb-stream.ts
var import_valibot8 = require("valibot");
var dynamoDbStream = (table, message = "Invalid DynamoDB Stream payload") => {
  const unmarshallKeys = () => (0, import_valibot8.pipe)(
    (0, import_valibot8.unknown)(),
    (0, import_valibot8.transform)((v) => table.unmarshall(v, table.keys))
  );
  const unmarshall = () => (0, import_valibot8.pipe)(
    (0, import_valibot8.unknown)(),
    (0, import_valibot8.transform)((v) => table.unmarshall(v))
  );
  return (0, import_valibot8.pipe)(
    (0, import_valibot8.object)(
      {
        Records: (0, import_valibot8.array)(
          (0, import_valibot8.object)({
            eventName: (0, import_valibot8.picklist)(["MODIFY", "INSERT", "REMOVE"]),
            dynamodb: (0, import_valibot8.object)({
              Keys: unmarshallKeys(),
              OldImage: (0, import_valibot8.optional)(unmarshall()),
              NewImage: (0, import_valibot8.optional)(unmarshall())
            })
          })
        )
      },
      message
    ),
    (0, import_valibot8.transform)((input) => {
      return input.Records.map((record) => {
        const item = {
          event: record.eventName.toLowerCase(),
          keys: record.dynamodb.Keys
        };
        if ("OldImage" in record.dynamodb) {
          item.old = record.dynamodb.OldImage;
        }
        if ("NewImage" in record.dynamodb) {
          item.new = record.dynamodb.NewImage;
        }
        return item;
      });
    })
  );
};

// src/schema/aws/s3-event.ts
var import_valibot9 = require("valibot");
var s3Event = () => {
  const schema = (0, import_valibot9.object)({
    event: (0, import_valibot9.string)(),
    bucket: (0, import_valibot9.string)(),
    key: (0, import_valibot9.string)(),
    size: (0, import_valibot9.number)(),
    eTag: (0, import_valibot9.string)(),
    time: (0, import_valibot9.date)()
  });
  return (0, import_valibot9.union)(
    [
      // Prioritize the expected payload during production
      (0, import_valibot9.pipe)(
        (0, import_valibot9.object)({
          Records: (0, import_valibot9.array)(
            (0, import_valibot9.object)({
              eventTime: (0, import_valibot9.pipe)((0, import_valibot9.string)(), (0, import_valibot9.toDate)()),
              eventName: (0, import_valibot9.string)(),
              s3: (0, import_valibot9.object)({
                bucket: (0, import_valibot9.object)({
                  name: (0, import_valibot9.string)()
                }),
                object: (0, import_valibot9.object)({
                  key: (0, import_valibot9.string)(),
                  size: (0, import_valibot9.number)(),
                  eTag: (0, import_valibot9.string)()
                })
              })
            })
          )
        }),
        (0, import_valibot9.transform)((input) => {
          return input.Records.map((record) => ({
            event: record.eventName,
            time: record.eventTime,
            bucket: record.s3.bucket.name,
            key: record.s3.object.key,
            size: record.s3.object.size,
            eTag: record.s3.object.eTag
          }));
        })
      ),
      // These are allowed during testing
      (0, import_valibot9.pipe)(
        schema,
        (0, import_valibot9.transform)((v) => [v])
      ),
      (0, import_valibot9.array)(schema)
    ],
    "Invalid S3 Event payload"
  );
};

// src/validation/positive.ts
var import_big_float2 = require("@awsless/big-float");
var import_valibot10 = require("valibot");
function positive(message = "Invalid positive number") {
  return (0, import_valibot10.check)((input) => (0, import_big_float2.isPositive)(input), message);
}

// src/validation/precision.ts
var import_big_float3 = require("@awsless/big-float");
var import_valibot11 = require("valibot");
function precision(decimals, message = `Invalid ${decimals} precision number`) {
  return (0, import_valibot11.check)((input) => {
    const big = (0, import_big_float3.parse)(input.toString());
    return -big.exponent <= decimals;
  }, message);
}

// src/validation/unique.ts
var import_valibot12 = require("valibot");
function unique(compare = (a, b) => a === b, message = "None unique array") {
  return (0, import_valibot12.check)((input) => {
    for (const x in input) {
      for (const y in input) {
        if (x !== y && compare(input[x], input[y])) {
          return false;
        }
      }
    }
    return true;
  }, message);
}

// src/validation/duration.ts
var import_valibot13 = require("valibot");
function minDuration(min, message = "Invalid duration") {
  return (0, import_valibot13.check)((input) => input.value >= min.value, message);
}
function maxDuration(max, message = "Invalid duration") {
  return (0, import_valibot13.check)((input) => input.value <= max.value, message);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  applyRedaction,
  bigfloat,
  duration,
  dynamoDbStream,
  json,
  maxDuration,
  minDuration,
  positive,
  precision,
  redact,
  s3Event,
  snsTopic,
  sqsQueue,
  unique,
  uuid,
  ...require("valibot")
});
