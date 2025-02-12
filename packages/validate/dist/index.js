// src/index.ts
export * from "valibot";

// src/schema/json.ts
import { parse } from "@awsless/json";
import { string, transform } from "valibot";
var json = (schema) => {
  return transform(
    string(),
    (value) => {
      try {
        return parse(value);
      } catch (error) {
        return null;
      }
    },
    schema
  );
};

// src/schema/bigfloat.ts
import { BigFloat } from "@awsless/big-float";
import {
  bigint,
  defaultArgs,
  instance,
  number,
  object,
  string as string2,
  transform as transform2,
  union,
  custom
} from "valibot";
var make = (value) => new BigFloat(value);
function bigfloat(arg1, arg2) {
  const [msg, pipe] = defaultArgs(arg1, arg2);
  const error = msg ?? "Invalid bigfloat";
  return union(
    [
      instance(BigFloat, pipe),
      transform2(string2([custom((input) => input !== "" && !isNaN(Number(input)), error)]), make, pipe),
      transform2(number(), make, pipe),
      transform2(
        object({
          exponent: number(),
          coefficient: bigint()
        }),
        make,
        pipe
      )
    ],
    error
  );
}

// src/schema/bigint.ts
import { bigint as base, defaultArgs as defaultArgs2, regex, string as string3, transform as transform3, union as union2 } from "valibot";
function bigint2(arg1, arg2) {
  const [error, pipe] = defaultArgs2(arg1, arg2);
  return union2(
    [
      base(pipe),
      transform3(
        string3([regex(/^-?[0-9]+$/)]),
        (input) => {
          return BigInt(input);
        },
        base(pipe)
      )
    ],
    error ?? "Invalid BigInt"
  );
}

// src/schema/date.ts
import { defaultArgs as defaultArgs3, date as base2, string as string4, union as union3, transform as transform4 } from "valibot";
function date(arg1, arg2) {
  const [error, pipe] = defaultArgs3(arg1, arg2);
  return union3(
    [
      base2(pipe),
      transform4(
        string4(),
        (input) => {
          return new Date(input);
        },
        base2(pipe)
      )
    ],
    error ?? "Invalid date"
  );
}

// src/schema/uuid.ts
import { string as string5, uuid as base3, transform as transform5 } from "valibot";
var uuid = (error) => {
  return transform5(string5(error ?? "Invalid UUID", [base3()]), (v) => v);
};

// src/schema/duration.ts
import { defaultArgs as defaultArgs4, regex as regex2, string as string6, transform as transform6 } from "valibot";
import { parse as parse2 } from "@awsless/duration";
function duration(arg1, arg2) {
  const [msg, pipe] = defaultArgs4(arg1, arg2);
  const error = msg ?? "Invalid duration";
  return transform6(
    string6(error, [regex2(/^[0-9]+ (milliseconds?|seconds?|minutes?|hours?|days?)/, error)]),
    (value) => {
      return parse2(value);
    },
    pipe
  );
}

// src/schema/aws/sqs-queue.ts
import { array, object as object2, transform as transform7, union as union4, unknown } from "valibot";
var sqsQueue = (body) => {
  const schema = body ?? unknown();
  return union4(
    [
      transform7(schema, (input) => [input]),
      array(schema),
      transform7(
        object2({
          Records: array(
            object2({
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
import { array as array2, object as object3, transform as transform8, union as union5, unknown as unknown2 } from "valibot";
var snsTopic = (body) => {
  const schema = body ?? unknown2();
  return union5(
    [
      transform8(schema, (input) => [input]),
      array2(schema),
      transform8(
        object3({
          Records: array2(
            object3({
              Sns: object3({
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
import { array as array3, literal, object as object4, optional, transform as transform9, union as union6, unknown as unknown3 } from "valibot";
var dynamoDbStream = (table) => {
  const marshall = () => transform9(unknown3(), (value) => table.unmarshall(value));
  return transform9(
    object4(
      {
        Records: array3(
          object4({
            // For some reason picklist fails to build.
            // eventName: picklist(['MODIFY', 'INSERT', 'REMOVE']),
            eventName: union6([literal("MODIFY"), literal("INSERT"), literal("REMOVE")]),
            dynamodb: object4({
              Keys: marshall(),
              OldImage: optional(marshall()),
              NewImage: optional(marshall())
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
import { ZERO, gt } from "@awsless/big-float";
import { custom as custom2 } from "valibot";
function positive(error) {
  return custom2((input) => gt(input, ZERO), error ?? "Invalid positive number");
}

// src/validation/precision.ts
import { BigFloat as BigFloat3 } from "@awsless/big-float";
import { custom as custom3 } from "valibot";
function precision(decimals, error) {
  return custom3((input) => {
    const big = new BigFloat3(input.toString());
    return -big.exponent <= decimals;
  }, error ?? `Invalid ${decimals} precision number`);
}

// src/validation/unique.ts
import { custom as custom4 } from "valibot";
function unique(compare = (a, b) => a === b, error) {
  return custom4((input) => {
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
import { custom as custom5 } from "valibot";
function minDuration(min, error) {
  return custom5((input) => input.value >= min.value, error ?? "Invalid duration");
}
function maxDuration(max, error) {
  return custom5((input) => input.value <= max.value, error ?? "Invalid duration");
}
export {
  bigfloat,
  bigint2 as bigint,
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
  uuid
};
