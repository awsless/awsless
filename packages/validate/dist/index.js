// src/index.ts
export * from "valibot";

// src/action/redact.ts
import {
  getMetadata,
  metadata,
  safeParse
} from "valibot";
var REDACTED = "[REDACTED]";
var redact = () => {
  return metadata({ redact: true });
};
var isPlainObject = (input) => input?.constructor === Object;
var applyRedaction = (schema, input) => {
  const metadata2 = getMetadata(schema);
  if (metadata2.redact === true) {
    return REDACTED;
  }
  if (schema.type === "union" || schema.type === "variant") {
    const s = schema;
    const matchingBranch = s.options.find((option) => safeParse(option, input).success);
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
import { parse } from "@awsless/json";
import { pipe, rawTransform, string } from "valibot";
var json = (schema, message = "Invalid JSON") => {
  return pipe(
    string(message),
    rawTransform((ctx) => {
      let result;
      try {
        result = parse(ctx.dataset.value);
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
import { BigFloat, parse as parse2 } from "@awsless/big-float";
import {
  bigint,
  decimal,
  instance,
  number,
  pipe as pipe2,
  string as string2,
  transform,
  union
} from "valibot";
function bigfloat(message = "Invalid bigfloat") {
  return union(
    [
      instance(BigFloat),
      pipe2(
        string2(),
        decimal(),
        transform((v) => parse2(v))
      ),
      pipe2(
        bigint(),
        transform((v) => parse2(v))
      ),
      pipe2(
        number(),
        transform((v) => parse2(v))
      )
    ],
    message
  );
}

// src/schema/uuid.ts
import { uuid as base, pipe as pipe3, string as string3 } from "valibot";
var uuid = (message = "Invalid UUID") => {
  return pipe3(string3(message), base(message));
};

// src/schema/duration.ts
import { Duration } from "@awsless/duration";
import { instance as instance2 } from "valibot";
function duration(message = "Invalid duration") {
  return instance2(Duration, message);
}

// src/schema/aws/sqs-queue.ts
import {
  array,
  object,
  pipe as pipe4,
  transform as transform2,
  union as union2
} from "valibot";
var sqsQueue = (schema, message = "Invalid SQS Queue payload") => {
  return union2(
    [
      // Prioritize the expected payload during production
      pipe4(
        object({
          Records: array(
            object({
              body: json(schema)
            })
          )
        }),
        transform2((v) => v.Records.map((r) => r.body))
      ),
      // These are allowed during testing
      pipe4(
        schema,
        transform2((v) => [v])
      ),
      array(schema)
    ],
    message
  );
};

// src/schema/aws/sns-topic.ts
import {
  array as array2,
  object as object2,
  pipe as pipe5,
  transform as transform3,
  union as union3
} from "valibot";
var snsTopic = (schema, message = "Invalid SNS Topic payload") => {
  return union3(
    [
      // Prioritize the expected payload during production
      pipe5(
        object2({
          Records: array2(
            object2({
              Sns: object2({
                Message: json(schema)
              })
            })
          )
        }),
        transform3((v) => v.Records.map((r) => r.Sns.Message))
      ),
      // These are allowed during testing
      pipe5(
        schema,
        transform3((v) => [v])
      ),
      array2(schema)
    ],
    message
  );
};

// src/schema/aws/dynamodb-stream.ts
import {
  array as array3,
  object as object3,
  optional,
  picklist,
  pipe as pipe6,
  transform as transform4,
  unknown
} from "valibot";
var dynamoDbStream = (table, message = "Invalid DynamoDB Stream payload") => {
  const unmarshallKeys = () => pipe6(
    unknown(),
    transform4((v) => table.unmarshall(v, table.keys))
  );
  const unmarshall = () => pipe6(
    unknown(),
    transform4((v) => table.unmarshall(v))
  );
  return pipe6(
    object3(
      {
        Records: array3(
          object3({
            eventName: picklist(["MODIFY", "INSERT", "REMOVE"]),
            dynamodb: object3({
              Keys: unmarshallKeys(),
              OldImage: optional(unmarshall()),
              NewImage: optional(unmarshall())
            })
          })
        )
      },
      message
    ),
    transform4((input) => {
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
import { array as array4, date, number as number2, object as object4, pipe as pipe7, string as string4, toDate, transform as transform5, union as union4 } from "valibot";
var s3Event = () => {
  const schema = object4({
    event: string4(),
    bucket: string4(),
    key: string4(),
    size: number2(),
    eTag: string4(),
    time: date()
  });
  return union4(
    [
      // Prioritize the expected payload during production
      pipe7(
        object4({
          Records: array4(
            object4({
              eventTime: pipe7(string4(), toDate()),
              eventName: string4(),
              s3: object4({
                bucket: object4({
                  name: string4()
                }),
                object: object4({
                  key: string4(),
                  size: number2(),
                  eTag: string4()
                })
              })
            })
          )
        }),
        transform5((input) => {
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
      pipe7(
        schema,
        transform5((v) => [v])
      ),
      array4(schema)
    ],
    "Invalid S3 Event payload"
  );
};

// src/validation/positive.ts
import { isPositive } from "@awsless/big-float";
import { check } from "valibot";
function positive(message = "Invalid positive number") {
  return check((input) => isPositive(input), message);
}

// src/validation/precision.ts
import { parse as parse3 } from "@awsless/big-float";
import { check as check2 } from "valibot";
function precision(decimals, message = `Invalid ${decimals} precision number`) {
  return check2((input) => {
    const big = parse3(input.toString());
    return -big.exponent <= decimals;
  }, message);
}

// src/validation/unique.ts
import { check as check3 } from "valibot";
function unique(compare = (a, b) => a === b, message = "None unique array") {
  return check3((input) => {
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
import { check as check4 } from "valibot";
function minDuration(min, message = "Invalid duration") {
  return check4((input) => input.value >= min.value, message);
}
function maxDuration(max, message = "Invalid duration") {
  return check4((input) => input.value <= max.value, message);
}
export {
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
  uuid
};
