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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  $: () => $,
  Arg: () => Arg,
  createClient: () => createClient,
  createFetcher: () => createFetcher,
  createQuery: () => createQuery,
  generate: () => generate
});
module.exports = __toCommonJS(src_exports);

// src/client/argument.ts
var Arg = class {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }
};
var $ = (type, value) => {
  return new Arg(type, value);
};

// src/client/query.ts
var parseArgs = (args, ctx) => {
  const argEntries = Object.entries(args).filter(([_, value]) => typeof value !== "undefined");
  if (argEntries.length === 0) {
    return "";
  }
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
    if (typeof value === "object" && !Array.isArray(value) && value !== null) {
      return `${name}:{${parseArgs(value, ctx)}}`;
    }
    return `${name}:${JSON.stringify(value)}`;
  }).join(",");
};
var excludedFields = ["__name", "__args"];
var parseRequest = (request, ctx) => {
  if (typeof request === "object") {
    let args = "";
    if (typeof request.__args === "object") {
      const argsString = parseArgs(request.__args, ctx);
      args = argsString ? `(${argsString})` : "";
    }
    const fieldNames = Object.keys(request).filter((f) => !excludedFields.includes(f)).filter((f) => Boolean(request[f]));
    if (fieldNames.length === 0) {
      return args;
    }
    const fieldsSelection = fieldNames.map((f) => `${f}${parseRequest(request[f], ctx)}`).join(",");
    return `${args}{${fieldsSelection}}`;
  }
  return "";
};
function createQuery(operation, request) {
  const context = { count: 0, vars: [] };
  const result = parseRequest(request, context);
  const operationName = request.__name || "";
  const variables = {};
  const varsString = context.count > 0 ? `(${context.vars.map((arg) => {
    variables[arg.name] = arg.value;
    return `$${arg.name}:${arg.type}`;
  })})` : "";
  return {
    query: `${operation} ${operationName}${varsString}${result}`,
    variables
  };
}

// src/client/client.ts
var createClient = (fetcher) => {
  return {
    query(request) {
      return fetcher(createQuery("query", request));
    },
    mutate(request) {
      return fetcher(createQuery("mutation", request));
    }
  };
};

// src/client/error.ts
var GraphQLError = class extends Error {
  constructor(errors) {
    super(errors[0].message);
    this.errors = errors;
  }
};

// src/client/fetcher.ts
var createFetcher = (propsOrFunc) => {
  return async (operation) => {
    const props = typeof propsOrFunc === "function" ? await propsOrFunc() : propsOrFunc;
    const mime = "application/json";
    const response = await fetch(props.url, {
      method: "POST",
      headers: {
        accept: mime,
        "content-type": mime,
        ...props.headers ?? {}
      },
      body: JSON.stringify(operation)
    });
    const result = await response.json();
    if (result.errors && result.errors.length > 1) {
      throw new GraphQLError(result.errors);
    }
    return result.data;
  };
};

// src/generate/request/index.ts
var import_graphql4 = require("graphql");

// src/generate/common/exclude.ts
var excludedTypes = [
  "__Schema",
  "__Type",
  "__TypeKind",
  "__Field",
  "__InputValue",
  "__EnumValue",
  "__Directive",
  "__DirectiveLocation"
];

// src/generate/request/type/object.ts
var import_graphql3 = require("graphql");

// src/generate/request/name.ts
function requestTypeName(type) {
  return `${type.name}Request`;
}

// src/generate/common/comment.ts
function comment(comment2) {
  const lines = [];
  if (comment2.deprecated) {
    lines.push(`@deprecated ${comment2.deprecated.replace(/\s/g, " ")}`);
  }
  if (comment2.text) {
    lines.push(...comment2.text.split("\n"));
  }
  return lines.length > 0 ? lines.length === 1 ? `
/** ${lines[0]} */
` : `
/**
${lines.map((l) => ` * ${l}`).join("\n")}
 */
` : "";
}
function typeComment(type) {
  return comment({
    text: type.description
  });
}
function fieldComment(field) {
  return comment({
    deprecated: field.deprecationReason,
    text: field.description
  });
}
function argumentComment(arg) {
  return comment({
    text: arg.description
  });
}

