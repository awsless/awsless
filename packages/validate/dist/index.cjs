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
var src_exports = {};
__export(src_exports, {
  bigfloat: () => bigfloat,
  bigint: () => bigint2,
  date: () => date,
  duration: () => duration,
  dynamoDbStream: () => dynamoDbStream,
  json: () => json,
  maxDuration: () => maxDuration,
  minDuration: () => minDuration,
  positive: () => positive,
  precision: () => precision,
  snsTopic: () => snsTopic,
  sqsQueue: () => sqsQueue,
  unique: () => unique,
  uuid: () => uuid
});
module.exports = __toCommonJS(src_exports);
__reExport(src_exports, require("valibot"), module.exports);

// src/schema/json.ts
var import_valibot = require("valibot");
var json = (schema) => {
  return (0, import_valibot.transform)(
    (0, import_valibot.string)(),
    (value) => {
      try {
        return JSON.parse(value);
      } catch (error) {
        return null;
      }
    },
    schema
  );
};

// src/schema/bigfloat.ts
var import_big_float = require("@awsless/big-float");
var import_valibot2 = require("valibot");
var make = (value) => new import_big_float.BigFloat(value);
function bigfloat(arg1, arg2) {
  const [msg, pipe] = (0, import_valibot2.defaultArgs)(arg1, arg2);
  const error = msg ?? "Invalid bigfloat";
  return (0, import_valibot2.union)(
    [
      (0, import_valibot2.instance)(import_big_float.BigFloat, pipe),
      (0, import_valibot2.transform)((0, import_valibot2.string)([(0, import_valibot2.custom)((input) => input !== "" && !isNaN(Number(input)), error)]), make, pipe),
      (0, import_valibot2.transform)((0, import_valibot2.number)(), make, pipe),
      (0, import_valibot2.transform)(
        (0, import_valibot2.object)({
          exponent: (0, import_valibot2.number)(),
          coefficient: (0, import_valibot2.bigint)()
        }),
        make,
        pipe
      )
    ],
    error
  );
}

// src/schema/bigint.ts
var import_valibot3 = require("valibot");
function bigint2(arg1, arg2) {
  const [error, pipe] = (0, import_valibot3.defaultArgs)(arg1, arg2);
  return (0, import_valibot3.union)(
    [
      (0, import_valibot3.bigint)(pipe),
      (0, import_valibot3.transform)(
        (0, import_valibot3.string)([(0, import_valibot3.regex)(/^-?[0-9]+$/)]),
        (input) => {
          return BigInt(input);
        },
        (0, import_valibot3.bigint)(pipe)
      )
    ],
    error ?? "Invalid BigInt"
  );
}

// src/schema/date.ts
var import_valibot4 = require("valibot");
function date(arg1, arg2) {
  const [error, pipe] = (0, import_valibot4.defaultArgs)(arg1, arg2);
  return (0, import_valibot4.union)(
    [
      (0, import_valibot4.date)(pipe),
      (0, import_valibot4.transform)(
        (0, import_valibot4.string)(),
        (input) => {
          return new Date(input);
        },
        (0, import_valibot4.date)(pipe)
      )
    ],
    error ?? "Invalid date"
  );
}

// src/schema/uuid.ts
var import_valibot5 = require("valibot");
var uuid = (error) => {
  return (0, import_valibot5.transform)((0, import_valibot5.string)(error ?? "Invalid UUID", [(0, import_valibot5.uuid)()]), (v) => v);
};

// src/schema/duration.ts
var import_valibot6 = require("valibot");
var import_duration = require("@awsless/duration");
function duration(arg1, arg2) {
  const [msg, pipe] = (0, import_valibot6.defaultArgs)(arg1, arg2);
  const error = msg ?? "Invalid duration";
  return (0, import_valibot6.transform)(
    (0, import_valibot6.string)(error, [(0, import_valibot6.regex)(/^[0-9]+ (milliseconds?|seconds?|minutes?|hours?|days?)/, error)]),
    (value) => {
      return (0, import_duration.parse)(value);
    },
    pipe
  );
}

