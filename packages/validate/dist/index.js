import { array, bigint, check, date, finite, getMetadata, instance, length, metadata, number, object, optional, picklist, pipe, rawTransform, regex, safeParse, string, toDate, transform, tuple, union, unknown, uuid as uuid$1 } from "valibot";
import { parse, stringify } from "@awsless/json";
import { BigFloat, isPositive, parse as parse$1 } from "@awsless/big-float";
import { Duration } from "@awsless/duration";
export * from "valibot";
//#region src/action/redact.ts
const REDACTED = "[REDACTED]";
/** Marks a value to be left out of logs: its logged input shows `[REDACTED]`. */
const redact = () => {
	return metadata({ redact: true });
};
/**
* Redacts a value that a schema can't describe field by field, like a json
* string or an http request's headers, with a function of its own.
*/
const redactWith = (redactor) => {
	return metadata({ redactWith: redactor });
};
const isPlainObject = (input) => input?.constructor === Object;
const WRAPPERS = /* @__PURE__ */ new Set([
	"optional",
	"exact_optional",
	"nullable",
	"nullish",
	"undefinedable",
	"non_optional",
	"non_nullable",
	"non_nullish"
]);
const OBJECTS = /* @__PURE__ */ new Set([
	"object",
	"loose_object",
	"strict_object",
	"object_with_rest"
]);
const TUPLES = /* @__PURE__ */ new Set([
	"tuple",
	"loose_tuple",
	"strict_tuple",
	"tuple_with_rest"
]);
/** The input with every value its schema marks with `redact()` or `redactWith()` replaced. */
const applyRedaction = (schema, input) => {
	const meta = getMetadata(schema);
	if (meta.redact === true) return REDACTED;
	if (typeof meta.redactWith === "function") return meta.redactWith(input);
	const s = schema;
	if (WRAPPERS.has(s.type)) return applyRedaction(s.wrapped, input);
	if (s.type === "lazy") return applyRedaction(s.getter(input), input);
	if (s.type === "union" || s.type === "variant") {
		const matchingBranch = s.options.find((option) => safeParse(option, input).success);
		if (matchingBranch) return applyRedaction(matchingBranch, input);
	}
	if (s.type === "array" && Array.isArray(input)) {
		const array = s;
		return input.map((item) => applyRedaction(array.item, item));
	}
	if (TUPLES.has(s.type) && Array.isArray(input)) {
		const tuple = s;
		return input.map((item, index) => {
			const itemSchema = tuple.items[index] ?? s.rest;
			return itemSchema ? applyRedaction(itemSchema, item) : item;
		});
	}
	if (OBJECTS.has(s.type) && isPlainObject(input)) {
		const object = s;
		const i = input;
		const redacted = {};
		for (const key in i) if (key in object.entries) redacted[key] = applyRedaction(object.entries[key], i[key]);
		else if (s.type === "object_with_rest") redacted[key] = applyRedaction(s.rest, i[key]);
		else if (s.type === "loose_object") redacted[key] = i[key];
		return redacted;
	}
	if (s.type === "record" && isPlainObject(input)) {
		const record = s;
		const i = input;
		const redacted = {};
		for (const key in i) redacted[applyRedaction(record.key, key)] = applyRedaction(record.value, i[key]);
		return redacted;
	}
	if (s.type === "set" && input instanceof Set) {
		const set = s;
		const redacted = /* @__PURE__ */ new Set();
		for (const value of input) redacted.add(applyRedaction(set.value, value));
		return redacted;
	}
	if (s.type === "map" && input instanceof Map) {
		const map = s;
		const redacted = /* @__PURE__ */ new Map();
		for (const [key, value] of input.entries()) redacted.set(applyRedaction(map.key, key), applyRedaction(map.value, value));
		return redacted;
	}
	return input;
};
//#endregion
//#region src/schema/json.ts
const json = (schema, message = "Invalid JSON") => {
	return pipe(string(message), redactWith((input) => {
		if (typeof input !== "string") return applyRedaction(schema, input);
		try {
			return stringify(applyRedaction(schema, parse(input)));
		} catch {
			return input;
		}
	}), rawTransform((ctx) => {
		let result;
		try {
			result = parse(ctx.dataset.value);
		} catch {
			ctx.addIssue({ message });
			return ctx.NEVER;
		}
		return result;
	}), schema);
};
//#endregion
//#region src/schema/bigfloat.ts
function bigfloat(message = "Invalid bigfloat") {
	return union([
		instance(BigFloat),
		pipe(string(), regex(/^[+-]?((\d+\.?\d*)|(\.\d+))([eE][+-]?\d+)?$/), transform((v) => parse$1(v))),
		pipe(bigint(), transform((v) => parse$1(v))),
		pipe(number(), finite(), transform((v) => parse$1(v)))
	], message);
}
//#endregion
//#region src/schema/uuid.ts
const uuid = (message = "Invalid UUID") => {
	return pipe(string(message), uuid$1(message));
};
//#endregion
//#region src/schema/duration.ts
function duration(message = "Invalid duration") {
	return instance(Duration, message);
}
//#endregion
//#region src/schema/aws/sqs-queue.ts
const sqsQueue = (schema, message = "Invalid SQS Queue payload") => {
	return union([
		pipe(object({ Records: array(object({ body: json(schema) })) }), transform((v) => v.Records.map((r) => r.body))),
		pipe(schema, transform((v) => [v])),
		array(schema)
	], message);
};
//#endregion
//#region src/schema/aws/sns-topic.ts
const snsTopic = (schema, message = "Invalid SNS Topic payload") => {
	return union([pipe(object({ Records: pipe(tuple([object({ Sns: object({ Message: json(schema) }) })]), length(1)) }), transform((v) => v.Records[0].Sns.Message)), schema], message);
};
//#endregion
//#region src/schema/aws/dynamodb-stream.ts
const dynamoDbStream = (table, message = "Invalid DynamoDB Stream payload") => {
	const unmarshallKeys = () => pipe(unknown(), transform((v) => table.unmarshall(v, table.keys)));
	const unmarshall = () => pipe(unknown(), redactWith(() => REDACTED), transform((v) => table.unmarshall(v)));
	return pipe(object({ Records: array(object({
		eventName: picklist([
			"MODIFY",
			"INSERT",
			"REMOVE"
		]),
		dynamodb: object({
			Keys: unmarshallKeys(),
			OldImage: optional(unmarshall()),
			NewImage: optional(unmarshall())
		})
	})) }, message), transform((input) => {
		return input.Records.map((record) => {
			const item = {
				event: record.eventName.toLowerCase(),
				keys: record.dynamodb.Keys
			};
			if ("OldImage" in record.dynamodb) item.old = record.dynamodb.OldImage;
			if ("NewImage" in record.dynamodb) item.new = record.dynamodb.NewImage;
			return item;
		});
	}));
};
//#endregion
//#region src/schema/aws/s3-event.ts
const s3Event = () => {
	const schema = object({
		event: string(),
		bucket: string(),
		key: string(),
		size: number(),
		eTag: string(),
		time: date()
	});
	return union([
		pipe(object({ Records: array(object({
			eventTime: pipe(string(), toDate()),
			eventName: string(),
			s3: object({
				bucket: object({ name: string() }),
				object: object({
					key: string(),
					size: number(),
					eTag: string()
				})
			})
		})) }), transform((input) => {
			return input.Records.map((record) => ({
				event: record.eventName,
				time: record.eventTime,
				bucket: record.s3.bucket.name,
				key: record.s3.object.key,
				size: record.s3.object.size,
				eTag: record.s3.object.eTag
			}));
		})),
		pipe(schema, transform((v) => [v])),
		array(schema)
	], "Invalid S3 Event payload");
};
//#endregion
//#region src/validation/positive.ts
function positive(message = "Invalid positive number") {
	return check((input) => isPositive(input), message);
}
//#endregion
//#region src/validation/precision.ts
function precision(decimals, message = `Invalid ${decimals} precision number`) {
	return check((input) => {
		return -parse$1(input.toString()).exponent <= decimals;
	}, message);
}
//#endregion
//#region src/validation/unique.ts
function unique(compare = (a, b) => a === b, message = "None unique array") {
	return check((input) => {
		for (const x in input) for (const y in input) if (x !== y && compare(input[x], input[y])) return false;
		return true;
	}, message);
}
//#endregion
//#region src/validation/duration.ts
function minDuration(min, message = "Invalid duration") {
	return check((input) => input.value >= min.value, message);
}
function maxDuration(max, message = "Invalid duration") {
	return check((input) => input.value <= max.value, message);
}
//#endregion
export { REDACTED, applyRedaction, bigfloat, duration, dynamoDbStream, json, maxDuration, minDuration, positive, precision, redact, redactWith, s3Event, snsTopic, sqsQueue, unique, uuid };
