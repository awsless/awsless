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
  date: () => date,
  dynamoDbStream: () => dynamoDbStream,
  json: () => json,
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
  const [msg, pipe] = (0, import_valibot2.getDefaultArgs)(arg1, arg2);
  const error = msg ?? "Invalid bigfloat";
  return (0, import_valibot2.union)(
    [
      (0, import_valibot2.instance)(import_big_float.BigFloat, pipe),
      (0, import_valibot2.transform)(
        (0, import_valibot2.string)([
          (input) => {
            if (input === "" || isNaN(Number(input))) {
              return (0, import_valibot2.getPipeIssues)("bigfloat", error, input);
            }
            return (0, import_valibot2.getOutput)(input);
          }
        ]),
        make,
        pipe
      ),
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

// src/schema/date.ts
var import_valibot3 = require("valibot");
function date(arg1, arg2) {
  const [error, pipe] = (0, import_valibot3.getDefaultArgs)(arg1, arg2);
  return (0, import_valibot3.union)(
    [
      (0, import_valibot3.date)(pipe),
      (0, import_valibot3.transform)(
        (0, import_valibot3.string)(),
        (input) => {
          return new Date(input);
        },
        (0, import_valibot3.date)(pipe)
      )
    ],
    error ?? "Invalid date"
  );
}

// src/schema/uuid.ts
var import_valibot4 = require("valibot");
var uuid = () => {
  return (0, import_valibot4.transform)((0, import_valibot4.string)([(0, import_valibot4.uuid)()]), (v) => v);
};

// src/schema/aws/sqs-queue.ts
var import_valibot5 = require("valibot");
var sqsQueue = (body) => {
  const schema = body ?? (0, import_valibot5.unknown)();
  return (0, import_valibot5.union)(
    [
      (0, import_valibot5.transform)(schema, (input) => [input]),
      (0, import_valibot5.array)(schema),
      (0, import_valibot5.transform)(
        (0, import_valibot5.object)({
          Records: (0, import_valibot5.array)(
            (0, import_valibot5.object)({
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
var import_valibot6 = require("valibot");
var snsTopic = (body) => {
  const schema = body ?? (0, import_valibot6.unknown)();
  return (0, import_valibot6.union)(
    [
      (0, import_valibot6.transform)(schema, (input) => [input]),
      (0, import_valibot6.array)(schema),
      (0, import_valibot6.transform)(
        (0, import_valibot6.object)({
          Records: (0, import_valibot6.array)(
            (0, import_valibot6.object)({
              Sns: (0, import_valibot6.object)({
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
var import_valibot7 = require("valibot");
var dynamoDbStream = (table) => {
  const marshall = () => (0, import_valibot7.transform)((0, import_valibot7.unknown)(), (value) => table.unmarshall(value));
  return (0, import_valibot7.transform)(
    (0, import_valibot7.object)(
      {
        Records: (0, import_valibot7.array)(
          (0, import_valibot7.object)({
            eventName: (0, import_valibot7.picklist)(["MODIFY", "INSERT", "REMOVE"]),
            dynamodb: (0, import_valibot7.object)({
              Keys: marshall(),
              OldImage: (0, import_valibot7.optional)(marshall()),
              NewImage: (0, import_valibot7.optional)(marshall())
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
          event: record.eventName,
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
var import_valibot8 = require("valibot");
function positive(error) {
  return (input) => {
    return (0, import_big_float2.gt)(input, import_big_float2.ZERO) ? (0, import_valibot8.getOutput)(input) : (0, import_valibot8.getPipeIssues)("positive", error ?? "Invalid positive number", input);
  };
}

// src/validation/precision.ts
var import_big_float3 = require("@awsless/big-float");
var import_valibot9 = require("valibot");
function precision(decimals, error) {
  return (input) => {
    const big = new import_big_float3.BigFloat(input.toString());
    return -big.exponent <= decimals ? (0, import_valibot9.getOutput)(input) : (0, import_valibot9.getPipeIssues)("precision", error ?? `Invalid ${decimals} precision number`, input);
  };
}

// src/validation/unique.ts
var import_valibot10 = require("valibot");
function unique(compare = (a, b) => a === b, error) {
  return (input) => {
    for (const x in input) {
      for (const y in input) {
        if (x !== y && compare(input[x], input[y])) {
          return (0, import_valibot10.getPipeIssues)("unique", error ?? "None unique array", input);
        }
      }
    }
    return (0, import_valibot10.getOutput)(input);
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  bigfloat,
  date,
  dynamoDbStream,
  json,
  positive,
  precision,
  snsTopic,
  sqsQueue,
  unique,
  uuid,
  ...require("valibot")
});