// src/schema/aws/sqs-queue.ts
var import_valibot7 = require("valibot");
var sqsQueue = (body) => {
  const schema = body ?? (0, import_valibot7.unknown)();
  return (0, import_valibot7.union)(
    [
      (0, import_valibot7.transform)(schema, (input) => [input]),
      (0, import_valibot7.array)(schema),
      (0, import_valibot7.transform)(
        (0, import_valibot7.object)({
          Records: (0, import_valibot7.array)(
            (0, import_valibot7.object)({
              body: json(schema)
            })
          )
        }),
        (input) => input.Records.map((record) => {
          return record.body;
        })
      )
    ],
    "Invalid SQS Queue input"
  );
};

// src/schema/aws/sns-topic.ts
var import_valibot8 = require("valibot");
var snsTopic = (body) => {
  const schema = body ?? (0, import_valibot8.unknown)();
  return (0, import_valibot8.union)(
    [
      (0, import_valibot8.transform)(schema, (input) => [input]),
      (0, import_valibot8.array)(schema),
      (0, import_valibot8.transform)(
        (0, import_valibot8.object)({
          Records: (0, import_valibot8.array)(
            (0, import_valibot8.object)({
              Sns: (0, import_valibot8.object)({
                Message: json(schema)
              })
            })
          )
        }),
        (input) => input.Records.map((record) => {
          return record.Sns.Message;
        })
      )
    ],
    "Invalid SNS Topic input"
  );
};

// src/schema/aws/dynamodb-stream.ts
var import_valibot9 = require("valibot");
var dynamoDbStream = (table) => {
  const marshall = () => (0, import_valibot9.transform)((0, import_valibot9.unknown)(), (value) => table.unmarshall(value));
  return (0, import_valibot9.transform)(
    (0, import_valibot9.object)(
      {
        Records: (0, import_valibot9.array)(
          (0, import_valibot9.object)({
            // For some reason picklist fails to build.
            // eventName: picklist(['MODIFY', 'INSERT', 'REMOVE']),
            eventName: (0, import_valibot9.union)([(0, import_valibot9.literal)("MODIFY"), (0, import_valibot9.literal)("INSERT"), (0, import_valibot9.literal)("REMOVE")]),
            dynamodb: (0, import_valibot9.object)({
              Keys: marshall(),
              OldImage: (0, import_valibot9.optional)(marshall()),
              NewImage: (0, import_valibot9.optional)(marshall())
            })
          })
        )
      },
      "Invalid DynamoDB Stream input"
    ),
    (input) => {
      return input.Records.map((record) => {
        const item = record;
        return {
          event: record.eventName.toLowerCase(),
          keys: item.dynamodb.Keys,
          old: item.dynamodb.OldImage,
          new: item.dynamodb.NewImage
        };
      });
    }
  );
};

// src/validation/positive.ts
var import_big_float2 = require("@awsless/big-float");
var import_valibot10 = require("valibot");
function positive(error) {
  return (0, import_valibot10.custom)((input) => (0, import_big_float2.gt)(input, import_big_float2.ZERO), error ?? "Invalid positive number");
}

// src/validation/precision.ts
var import_big_float3 = require("@awsless/big-float");
var import_valibot11 = require("valibot");
function precision(decimals, error) {
  return (0, import_valibot11.custom)((input) => {
    const big = new import_big_float3.BigFloat(input.toString());
    return -big.exponent <= decimals;
  }, error ?? `Invalid ${decimals} precision number`);
}

// src/validation/unique.ts
var import_valibot12 = require("valibot");
function unique(compare = (a, b) => a === b, error) {
  return (0, import_valibot12.custom)((input) => {
    for (const x in input) {
      for (const y in input) {
        if (x !== y && compare(input[x], input[y])) {
          return false;
        }
      }
    }
    return true;
  }, error ?? "None unique array");
}

// src/validation/duration.ts
var import_valibot13 = require("valibot");
function minDuration(min, error) {
  return (0, import_valibot13.custom)((input) => input.value >= min.value, error ?? "Invalid duration");
}
function maxDuration(max, error) {
  return (0, import_valibot13.custom)((input) => input.value <= max.value, error ?? "Invalid duration");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  bigfloat,
  bigint,
  date,
  duration,
  dynamoDbStream,
  json,
  maxDuration,
  minDuration,
  positive,
  precision,
  snsTopic,
  sqsQueue,
  unique,
  uuid,
  ...require("valibot")
});
