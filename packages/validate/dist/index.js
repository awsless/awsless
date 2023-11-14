// src/index.ts
export * from "valibot";

// src/schema/json.ts
import { string, transform } from "valibot";
var json = (schema) => {
  return transform(
    string(),
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
import { BigFloat } from "@awsless/big-float";
import {
  bigint,
  getDefaultArgs,
  instance,
  number,
  object,
  string as string2,
  transform as transform2,
  union,
  getPipeIssues,
  getOutput
} from "valibot";
var make = (value) => new BigFloat(value);
function bigfloat(arg1, arg2) {
  const [msg, pipe] = getDefaultArgs(arg1, arg2);
  const error = msg ?? "Invalid bigfloat";
  return union(
    [
      instance(BigFloat, pipe),
      transform2(
        string2([
          (input) => {
            if (input === "" || isNaN(Number(input))) {
              return getPipeIssues("bigfloat", error, input);
            }
            return getOutput(input);
          }
        ]),
        make,
        pipe
      ),
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

// src/schema/date.ts
import { getDefaultArgs as getDefaultArgs2, date as base, string as string3, union as union2, transform as transform3 } from "valibot";
function date(arg1, arg2) {
  const [error, pipe] = getDefaultArgs2(arg1, arg2);
  return union2(
    [
      base(pipe),
      transform3(
        string3(),
        (input) => {
          return new Date(input);
        },
        base(pipe)
      )
    ],
    error ?? "Invalid date"
  );
}

// src/schema/uuid.ts
import { string as string4, uuid as base2, transform as transform4 } from "valibot";
var uuid = () => {
  return transform4(string4([base2()]), (v) => v);
};

// src/schema/aws/sqs-queue.ts
import { array, object as object2, transform as transform5, union as union3, unknown } from "valibot";
var sqsQueue = (body) => {
  const schema = body ?? unknown();
  return union3(
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
import { array as array2, object as object3, transform as transform6, union as union4, unknown as unknown2 } from "valibot";
var snsTopic = (body) => {
  const schema = body ?? unknown2();
  return union4(
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
import { array as array3, object as object4, optional, picklist, transform as transform7, unknown as unknown3 } from "valibot";
var dynamoDbStream = (table) => {
  const marshall = () => transform7(unknown3(), (value) => table.unmarshall(value));
  return transform7(
    object4(
      {
        Records: array3(
          object4({
            eventName: picklist(["MODIFY", "INSERT", "REMOVE"]),
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
import { ZERO, gt } from "@awsless/big-float";
import { getOutput as getOutput2, getPipeIssues as getPipeIssues2 } from "valibot";
function positive(error) {
  return (input) => {
    return gt(input, ZERO) ? getOutput2(input) : getPipeIssues2("positive", error ?? "Invalid positive number", input);
  };
}

// src/validation/precision.ts
import { BigFloat as BigFloat3 } from "@awsless/big-float";
import { getOutput as getOutput3, getPipeIssues as getPipeIssues3 } from "valibot";
function precision(decimals, error) {
  return (input) => {
    const big = new BigFloat3(input.toString());
    return -big.exponent <= decimals ? getOutput3(input) : getPipeIssues3("precision", error ?? `Invalid ${decimals} precision number`, input);
  };
}

// src/validation/unique.ts
import { getOutput as getOutput4, getPipeIssues as getPipeIssues4 } from "valibot";
function unique(compare = (a, b) => a === b, error) {
  return (input) => {
    for (const x in input) {
      for (const y in input) {
        if (x !== y && compare(input[x], input[y])) {
          return getPipeIssues4("unique", error ?? "None unique array", input);
        }
      }
    }
    return getOutput4(input);
  };
}
export {
  bigfloat,
  date,
  dynamoDbStream,
  json,
  positive,
  precision,
  snsTopic,
  sqsQueue,
  unique,
  uuid
};
