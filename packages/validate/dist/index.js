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
  custom,
  defaultArgs,
  instance,
  number,
  object,
  string as string2,
  transform as transform2,
  union
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
import { date as base2, defaultArgs as defaultArgs3, string as string4, transform as transform4, union as union3 } from "valibot";
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
import { uuid as base3, string as string5 } from "valibot";
var uuid = (error) => {
  return string5(error ?? "Invalid UUID", [base3()]);
};

// src/schema/duration.ts
import { Duration } from "@awsless/duration";
import { defaultArgs as defaultArgs4, instance as instance2 } from "valibot";
function duration(arg1, arg2) {
  const [msg, pipe] = defaultArgs4(arg1, arg2);
  const error = msg ?? "Invalid duration";
  return instance2(Duration, error, pipe);
}

// src/schema/aws/sqs-queue.ts
import { array, object as object2, transform as transform5, union as union4, unknown } from "valibot";
var sqsQueue = (body) => {
  const schema = body ?? unknown();
  return union4(
    [
      transform5(schema, (input) => [input]),
      array(schema),
      transform5(
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
import { array as array2, object as object3, transform as transform6, union as union5, unknown as unknown2 } from "valibot";
var snsTopic = (body) => {
  const schema = body ?? unknown2();
  return union5(
    [
      transform6(schema, (input) => [input]),
      array2(schema),
      transform6(
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
import { array as array3, literal, object as object4, transform as transform7, unknown as unknown3, variant } from "valibot";
var dynamoDbStream = (table) => {
  const unmarshall = () => transform7(unknown3(), (value) => table.unmarshall(value));
  return transform7(
    object4(
      {
        Records: array3(
          variant("eventName", [
            object4({
              eventName: literal("MODIFY"),
              dynamodb: object4({
                Keys: unmarshall(),
                OldImage: unmarshall(),
                NewImage: unmarshall()
              })
            }),
            object4({
              eventName: literal("INSERT"),
              dynamodb: object4({
                Keys: unmarshall(),
                NewImage: unmarshall()
              })
            }),
            object4({
              eventName: literal("REMOVE"),
              dynamodb: object4({
                Keys: unmarshall(),
                OldImage: unmarshall()
              })
            })
          ])
        )
      },
      "Invalid DynamoDB Stream input"
    ),
    (input) => {
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
import { parse as parse2 } from "@awsless/big-float";
import { custom as custom3 } from "valibot";
function precision(decimals, error) {
  return custom3(
    (input) => {
      const big = parse2(input.toString());
      return -big.exponent <= decimals;
    },
    error ?? `Invalid ${decimals} precision number`
  );
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
