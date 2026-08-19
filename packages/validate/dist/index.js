import { array, bigint, check, date, getMetadata, instance, metadata, minLength, number, object, optional, picklist, pipe, rawTransform, regex, safeParse, string, toDate, transform, union, unknown, uuid as uuid$1 } from "valibot";
import { parse } from "@awsless/json";
import { BigFloat, isPositive, parse as parse$1 } from "@awsless/big-float";
import { Duration } from "@awsless/duration";
export * from "valibot";
//#region src/action/redact.ts
const REDACTED = "[REDACTED]";
const redact = () => {
	return metadata({ redact: true });
};
const isPlainObject = (input) => input?.constructor === Object;
const applyRedaction = (schema, input) => {
	if (getMetadata(schema).redact === true) return REDACTED;
	if (schema.type === "union" || schema.type === "variant") {
		const matchingBranch = schema.options.find((option) => safeParse(option, input).success);
		if (matchingBranch) return applyRedaction(matchingBranch, input);
	}
	if (schema.type === "array" && Array.isArray(input)) {
		const s = schema;
		return input.map((item) => applyRedaction(s.item, item));
	}
	if (schema.type === "object" && isPlainObject(input)) {
		const s = schema;
		const i = input;
		const redacted = {};
		for (const key in s.entries) if (key in i) redacted[key] = applyRedaction(s.entries[key], i[key]);
		return redacted;
	}
	if (schema.type === "record" && isPlainObject(input)) {
		const s = schema;
		const i = input;
		const redacted = {};
		for (const key in i) redacted[applyRedaction(s.key, key)] = applyRedaction(s.value, i[key]);
		return redacted;
	}
	if (schema.type === "set" && input instanceof Set) {
		const s = schema;
		const redacted = /* @__PURE__ */ new Set();
		for (const value of input) redacted.add(applyRedaction(s.value, value));
		return redacted;
	}
	if (schema.type === "map" && input instanceof Map) {
		const s = schema;
		const redacted = /* @__PURE__ */ new Map();
		for (const [key, value] of input.entries()) redacted.set(applyRedaction(s.key, key), applyRedaction(s.value, value));
		return redacted;
	}
	return input;
};
//#endregion
//#region src/schema/json.ts
const json = (schema, message = "Invalid JSON") => {
	return pipe(string(message), rawTransform((ctx) => {
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
		pipe(number(), transform((v) => parse$1(v)))
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
	return union([pipe(object({ Records: pipe(array(object({ Sns: object({ Message: json(schema) }) })), minLength(1)) }), transform((v) => v.Records[0].Sns.Message)), schema], message);
};
//#endregion
//#region src/schema/aws/dynamodb-stream.ts
const dynamoDbStream = (table, message = "Invalid DynamoDB Stream payload") => {
	const unmarshallKeys = () => pipe(unknown(), transform((v) => table.unmarshall(v, table.keys)));
	const unmarshall = () => pipe(unknown(), transform((v) => table.unmarshall(v)));
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
export { applyRedaction, bigfloat, duration, dynamoDbStream, json, maxDuration, minDuration, positive, precision, redact, s3Event, snsTopic, sqsQueue, unique, uuid };