// src/generate/request/type/argument.ts
var import_graphql2 = require("graphql");

// src/generate/common/type.ts
var import_graphql = require("graphql");
var renderSep = (type) => {
  return (0, import_graphql.isNonNullType)(type) ? ":" : "?:";
};
var renderType = (type, required = false) => {
  if ((0, import_graphql.isNamedType)(type)) {
    let typeName = type.name;
    if ((0, import_graphql.isScalarType)(type)) {
      typeName = `Scalars['${typeName}']`;
    }
    return required ? typeName : `(${typeName} | undefined)`;
  }
  if ((0, import_graphql.isListType)(type)) {
    const typing = `${renderType(type.ofType, required)}[]`;
    return required ? typing : `(${typing} | undefined)`;
  }
  return renderType(type.ofType, (0, import_graphql.isNonNullType)(type));
};

// src/generate/request/type/argument.ts
var toArgsString = (field) => {
  return `{${field.args.map((a) => {
    const type = renderArgumentType(a.type);
    const arg = `Arg<'${renderVariableArgument(a.type)}', ${type}>`;
    return `${argumentComment(a)}${a.name}${renderSep(a.type)}${arg} | ${type}`;
  }).join(",")}}`;
};
var renderArgumentType = (type, required = false) => {
  if ((0, import_graphql2.isNamedType)(type)) {
    let typing = type.name;
    if ((0, import_graphql2.isScalarType)(type)) {
      typing = `Scalars['${type.name}']`;
    }
    return required ? typing : `(${typing} | undefined)`;
  }
  if ((0, import_graphql2.isListType)(type)) {
    const typing = `${renderArgumentType(type.ofType, false)}[]`;
    return required ? typing : `(${typing} | undefined)`;
  }
  return renderArgumentType(type.ofType, (0, import_graphql2.isNonNullType)(type));
};
var renderVariableArgument = (type, required = false) => {
  const end = required ? "!" : "";
  if ((0, import_graphql2.isNamedType)(type)) {
    return `${type.name}${end}`;
  }
  if ((0, import_graphql2.isListType)(type)) {
    return `[${renderVariableArgument(type.ofType, false)}]${end}`;
  }
  return renderVariableArgument(type.ofType, (0, import_graphql2.isNonNullType)(type));
};

// src/generate/common/indent.ts
var INDENT = "	";

// src/generate/request/type/object.ts
function renderObject(type, ctx) {
  const fields = type.getFields();
  const fieldStrings = Object.keys(fields).map((fieldName) => {
    const field = fields[fieldName];
    const types2 = [];
    const resolvedType = (0, import_graphql3.getNamedType)(field.type);
    const resolvable = !((0, import_graphql3.isEnumType)(resolvedType) || (0, import_graphql3.isScalarType)(resolvedType));
    const argsPresent = field.args.length > 0;
    const argsString = toArgsString(field);
    const argsOptional = !argsString.match(/[^?]:/);
    if (argsPresent) {
      types2.push(`{ __args${argsOptional ? "?" : ""}: ${argsString} }`);
    }
    if (resolvable) {
      types2.push(requestTypeName(resolvedType));
    } else if (!argsPresent) {
      types2.push("boolean | number");
    }
    return [
      `${fieldComment(field)}${field.name}?: ${types2.join(" & ")}`,
      `${fieldComment(field)}[key: \`\${string}:${field.name}\`]: ${types2.join(" & ")}`,
      ""
    ];
  }).flat(1);
  if ((0, import_graphql3.isInterfaceType)(type) && ctx.schema) {
    const interfaceProperties = ctx.schema.getPossibleTypes(type).map((t) => `['...on ${t.name}']?: ${requestTypeName(t)}`);
    fieldStrings.push(...interfaceProperties);
  }
  fieldStrings.push("__typename?: boolean | number");
  fieldStrings.push("[key: `${string}:__typename`]: boolean | number");
  const types = fieldStrings.map(
    (x) => x.split("\n").filter(Boolean).map((l) => INDENT + l).join("\n")
  );
  ctx.add(`${typeComment(type)}export type ${requestTypeName(type)} = {
${types.join("\n")}
}`);
}

