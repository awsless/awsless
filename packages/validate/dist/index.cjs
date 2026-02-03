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
  bigfloat: () => bigfloat,
  duration: () => duration,
  dynamoDbStream: () => dynamoDbStream,
  json: () => json,
  maxDuration: () => maxDuration,
  minDuration: () => minDuration,
  positive: () => positive,
  precision: () => precision,
  s3Event: () => s3Event,
  snsTopic: () => snsTopic,
  sqsQueue: () => sqsQueue,
  unique: () => unique,
  uuid: () => uuid
});
module.exports = __toCommonJS(index_exports);
__reExport(index_exports, require("valibot"), module.exports);

// src/schema/json.ts
var import_json = require("@awsless/json");
var import_valibot = require("valibot");
var json = (schema, message = "Invalid JSON") => {
  return (0, import_valibot.pipe)(
    (0, import_valibot.string)(message),
    (0, import_valibot.rawTransform)((ctx) => {
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
var import_valibot2 = require("valibot");
function bigfloat(message = "Invalid bigfloat") {
  return (0, import_valibot2.union)(
    [
      (0, import_valibot2.instance)(import_big_float.BigFloat),
      (0, import_valibot2.pipe)(
        (0, import_valibot2.string)(),
        (0, import_valibot2.decimal)(),
        (0, import_valibot2.transform)((v) => (0, import_big_float.parse)(v))
      ),
      (0, import_valibot2.pipe)(
        (0, import_valibot2.bigint)(),
        (0, import_valibot2.transform)((v) => (0, import_big_float.parse)(v))
      ),
      (0, import_valibot2.pipe)(
        (0, import_valibot2.number)(),
        (0, import_valibot2.transform)((v) => (0, import_big_float.parse)(v))
      )
    ],
    message
  );
}

// src/schema/uuid.ts
var import_valibot3 = require("valibot");
var uuid = (message = "Invalid UUID") => {
  return (0, import_valibot3.pipe)((0, import_valibot3.string)(message), (0, import_valibot3.uuid)(message));
};

// src/schema/duration.ts
var import_duration = require("@awsless/duration");
var import_valibot4 = require("valibot");
function duration(message = "Invalid duration") {
  return (0, import_valibot4.instance)(import_duration.Duration, message);
}

// src/schema/aws/sqs-queue.ts
var import_valibot5 = require("valibot");
var sqsQueue = (schema, message = "Invalid SQS Queue payload") => {
  return (0, import_valibot5.union)(
    [
      // Prioritize the expected payload during production
      (0, import_valibot5.pipe)(
        (0, import_valibot5.object)({
          Records: (0, import_valibot5.array)(
            (0, import_valibot5.object)({
              body: json(schema)
            })
          )
        }),
        (0, import_valibot5.transform)((v) => v.Records.map((r) => r.body))
      ),
      // These are allowed during testing
      (0, import_valibot5.pipe)(
        schema,
        (0, import_valibot5.transform)((v) => [v])
      ),
      (0, import_valibot5.array)(schema)
    ],
    message
  );
};

// src/schema/aws/sns-topic.ts
var import_valibot6 = require("valibot");
var snsTopic = (schema, message = "Invalid SNS Topic payload") => {
  return (0, import_valibot6.union)(
    [
      // Prioritize the expected payload during production
      (0, import_valibot6.pipe)(
        (0, import_valibot6.object)({
          Records: (0, import_valibot6.array)(
            (0, import_valibot6.object)({
              Sns: (0, import_valibot6.object)({
                Message: json(schema)
              })
            })
          )
        }),
        (0, import_valibot6.transform)((v) => v.Records.map((r) => r.Sns.Message))
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

// src/schema/aws/dynamodb-stream.ts
var import_valibot7 = require("valibot");
var dynamoDbStream = (table, message = "Invalid DynamoDB Stream payload") => {
  const unmarshall = () => (0, import_valibot7.pipe)(
    (0, import_valibot7.unknown)(),
    (0, import_valibot7.transform)((v) => table.unmarshall(v))
  );
  return (0, import_valibot7.pipe)(
    (0, import_valibot7.object)(
      {
        Records: (0, import_valibot7.array)(
          (0, import_valibot7.variant)("eventName", [
            (0, import_valibot7.object)({
              eventName: (0, import_valibot7.literal)("MODIFY"),
              dynamodb: (0, import_valibot7.object)({
                Keys: unmarshall(),
                OldImage: unmarshall(),
                NewImage: unmarshall()
              })
            }),
            (0, import_valibot7.object)({
              eventName: (0, import_valibot7.literal)("INSERT"),
              dynamodb: (0, import_valibot7.object)({
                Keys: unmarshall(),
                NewImage: unmarshall()
              })
            }),
            (0, import_valibot7.object)({
              eventName: (0, import_valibot7.literal)("REMOVE"),
              dynamodb: (0, import_valibot7.object)({
                Keys: unmarshall(),
                OldImage: unmarshall()
              })
            })
          ])
        )
      },
      message
    ),
    (0, import_valibot7.transform)((input) => {
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
var import_valibot8 = require("valibot");
var s3Event = () => {
  const schema = (0, import_valibot8.object)({
    event: (0, import_valibot8.string)(),
    bucket: (0, import_valibot8.string)(),
    key: (0, import_valibot8.string)(),
    size: (0, import_valibot8.number)(),
    eTag: (0, import_valibot8.string)(),
    time: (0, import_valibot8.date)()
  });
  return (0, import_valibot8.union)(
    [
      // Prioritize the expected payload during production
      (0, import_valibot8.pipe)(
        (0, import_valibot8.object)({
          Records: (0, import_valibot8.array)(
            (0, import_valibot8.object)({
              eventTime: (0, import_valibot8.pipe)((0, import_valibot8.string)(), (0, import_valibot8.toDate)()),
              eventName: (0, import_valibot8.string)(),
              s3: (0, import_valibot8.object)({
                bucket: (0, import_valibot8.object)({
                  name: (0, import_valibot8.string)()
                }),
                object: (0, import_valibot8.object)({
                  key: (0, import_valibot8.string)(),
                  size: (0, import_valibot8.number)(),
                  eTag: (0, import_valibot8.string)()
                })
              })
            })
          )
        }),
        (0, import_valibot8.transform)((input) => {
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
      (0, import_valibot8.pipe)(
        schema,
        (0, import_valibot8.transform)((v) => [v])
      ),
      (0, import_valibot8.array)(schema)
    ],
    "Invalid S3 Event payload"
  );
};

// src/validation/positive.ts
var import_big_float2 = require("@awsless/big-float");
var import_valibot9 = require("valibot");
function positive(message = "Invalid positive number") {
  return (0, import_valibot9.check)((input) => (0, import_big_float2.isPositive)(input), message);
}

// src/validation/precision.ts
var import_big_float3 = require("@awsless/big-float");
var import_valibot10 = require("valibot");
function precision(decimals, message = `Invalid ${decimals} precision number`) {
  return (0, import_valibot10.check)((input) => {
    const big = (0, import_big_float3.parse)(input.toString());
    return -big.exponent <= decimals;
  }, message);
}

// src/validation/unique.ts
var import_valibot11 = require("valibot");
function unique(compare = (a, b) => a === b, message = "None unique array") {
  return (0, import_valibot11.check)((input) => {
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
var import_valibot12 = require("valibot");
function minDuration(min, message = "Invalid duration") {
  return (0, import_valibot12.check)((input) => input.value >= min.value, message);
}
function maxDuration(max, message = "Invalid duration") {
  return (0, import_valibot12.check)((input) => input.value <= max.value, message);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  bigfloat,
  duration,
  dynamoDbStream,
  json,
  maxDuration,
  minDuration,
  positive,
  precision,
  s3Event,
  snsTopic,
  sqsQueue,
  unique,
  uuid,
  ...require("valibot")
});
