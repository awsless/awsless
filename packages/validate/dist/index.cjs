Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let valibot = require("valibot");
let _awsless_json = require("@awsless/json");
let _awsless_big_float = require("@awsless/big-float");
let _awsless_duration = require("@awsless/duration");
//#region src/action/redact.ts
const REDACTED = "[REDACTED]";
const redact = () => {
	return (0, valibot.metadata)({ redact: true });
};
const isPlainObject = (input) => input?.constructor === Object;
const applyRedaction = (schema, input) => {
	if ((0, valibot.getMetadata)(schema).redact === true) return REDACTED;
	if (schema.type === "union" || schema.type === "variant") {
		const matchingBranch = schema.options.find((option) => (0, valibot.safeParse)(option, input).success);
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
	return (0, valibot.pipe)((0, valibot.string)(message), (0, valibot.rawTransform)((ctx) => {
		let result;
		try {
			result = (0, _awsless_json.parse)(ctx.dataset.value);
		} catch (_error) {
			ctx.addIssue({ message });
			return ctx.NEVER;
		}
		return result;
	}), schema);
};
//#endregion
//#region src/schema/bigfloat.ts
function bigfloat(message = "Invalid bigfloat") {
	return (0, valibot.union)([
		(0, valibot.instance)(_awsless_big_float.BigFloat),
		(0, valibot.pipe)((0, valibot.string)(), (0, valibot.regex)(/^[+-]?((\d+\.?\d*)|(\.\d+))([eE][+-]?\d+)?$/), (0, valibot.transform)((v) => (0, _awsless_big_float.parse)(v))),
		(0, valibot.pipe)((0, valibot.bigint)(), (0, valibot.transform)((v) => (0, _awsless_big_float.parse)(v))),
		(0, valibot.pipe)((0, valibot.number)(), (0, valibot.transform)((v) => (0, _awsless_big_float.parse)(v)))
	], message);
}
//#endregion
//#region src/schema/uuid.ts
const uuid = (message = "Invalid UUID") => {
	return (0, valibot.pipe)((0, valibot.string)(message), (0, valibot.uuid)(message));
};
//#endregion
//#region src/schema/duration.ts
function duration(message = "Invalid duration") {
	return (0, valibot.instance)(_awsless_duration.Duration, message);
}
//#endregion
//#region src/schema/aws/sqs-queue.ts
const sqsQueue = (schema, message = "Invalid SQS Queue payload") => {
	return (0, valibot.union)([
		(0, valibot.pipe)((0, valibot.object)({ Records: (0, valibot.array)((0, valibot.object)({ body: json(schema) })) }), (0, valibot.transform)((v) => v.Records.map((r) => r.body))),
		(0, valibot.pipe)(schema, (0, valibot.transform)((v) => [v])),
		(0, valibot.array)(schema)
	], message);
};
//#endregion
//#region src/schema/aws/sns-topic.ts
const snsTopic = (schema, message = "Invalid SNS Topic payload") => {
	return (0, valibot.union)([(0, valibot.pipe)((0, valibot.object)({ Records: (0, valibot.pipe)((0, valibot.array)((0, valibot.object)({ Sns: (0, valibot.object)({ Message: json(schema) }) })), (0, valibot.minLength)(1)) }), (0, valibot.transform)((v) => v.Records[0].Sns.Message)), schema], message);
};
//#endregion
//#region src/schema/aws/dynamodb-stream.ts
const dynamoDbStream = (table, message = "Invalid DynamoDB Stream payload") => {
	const unmarshallKeys = () => (0, valibot.pipe)((0, valibot.unknown)(), (0, valibot.transform)((v) => table.unmarshall(v, table.keys)));
	const unmarshall = () => (0, valibot.pipe)((0, valibot.unknown)(), (0, valibot.transform)((v) => table.unmarshall(v)));
	return (0, valibot.pipe)((0, valibot.object)({ Records: (0, valibot.array)((0, valibot.object)({
		eventName: (0, valibot.picklist)([
			"MODIFY",
			"INSERT",
			"REMOVE"
		]),
		dynamodb: (0, valibot.object)({
			Keys: unmarshallKeys(),
			OldImage: (0, valibot.optional)(unmarshall()),
			NewImage: (0, valibot.optional)(unmarshall())
		})
	})) }, message), (0, valibot.transform)((input) => {
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
	const schema = (0, valibot.object)({
		event: (0, valibot.string)(),
		bucket: (0, valibot.string)(),
		key: (0, valibot.string)(),
		size: (0, valibot.number)(),
		eTag: (0, valibot.string)(),
		time: (0, valibot.date)()
	});
	return (0, valibot.union)([
		(0, valibot.pipe)((0, valibot.object)({ Records: (0, valibot.array)((0, valibot.object)({
			eventTime: (0, valibot.pipe)((0, valibot.string)(), (0, valibot.toDate)()),
			eventName: (0, valibot.string)(),
			s3: (0, valibot.object)({
				bucket: (0, valibot.object)({ name: (0, valibot.string)() }),
				object: (0, valibot.object)({
					key: (0, valibot.string)(),
					size: (0, valibot.number)(),
					eTag: (0, valibot.string)()
				})
			})
		})) }), (0, valibot.transform)((input) => {
			return input.Records.map((record) => ({
				event: record.eventName,
				time: record.eventTime,
				bucket: record.s3.bucket.name,
				key: record.s3.object.key,
				size: record.s3.object.size,
				eTag: record.s3.object.eTag
			}));
		})),
		(0, valibot.pipe)(schema, (0, valibot.transform)((v) => [v])),
		(0, valibot.array)(schema)
	], "Invalid S3 Event payload");
};
//#endregion
//#region src/validation/positive.ts
function positive(message = "Invalid positive number") {
	return (0, valibot.check)((input) => (0, _awsless_big_float.isPositive)(input), message);
}
//#endregion
//#region src/validation/precision.ts
function precision(decimals, message = `Invalid ${decimals} precision number`) {
	return (0, valibot.check)((input) => {
		return -(0, _awsless_big_float.parse)(input.toString()).exponent <= decimals;
	}, message);
}
//#endregion
//#region src/validation/unique.ts
function unique(compare = (a, b) => a === b, message = "None unique array") {
	return (0, valibot.check)((input) => {
		for (const x in input) for (const y in input) if (x !== y && compare(input[x], input[y])) return false;
		return true;
	}, message);
}
//#endregion
//#region src/validation/duration.ts
function minDuration(min, message = "Invalid duration") {
	return (0, valibot.check)((input) => input.value >= min.value, message);
}
function maxDuration(max, message = "Invalid duration") {
	return (0, valibot.check)((input) => input.value <= max.value, message);
}
//#endregion
exports.applyRedaction = applyRedaction;
exports.bigfloat = bigfloat;
exports.duration = duration;
exports.dynamoDbStream = dynamoDbStream;
exports.json = json;
exports.maxDuration = maxDuration;
exports.minDuration = minDuration;
exports.positive = positive;
exports.precision = precision;
exports.redact = redact;
exports.s3Event = s3Event;
exports.snsTopic = snsTopic;
exports.sqsQueue = sqsQueue;
exports.unique = unique;
exports.uuid = uuid;
Object.keys(valibot).forEach(function(k) {
	if (k !== "default" && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
		enumerable: true,
		get: function() {
			return valibot[k];
		}
	});
});