// src/generate/request/type/input.ts
function renderInput(type, ctx) {
  const fields = type.getFields();
  const fieldStrings = Object.keys(fields).map((fieldName) => {
    const field = fields[fieldName];
    return `${argumentComment(field)}${INDENT}${field.name}${renderSep(field.type)} ${renderType(
      field.type
    )}
`;
  });
  ctx.add(`${typeComment(type)}export type ${type.name} = {
${fieldStrings.join("")}}`);
}

// src/generate/request/type/union.ts
function renderUnion(type, ctx) {
  const types = type.getTypes();
  const fieldStrings = types.map((t) => `['...on ${t.name}']?: ${requestTypeName(t)}`);
  const commonInterfaces = new Set(
    types.map((x) => x.getInterfaces?.()).flat(10).filter(Boolean)
  );
  fieldStrings.push(
    ...Array.from(commonInterfaces).map((type2) => {
      return `['...on ${type2.name}']?: ${requestTypeName(type2)}`;
    })
  );
  fieldStrings.push("__typename?: boolean | number");
  ctx.add(
    `${typeComment(type)}export type ${requestTypeName(type)} = {
${fieldStrings.map((x) => INDENT + x).join("\n")}
}`
  );
}

// src/generate/request/index.ts
function renderRequest(schema, ctx) {
  const typeMap = schema.getTypeMap();
  for (const name in typeMap) {
    if (excludedTypes.includes(name))
      continue;
    const type = typeMap[name];
    if ((0, import_graphql4.isObjectType)(type) || (0, import_graphql4.isInterfaceType)(type))
      renderObject(type, ctx);
    if ((0, import_graphql4.isInputObjectType)(type))
      renderInput(type, ctx);
    if ((0, import_graphql4.isUnionType)(type))
      renderUnion(type, ctx);
  }
  const aliases = [
    { type: schema.getQueryType(), name: "QueryRequest" },
    { type: schema.getMutationType(), name: "MutationRequest" },
    { type: schema.getSubscriptionType(), name: "SubscriptionRequest" }
  ].map(renderAlias).filter(Boolean).join("\n");
  ctx.add(aliases);
}
function renderAlias({ type, name }) {
  if (type && requestTypeName(type) !== name) {
    return `export type ${name} = ${requestTypeName(type)}`;
  }
  return "";
}

// src/generate/response/index.ts
var import_graphql6 = require("graphql");

// src/generate/response/type/enum.ts
function renderEnum(type, ctx) {
  const values = type.getValues().map((v) => `'${v.name}'`);
  ctx.add(`${typeComment(type)}export type ${type.name} = ${values.join(" | ")}`);
}

// src/generate/response/type/union.ts
function renderUnion2(type, ctx) {
  const typeNames = type.getTypes().map((t) => t.name);
  ctx.add(unionLike(type, typeNames));
}
var unionLike = (type, typeNames) => {
  const prop = `${INDENT}__union: {
${typeNames.map((name) => {
    return `${INDENT.repeat(2)}['...on ${name}']: ${name}
`;
  }).join("")}${INDENT}}`;
  return `${typeComment(type)}export type ${type.name} = {
${prop}
}`;
};

