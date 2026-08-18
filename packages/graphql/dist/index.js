import { getNamedType, isEnumType, isInputObjectType, isInterfaceType, isListType, isNamedType, isNonNullType, isObjectType, isScalarType, isUnionType } from "graphql";
//#region src/client/argument.ts
var Arg = class {
	type;
	value;
	constructor(type, value) {
		this.type = type;
		this.value = value;
	}
};
const $ = (type, value) => {
	return new Arg(type, value);
};
//#endregion
//#region src/client/query.ts
const parseArgs = (args, ctx) => {
	const argEntries = Object.entries(args).filter(([_, value]) => typeof value !== "undefined");
	if (argEntries.length === 0) return "";
	return argEntries.map(([name, value]) => {
		if (value instanceof Arg) {
			const varName = `v${++ctx.count}`;
			ctx.vars.push({
				name: varName,
				type: value.type,
				value: value.value
			});
			return `${name}:$${varName}`;
		}
		if (typeof value === "object" && !Array.isArray(value) && value !== null) return `${name}:{${parseArgs(value, ctx)}}`;
		return `${name}:${JSON.stringify(value)}`;
	}).join(",");
};
const excludedFields = ["__name", "__args"];
const parseRequest = (request, ctx) => {
	if (typeof request === "object") {
		let args = "";
		if (typeof request.__args === "object") {
			const argsString = parseArgs(request.__args, ctx);
			args = argsString ? `(${argsString})` : "";
		}
		const fieldNames = Object.keys(request).filter((f) => !excludedFields.includes(f)).filter((f) => Boolean(request[f]));
		if (fieldNames.length === 0) return args;
		const fieldsSelection = fieldNames.map((f) => `${f}${parseRequest(request[f], ctx)}`).join(",");
		return `${args}{${fieldsSelection}}`;
	}
	return "";
};
function createQuery(operation, request) {
	const context = {
		count: 0,
		vars: []
	};
	const result = parseRequest(request, context);
	const operationName = request.__name || "";
	const variables = {};
	return {
		query: `${operation} ${operationName}${context.count > 0 ? `(${context.vars.map((arg) => {
			variables[arg.name] = arg.value;
			return `$${arg.name}:${arg.type}`;
		})})` : ""}${result}`,
		variables
	};
}
//#endregion
//#region src/client/client.ts
const createClient = (fetcher) => {
	return {
		query(request, props) {
			return fetcher(createQuery("query", request), props);
		},
		mutate(request, props) {
			return fetcher(createQuery("mutation", request), props);
		}
	};
};
//#endregion
//#region src/client/error.ts
var GraphQLError = class extends Error {
	errors;
	constructor(errors) {
		super(errors[0].message);
		this.errors = errors;
	}
};
//#endregion
//#region src/client/fetcher.ts
const createFetcher = (optionsOrFunc) => {
	return async (operation, props = {}) => {
		const options = typeof optionsOrFunc === "function" ? await optionsOrFunc() : optionsOrFunc;
		const mime = "application/json";
		const result = await (await (props?.fetch ?? fetch)(options.url, {
			method: "POST",
			headers: {
				accept: mime,
				"content-type": mime,
				...options.headers ?? {},
				...props.headers ?? {}
			},
			body: JSON.stringify(operation),
			signal: props.signal
		})).json();
		if (result.errors && result.errors.length > 0) throw new GraphQLError(result.errors);
		return result.data;
	};
};
//#endregion
//#region src/generate/common/exclude.ts
const excludedTypes = [
	"__Schema",
	"__Type",
	"__TypeKind",
	"__Field",
	"__InputValue",
	"__EnumValue",
	"__Directive",
	"__DirectiveLocation"
];
//#endregion
//#region src/generate/request/name.ts
function requestTypeName(type) {
	return `${type.name}Request`;
}
//#endregion
//#region src/generate/common/comment.ts
function comment(comment) {
	const lines = [];
	if (comment.deprecated) lines.push(`@deprecated ${comment.deprecated.replace(/\s/g, " ")}`);
	if (comment.text) lines.push(...comment.text.split("\n"));
	return lines.length > 0 ? lines.length === 1 ? `\n/** ${lines[0]} */\n` : `\n/**\n${lines.map((l) => ` * ${l}`).join("\n")}\n */\n` : "";
}
function typeComment(type) {
	return comment({ text: type.description });
}
function fieldComment(field) {
	return comment({
		deprecated: field.deprecationReason,
		text: field.description
	});
}
function argumentComment(arg) {
	return comment({ text: arg.description });
}
//#endregion
//#region src/generate/common/type.ts
const renderSep = (type) => {
	return isNonNullType(type) ? ":" : "?:";
};
const renderType = (type, required = false) => {
	if (isNamedType(type)) {
		let typeName = type.name;
		if (isScalarType(type)) typeName = `Scalars['${typeName}']`;
		return required ? typeName : `(${typeName} | undefined)`;
	}
	if (isListType(type)) {
		const typing = `${renderType(type.ofType, required)}[]`;
		return required ? typing : `(${typing} | undefined)`;
	}
	return renderType(type.ofType, isNonNullType(type));
};
//#endregion
//#region src/generate/request/type/argument.ts
const toArgsString = (field) => {
	return `{${field.args.map((a) => {
		const type = renderArgumentType(a.type);
		const arg = `Arg<'${renderVariableArgument(a.type)}', ${type}>`;
		return `${argumentComment(a)}${a.name}${renderSep(a.type)}${arg} | ${type}`;
	}).join(",")}}`;
};
const renderArgumentType = (type, required = false) => {
	if (isNamedType(type)) {
		let typing = type.name;
		if (isScalarType(type)) typing = `Scalars['${type.name}']`;
		return required ? typing : `(${typing} | undefined)`;
	}
	if (isListType(type)) {
		const typing = `${renderArgumentType(type.ofType, false)}[]`;
		return required ? typing : `(${typing} | undefined)`;
	}
	return renderArgumentType(type.ofType, isNonNullType(type));
};
const renderVariableArgument = (type, required = false) => {
	const end = required ? "!" : "";
	if (isNamedType(type)) return `${type.name}${end}`;
	if (isListType(type)) return `[${renderVariableArgument(type.ofType, false)}]${end}`;
	return renderVariableArgument(type.ofType, isNonNullType(type));
};
//#endregion
//#region src/generate/request/type/object.ts
function renderObject$1(type, ctx) {
	const fields = type.getFields();
	const fieldStrings = Object.keys(fields).map((fieldName) => {
		const field = fields[fieldName];
		const types = [];
		const resolvedType = getNamedType(field.type);
		const resolvable = !(isEnumType(resolvedType) || isScalarType(resolvedType));
		const argsPresent = field.args.length > 0;
		const argsString = toArgsString(field);
		const argsOptional = !argsString.match(/[^?]:/);
		if (argsPresent) types.push(`{ __args${argsOptional ? "?" : ""}: ${argsString} }`);
		if (resolvable) types.push(requestTypeName(resolvedType));
		else if (!argsPresent) types.push("boolean | number");
		return [
			`${fieldComment(field)}${field.name}?: ${types.join(" & ")}`,
			`${fieldComment(field)}[key: \`\${string}:${field.name}\`]: ${types.join(" & ")}`,
			""
		];
	}).flat(1);
	if (isInterfaceType(type) && ctx.schema) {
		const interfaceProperties = ctx.schema.getPossibleTypes(type).map((t) => `['...on ${t.name}']?: ${requestTypeName(t)}`);
		fieldStrings.push(...interfaceProperties);
	}
	fieldStrings.push("__typename?: boolean | number");
	fieldStrings.push("[key: `${string}:__typename`]: boolean | number");
	const types = fieldStrings.map((x) => x.split("\n").filter(Boolean).map((l) => "	" + l).join("\n"));
	ctx.add(`${typeComment(type)}export type ${requestTypeName(type)} = {\n${types.join("\n")}\n}`);
}
//#endregion
//#region src/generate/request/type/input.ts
function renderInput(type, ctx) {
	const fields = type.getFields();
	const fieldStrings = Object.keys(fields).map((fieldName) => {
		const field = fields[fieldName];
		return `${argumentComment(field)}	${field.name}${renderSep(field.type)} ${renderType(field.type)}\n`;
	});
	ctx.add(`${typeComment(type)}export type ${type.name} = {\n${fieldStrings.join("")}}`);
}
//#endregion
//#region src/generate/request/type/union.ts
function renderUnion$1(type, ctx) {
	const types = type.getTypes();
	const fieldStrings = types.map((t) => `['...on ${t.name}']?: ${requestTypeName(t)}`);
	const commonInterfaces = new Set(types.map((x) => x.getInterfaces?.()).flat(10).filter(Boolean));
	fieldStrings.push(...Array.from(commonInterfaces).map((type) => {
		return `['...on ${type.name}']?: ${requestTypeName(type)}`;
	}));
	fieldStrings.push("__typename?: boolean | number");
	ctx.add(`${typeComment(type)}export type ${requestTypeName(type)} = {\n${fieldStrings.map((x) => "	" + x).join("\n")}\n}`);
}
//#endregion
//#region src/generate/request/index.ts
function renderRequest(schema, ctx) {
	const typeMap = schema.getTypeMap();
	for (const name in typeMap) {
		if (excludedTypes.includes(name)) continue;
		const type = typeMap[name];
		if (isObjectType(type) || isInterfaceType(type)) renderObject$1(type, ctx);
		if (isInputObjectType(type)) renderInput(type, ctx);
		if (isUnionType(type)) renderUnion$1(type, ctx);
	}
	const aliases = [
		{
			type: schema.getQueryType(),
			name: "QueryRequest"
		},
		{
			type: schema.getMutationType(),
			name: "MutationRequest"
		},
		{
			type: schema.getSubscriptionType(),
			name: "SubscriptionRequest"
		}
	].map(renderAlias$1).filter(Boolean).join("\n");
	ctx.add(aliases);
}
function renderAlias$1({ type, name }) {
	if (type && requestTypeName(type) !== name) return `export type ${name} = ${requestTypeName(type)}`;
	return "";
}
//#endregion
//#region src/generate/response/type/enum.ts
function renderEnum(type, ctx) {
	const values = type.getValues().map((v) => `'${v.name}'`);
	ctx.add(`${typeComment(type)}export type ${type.name} = ${values.join(" | ")}`);
}
//#endregion
//#region src/generate/response/type/union.ts
function renderUnion(type, ctx) {
	const typeNames = type.getTypes().map((t) => t.name);
	ctx.add(unionLike(type, typeNames));
}
const unionLike = (type, typeNames) => {
	const prop = `	__union: {\n${typeNames.map((name) => {
		return `${"	".repeat(2)}['...on ${name}']: ${name}\n`;
	}).join("")}	}`;
	return `${typeComment(type)}export type ${type.name} = {\n${prop}\n}`;
};
//#endregion
//#region src/generate/response/type/object.ts
function renderObject(type, ctx) {
	const fieldsMap = type.getFields();
	const fields = Object.keys(fieldsMap).map((fieldName) => fieldsMap[fieldName]);
	if (!ctx.schema) throw new Error("no schema provided");
	const typeNames = isObjectType(type) ? [type.name] : ctx.schema.getPossibleTypes(type).map((t) => t.name);
	const fieldStrings = fields.map((f) => {
		return [
			`${fieldComment(f)}${f.name}${renderSep(f.type)} ${renderType(f.type)}`,
			`${fieldComment(f)}[key: \`\${string}:${f.name}\`]: ${renderType(f.type)}`,
			""
		];
	}).flat(1);
	fieldStrings.push(`__typename: ${typeNames.length > 0 ? typeNames.map((t) => `'${t}'`).join("|") : "string"}`);
	fieldStrings.push(`[key: \`\${string}:__typename\`]: ${typeNames.length > 0 ? typeNames.map((t) => `'${t}'`).join("|") : "string"}`);
	const types = fieldStrings.map((x) => x.split("\n").filter(Boolean).map((l) => "	" + l).join("\n"));
	ctx.add(`${typeComment(type)}export type ${type.name} = {\n${types.join("\n")}\n}`);
}
//#endregion
//#region src/generate/response/type/interface.ts
function renderInterface(type, ctx) {
	if (!ctx.schema) throw new Error("schema is required to render unionType");
	const typeNames = ctx.schema.getPossibleTypes(type).map((t) => t.name);
	if (!typeNames.length) renderObject(type, ctx);
	else ctx.add(unionLike(type, typeNames));
}
//#endregion
//#region src/generate/response/index.ts
function renderResponse(schema, ctx) {
	const typeMap = schema.getTypeMap();
	for (const name in typeMap) {
		if (excludedTypes.includes(name)) continue;
		const type = typeMap[name];
		if (isEnumType(type)) renderEnum(type, ctx);
		if (isUnionType(type)) renderUnion(type, ctx);
		if (isObjectType(type)) renderObject(type, ctx);
		if (isInterfaceType(type)) renderInterface(type, ctx);
	}
	const aliases = [
		{
			type: schema.getQueryType(),
			name: "Query"
		},
		{
			type: schema.getMutationType(),
			name: "Mutation"
		},
		{
			type: schema.getSubscriptionType(),
			name: "Subscription"
		}
	].map(renderAlias).filter(Boolean).join("\n");
	ctx.add(aliases);
}
function renderAlias({ type, name }) {
	if (type && type.name !== name) return `export type ${name} = ${type.name}`;
	return "";
}
//#endregion
//#region src/generate/schema/index.ts
const renderSchema = (schema, ctx) => {
	const types = [
		{
			type: schema.getQueryType(),
			name: "Query",
			handle: "query"
		},
		{
			type: schema.getMutationType(),
			name: "Mutation",
			handle: "mutate"
		},
		{
			type: schema.getSubscriptionType(),
			name: "Subscription",
			handle: "subscribe"
		}
	].filter((type) => type.type);
	ctx.add(types.map((type) => {
		return type.type ? `export type ${type.name}Schema = {\n	request: ${type.name}Request\n	response: ${type.name}\n}` : "";
	}).join("\n"));
	ctx.add(`export type Schema = {${types.map((type) => `\n	${type.handle}: ${type.name}Schema`).join("")}\n}`);
};
//#endregion
//#region src/generate/scalar/index.ts
const knownTypes = {
	Int: "number",
	Float: "number",
	String: "string",
	Boolean: "boolean",
	ID: "string"
};
function renderScalar(schema, ctx) {
	const scalarTypes = Object.values(schema.getTypeMap()).filter((type) => isScalarType(type)).map((type) => {
		return `	${type.name}: ${getTypeMappedAlias(type, ctx)}\n`;
	}).join("");
	ctx.add(`export type Scalars = {\n${scalarTypes}}`);
}
const getTypeMappedAlias = (type, ctx) => {
	return {
		...knownTypes,
		...ctx?.config?.scalarTypes ?? {}
	}[type.name] || "unknown";
};
//#endregion
//#region src/generate/index.ts
const generate = (schema, config = {}) => {
	const lines = [];
	const ctx = {
		schema,
		config,
		add(code) {
			lines.push(code);
		}
	};
	const packageName = config.package ?? "@awsless/graphql";
	ctx.add(`import type { Arg } from '${packageName}'`);
	ctx.add("// Scalar Types");
	renderScalar(schema, ctx);
	ctx.add("// Request Types");
	renderRequest(schema, ctx);
	ctx.add("// Response Types");
	renderResponse(schema, ctx);
	ctx.add("// Schema Types");
	renderSchema(schema, ctx);
	return lines.join("\n\n");
};
//#endregion
export { $, Arg, GraphQLError, createClient, createFetcher, createQuery, generate };