// src/generate/response/type/object.ts
var import_graphql5 = require("graphql");
function renderObject2(type, ctx) {
  const fieldsMap = type.getFields();
  const fields = Object.keys(fieldsMap).map((fieldName) => fieldsMap[fieldName]);
  if (!ctx.schema)
    throw new Error("no schema provided");
  const typeNames = (0, import_graphql5.isObjectType)(type) ? [type.name] : ctx.schema.getPossibleTypes(type).map((t) => t.name);
  const fieldStrings = fields.map((f) => {
    return [
      `${fieldComment(f)}${f.name}${renderSep(f.type)} ${renderType(f.type)}`,
      `${fieldComment(f)}[key: \`\${string}:${f.name}\`]: ${renderType(f.type)}`,
      ""
    ];
  }).flat(1);
  fieldStrings.push(`__typename: ${typeNames.length > 0 ? typeNames.map((t) => `'${t}'`).join("|") : "string"}`);
  fieldStrings.push(
    `[key: \`\${string}:__typename\`]: ${typeNames.length > 0 ? typeNames.map((t) => `'${t}'`).join("|") : "string"}`
  );
  const types = fieldStrings.map(
    (x) => x.split("\n").filter(Boolean).map((l) => INDENT + l).join("\n")
  );
  ctx.add(`${typeComment(type)}export type ${type.name} = {
${types.join("\n")}
}`);
}

// src/generate/response/type/interface.ts
function renderInterface(type, ctx) {
  if (!ctx.schema) {
    throw new Error("schema is required to render unionType");
  }
  const typeNames = ctx.schema.getPossibleTypes(type).map((t) => t.name);
  if (!typeNames.length) {
    renderObject2(type, ctx);
  } else {
    ctx.add(unionLike(type, typeNames));
  }
}

// src/generate/response/index.ts
function renderResponse(schema, ctx) {
  const typeMap = schema.getTypeMap();
  for (const name in typeMap) {
    if (excludedTypes.includes(name))
      continue;
    const type = typeMap[name];
    if ((0, import_graphql6.isEnumType)(type))
      renderEnum(type, ctx);
    if ((0, import_graphql6.isUnionType)(type))
      renderUnion2(type, ctx);
    if ((0, import_graphql6.isObjectType)(type))
      renderObject2(type, ctx);
    if ((0, import_graphql6.isInterfaceType)(type))
      renderInterface(type, ctx);
  }
  const aliases = [
    { type: schema.getQueryType(), name: "Query" },
    { type: schema.getMutationType(), name: "Mutation" },
    { type: schema.getSubscriptionType(), name: "Subscription" }
  ].map(renderAlias2).filter(Boolean).join("\n");
  ctx.add(aliases);
}
function renderAlias2({ type, name }) {
  if (type && type.name !== name) {
    return `export type ${name} = ${type.name}`;
  }
  return "";
}

// src/generate/schema/index.ts
var renderSchema = (schema, ctx) => {
  const types = [
    { type: schema.getQueryType(), name: "Query", handle: "query" },
    { type: schema.getMutationType(), name: "Mutation", handle: "mutate" },
    { type: schema.getSubscriptionType(), name: "Subscription", handle: "subscribe" }
  ].filter((type) => type.type);
  ctx.add(
    types.map((type) => {
      return type.type ? `export type ${type.name}Schema = {
${INDENT}request: ${type.name}Request
${INDENT}response: ${type.name}
}` : "";
    }).join("\n")
  );
  ctx.add(
    `export type Schema = {${types.map((type) => `
${INDENT}${type.handle}: ${type.name}Schema`).join("")}
}`
  );
};

// src/generate/scalar/index.ts
var import_graphql7 = require("graphql");
var knownTypes = {
  Int: "number",
  Float: "number",
  String: "string",
  Boolean: "boolean",
  ID: "string"
};
function renderScalar(schema, ctx) {
  const scalarTypes = Object.values(schema.getTypeMap()).filter((type) => (0, import_graphql7.isScalarType)(type)).map((type) => {
    return `${INDENT}${type.name}: ${getTypeMappedAlias(type, ctx)}
`;
  }).join("");
  ctx.add(`export type Scalars = {
${scalarTypes}}`);
}
var getTypeMappedAlias = (type, ctx) => {
  const map = { ...knownTypes, ...ctx?.config?.scalarTypes ?? {} };
  return map?.[type.name] || "unknown";
};

// src/generate/index.ts
var generate = (schema, config = {}) => {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  $,
  Arg,
  createClient,
  createFetcher,
  createQuery,
  generate
});