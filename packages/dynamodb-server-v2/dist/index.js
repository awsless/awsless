// src/dynamodb-server.ts
import { DynamoDBClient as DynamoDBClient2 } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// src/clock.ts
var VirtualClock = class {
  offset = 0;
  now() {
    return Date.now() + this.offset;
  }
  nowInSeconds() {
    return Math.floor(this.now() / 1e3);
  }
  advance(ms) {
    this.offset += ms;
  }
  set(timestamp) {
    this.offset = timestamp - Date.now();
  }
  reset() {
    this.offset = 0;
  }
};

// src/java-server.ts
import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { spawn } from "dynamo-db-local";
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function createJavaServer(port, region) {
  const childProcess = spawn({ port });
  const getClient = () => new DynamoDBClient({
    endpoint: `http://localhost:${port}`,
    region,
    credentials: {
      accessKeyId: "fake",
      secretAccessKey: "fake"
    }
  });
  const ping = async () => {
    const client = getClient();
    try {
      const response = await client.send(new ListTablesCommand({}));
      return Array.isArray(response.TableNames);
    } catch {
      return false;
    }
  };
  const wait = async (times = 10) => {
    while (times--) {
      if (await ping()) {
        return;
      }
      await sleep(100 * (times + 1));
    }
    throw new Error("DynamoDB server is unavailable");
  };
  return {
    port,
    stop: async () => {
      childProcess.kill();
    },
    ping,
    wait
  };
}

// src/server.ts
import {
  createServer as createHttpServer
} from "node:http";

// src/errors/index.ts
var DynamoDBError = class extends Error {
  __type;
  statusCode;
  constructor(type, message, statusCode = 400) {
    super(message);
    this.__type = `com.amazonaws.dynamodb.v20120810#${type}`;
    this.statusCode = statusCode;
  }
  toJSON() {
    return {
      __type: this.__type,
      message: this.message
    };
  }
};
var ValidationException = class extends DynamoDBError {
  constructor(message) {
    super("ValidationException", message, 400);
  }
};
var ResourceNotFoundException = class extends DynamoDBError {
  constructor(message) {
    super("ResourceNotFoundException", message, 400);
  }
};
var ResourceInUseException = class extends DynamoDBError {
  constructor(message) {
    super("ResourceInUseException", message, 400);
  }
};
var ConditionalCheckFailedException = class extends DynamoDBError {
  Item;
  constructor(message = "The conditional request failed", item) {
    super("ConditionalCheckFailedException", message, 400);
    this.Item = item;
  }
  toJSON() {
    return {
      __type: this.__type,
      message: this.message,
      ...this.Item && { Item: this.Item }
    };
  }
};
var TransactionCanceledException = class extends DynamoDBError {
  CancellationReasons;
  constructor(message, reasons) {
    super("TransactionCanceledException", message, 400);
    this.CancellationReasons = reasons;
  }
  toJSON() {
    return {
      __type: this.__type,
      message: this.message,
      CancellationReasons: this.CancellationReasons
    };
  }
};
var TransactionConflictException = class extends DynamoDBError {
  constructor(message = "Transaction is ongoing for the item") {
    super("TransactionConflictException", message, 400);
  }
};
var ProvisionedThroughputExceededException = class extends DynamoDBError {
  constructor(message = "The level of configured provisioned throughput for the table was exceeded") {
    super("ProvisionedThroughputExceededException", message, 400);
  }
};
var ItemCollectionSizeLimitExceededException = class extends DynamoDBError {
  constructor(message = "Collection size exceeded") {
    super("ItemCollectionSizeLimitExceededException", message, 400);
  }
};
var InternalServerError = class extends DynamoDBError {
  constructor(message = "Internal server error") {
    super("InternalServerError", message, 500);
  }
};
var SerializationException = class extends DynamoDBError {
  constructor(message) {
    super("SerializationException", message, 400);
  }
};
var IdempotentParameterMismatchException = class extends DynamoDBError {
  constructor(message = "The request uses the same client token as a previous, but non-identical request") {
    super("IdempotentParameterMismatchException", message, 400);
  }
};

// src/operations/create-table.ts
function validateAndCreate(store, input) {
  if (!input.TableName) {
    throw new ValidationException("TableName is required");
  }
  if (!input.KeySchema || input.KeySchema.length === 0) {
    throw new ValidationException("KeySchema is required");
  }
  if (!input.AttributeDefinitions || input.AttributeDefinitions.length === 0) {
    throw new ValidationException("AttributeDefinitions is required");
  }
  const hashKeys = input.KeySchema.filter((k) => k.KeyType === "HASH");
  if (hashKeys.length !== 1) {
    throw new ValidationException("Exactly one hash key is required");
  }
  const rangeKeys = input.KeySchema.filter((k) => k.KeyType === "RANGE");
  if (rangeKeys.length > 1) {
    throw new ValidationException("At most one range key is allowed");
  }
  const definedAttrs = new Set(input.AttributeDefinitions.map((a) => a.AttributeName));
  for (const keyElement of input.KeySchema) {
    if (!definedAttrs.has(keyElement.AttributeName)) {
      throw new ValidationException(
        `Attribute ${keyElement.AttributeName} is specified in KeySchema but not in AttributeDefinitions`
      );
    }
  }
  if (input.LocalSecondaryIndexes) {
    const tableHashKey = hashKeys[0].AttributeName;
    for (const lsi of input.LocalSecondaryIndexes) {
      const lsiHashKey = lsi.KeySchema.find((k) => k.KeyType === "HASH");
      if (!lsiHashKey || lsiHashKey.AttributeName !== tableHashKey) {
        throw new ValidationException(
          `Local secondary index ${lsi.IndexName} must have the same hash key as the table`
        );
      }
    }
  }
  const table = store.createTable({
    TableName: input.TableName,
    KeySchema: input.KeySchema,
    AttributeDefinitions: input.AttributeDefinitions,
    ProvisionedThroughput: input.ProvisionedThroughput,
    BillingMode: input.BillingMode,
    GlobalSecondaryIndexes: input.GlobalSecondaryIndexes,
    LocalSecondaryIndexes: input.LocalSecondaryIndexes,
    StreamSpecification: input.StreamSpecification
  });
  return table.describe();
}
function createTable(store, input) {
  const tableDescription = validateAndCreate(store, input);
  return { TableDescription: tableDescription };
}

// src/operations/delete-table.ts
function deleteTable(store, input) {
  if (!input.TableName) {
    throw new ValidationException("TableName is required");
  }
  const table = store.deleteTable(input.TableName);
  const description = table.describe();
  return {
    TableDescription: {
      ...description,
      TableStatus: "DELETING"
    }
  };
}

// src/operations/describe-table.ts
function describeTable(store, input) {
  if (!input.TableName) {
    throw new ValidationException("TableName is required");
  }
  const table = store.getTable(input.TableName);
  return {
    Table: table.describe()
  };
}

// src/operations/list-tables.ts
function listTables(store, input) {
  const result = store.listTables(input.ExclusiveStartTableName, input.Limit);
  return {
    TableNames: result.tableNames,
    LastEvaluatedTableName: result.lastEvaluatedTableName
  };
}

// src/expressions/path.ts
function parsePath(path, attributeNames) {
  const segments = [];
  let current = "";
  let i = 0;
  while (i < path.length) {
    const char = path[i];
    if (char === ".") {
      if (current) {
        segments.push({ type: "attribute", value: resolveAttributeName(current, attributeNames) });
        current = "";
      }
      i++;
    } else if (char === "[") {
      if (current) {
        segments.push({ type: "attribute", value: resolveAttributeName(current, attributeNames) });
        current = "";
      }
      i++;
      let indexStr = "";
      while (i < path.length && path[i] !== "]") {
        indexStr += path[i];
        i++;
      }
      i++;
      segments.push({ type: "index", value: parseInt(indexStr, 10) });
    } else {
      current += char;
      i++;
    }
  }
  if (current) {
    segments.push({ type: "attribute", value: resolveAttributeName(current, attributeNames) });
  }
  return segments;
}
function resolveAttributeName(name, attributeNames) {
  if (name.startsWith("#") && attributeNames) {
    const resolved = attributeNames[name];
    if (resolved !== void 0) {
      return resolved;
    }
  }
  return name;
}
function getValueAtPath(item, segments) {
  let current = { M: item };
  for (const segment of segments) {
    if (current === void 0) {
      return void 0;
    }
    if (segment.type === "attribute") {
      if ("M" in current) {
        const map = current.M;
        current = map[segment.value];
      } else {
        return void 0;
      }
    } else if (segment.type === "index") {
      if ("L" in current) {
        const list = current.L;
        current = list[segment.value];
      } else {
        return void 0;
      }
    }
  }
  return current;
}
function setValueAtPath(item, segments, value) {
  if (segments.length === 0) {
    return;
  }
  let current = { M: item };
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const nextSegment = segments[i + 1];
    if (segment.type === "attribute") {
      if (!("M" in current)) {
        return;
      }
      const map = current.M;
      const attrName = segment.value;
      if (!map[attrName]) {
        if (nextSegment.type === "attribute") {
          map[attrName] = { M: {} };
        } else {
          map[attrName] = { L: [] };
        }
      }
      current = map[attrName];
    } else if (segment.type === "index") {
      if (!("L" in current)) {
        return;
      }
      const list = current.L;
      const idx = segment.value;
      if (!list[idx]) {
        if (nextSegment.type === "attribute") {
          list[idx] = { M: {} };
        } else {
          list[idx] = { L: [] };
        }
      }
      current = list[idx];
    }
  }
  const lastSegment = segments[segments.length - 1];
  if (lastSegment.type === "attribute") {
    if ("M" in current) {
      const map = current.M;
      map[lastSegment.value] = value;
    }
  } else if (lastSegment.type === "index") {
    if ("L" in current) {
      const list = current.L;
      list[lastSegment.value] = value;
    }
  }
}
function deleteValueAtPath(item, segments) {
  if (segments.length === 0) {
    return false;
  }
  let current = { M: item };
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (segment.type === "attribute") {
      if (!("M" in current)) {
        return false;
      }
      const map = current.M;
      if (!map[segment.value]) {
        return false;
      }
      current = map[segment.value];
    } else if (segment.type === "index") {
      if (!("L" in current)) {
        return false;
      }
      const list = current.L;
      if (list[segment.value] === void 0) {
        return false;
      }
      current = list[segment.value];
    }
  }
  const lastSegment = segments[segments.length - 1];
  if (lastSegment.type === "attribute") {
    if ("M" in current) {
      const map = current.M;
      delete map[lastSegment.value];
      return true;
    }
  } else if (lastSegment.type === "index") {
    if ("L" in current) {
      const list = current.L;
      list.splice(lastSegment.value, 1);
      return true;
    }
  }
  return false;
}

// src/expressions/condition.ts
function tokenize(expression) {
  const tokens = [];
  let i = 0;
  const keywords = {
    AND: "AND",
    OR: "OR",
    NOT: "NOT",
    BETWEEN: "BETWEEN",
    IN: "IN"
  };
  const functions = ["attribute_exists", "attribute_not_exists", "attribute_type", "begins_with", "contains", "size"];
  while (i < expression.length) {
    const char = expression[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    if (char === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
      i++;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
      i++;
      continue;
    }
    if (char === ",") {
      tokens.push({ type: "COMMA", value: "," });
      i++;
      continue;
    }
    if (char === "=" || char === "<" || char === ">") {
      let op = char;
      if (expression[i + 1] === "=") {
        op += "=";
        i++;
      } else if (char === "<" && expression[i + 1] === ">") {
        op = "<>";
        i++;
      }
      tokens.push({ type: "COMPARATOR", value: op });
      i++;
      continue;
    }
    if (char === ":") {
      let value = ":";
      i++;
      while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i])) {
        value += expression[i];
        i++;
      }
      tokens.push({ type: "VALUE", value });
      continue;
    }
    if (char === "#") {
      let value = "#";
      i++;
      while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i])) {
        value += expression[i];
        i++;
      }
      tokens.push({ type: "PATH", value });
      continue;
    }
    if (/[a-zA-Z_]/.test(char)) {
      let word = "";
      while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i])) {
        word += expression[i];
        i++;
      }
      const upper = word.toUpperCase();
      if (keywords[upper]) {
        tokens.push({ type: keywords[upper], value: upper });
      } else if (functions.includes(word)) {
        tokens.push({ type: "FUNCTION", value: word });
      } else {
        tokens.push({ type: "PATH", value: word });
      }
      continue;
    }
    if (char === "[") {
      let value = "";
      while (i < expression.length && expression[i] !== "]") {
        value += expression[i];
        i++;
      }
      value += "]";
      i++;
      if (tokens.length > 0 && tokens[tokens.length - 1].type === "PATH") {
        tokens[tokens.length - 1].value += value;
      }
      continue;
    }
    if (char === ".") {
      if (tokens.length > 0 && tokens[tokens.length - 1].type === "PATH") {
        i++;
        let pathPart = ".";
        while (i < expression.length && /[a-zA-Z0-9_#\[\]]/.test(expression[i])) {
          pathPart += expression[i];
          i++;
        }
        tokens[tokens.length - 1].value += pathPart;
      } else {
        i++;
      }
      continue;
    }
    i++;
  }
  return tokens;
}
function evaluateCondition(expression, item, context) {
  if (!expression || expression.trim() === "") {
    return true;
  }
  const tokens = tokenize(expression);
  let pos = 0;
  function current() {
    return tokens[pos];
  }
  function consume(type) {
    const token = tokens[pos];
    if (!token) {
      throw new ValidationException("Unexpected end of expression");
    }
    if (type && token.type !== type) {
      throw new ValidationException(`Expected ${type} but got ${token.type}`);
    }
    pos++;
    return token;
  }
  function parseExpression() {
    return parseOr();
  }
  function parseOr() {
    let left = parseAnd();
    while (current()?.type === "OR") {
      consume("OR");
      const right = parseAnd();
      left = left || right;
    }
    return left;
  }
  function parseAnd() {
    let left = parseNot();
    while (current()?.type === "AND") {
      consume("AND");
      const right = parseNot();
      left = left && right;
    }
    return left;
  }
  function parseNot() {
    if (current()?.type === "NOT") {
      consume("NOT");
      return !parseNot();
    }
    return parsePrimary();
  }
  function parsePrimary() {
    const token = current();
    if (!token) {
      return true;
    }
    if (token.type === "LPAREN") {
      consume("LPAREN");
      const result = parseExpression();
      consume("RPAREN");
      return result;
    }
    if (token.type === "FUNCTION") {
      return parseFunction();
    }
    if (token.type === "PATH" || token.type === "VALUE") {
      return parseComparison();
    }
    throw new ValidationException(`Unexpected token: ${token.type}`);
  }
  function parseFunction() {
    const funcToken = consume("FUNCTION");
    consume("LPAREN");
    const funcName = funcToken.value;
    if (funcName === "attribute_exists") {
      const pathToken = consume("PATH");
      consume("RPAREN");
      const segments = parsePath(pathToken.value, context.expressionAttributeNames);
      const value = getValueAtPath(item, segments);
      return value !== void 0;
    }
    if (funcName === "attribute_not_exists") {
      const pathToken = consume("PATH");
      consume("RPAREN");
      const segments = parsePath(pathToken.value, context.expressionAttributeNames);
      const value = getValueAtPath(item, segments);
      return value === void 0;
    }
    if (funcName === "attribute_type") {
      const pathToken = consume("PATH");
      consume("COMMA");
      const typeToken = consume("VALUE");
      consume("RPAREN");
      const segments = parsePath(pathToken.value, context.expressionAttributeNames);
      const value = getValueAtPath(item, segments);
      const expectedType = resolveValue(typeToken.value);
      if (!value || !expectedType || !("S" in expectedType)) {
        return false;
      }
      const typeMap = {
        S: "S",
        N: "N",
        B: "B",
        SS: "SS",
        NS: "NS",
        BS: "BS",
        M: "M",
        L: "L",
        NULL: "NULL",
        BOOL: "BOOL"
      };
      const actualType = Object.keys(value)[0];
      return typeMap[expectedType.S] === actualType;
    }
    if (funcName === "begins_with") {
      const pathToken = consume("PATH");
      consume("COMMA");
      const prefixToken = consume("VALUE");
      consume("RPAREN");
      const segments = parsePath(pathToken.value, context.expressionAttributeNames);
      const value = getValueAtPath(item, segments);
      const prefix = resolveValue(prefixToken.value);
      if (!value || !prefix) {
        return false;
      }
      if ("S" in value && "S" in prefix) {
        return value.S.startsWith(prefix.S);
      }
      if ("B" in value && "B" in prefix) {
        return value.B.startsWith(prefix.B);
      }
      return false;
    }
    if (funcName === "contains") {
      const pathToken = consume("PATH");
      consume("COMMA");
      const operandToken = consume("VALUE");
      consume("RPAREN");
      const segments = parsePath(pathToken.value, context.expressionAttributeNames);
      const value = getValueAtPath(item, segments);
      const operand = resolveValue(operandToken.value);
      if (!value || !operand) {
        return false;
      }
      if ("S" in value && "S" in operand) {
        return value.S.includes(operand.S);
      }
      if ("SS" in value && "S" in operand) {
        return value.SS.includes(operand.S);
      }
      if ("NS" in value && "N" in operand) {
        return value.NS.includes(operand.N);
      }
      if ("BS" in value && "B" in operand) {
        return value.BS.includes(operand.B);
      }
      if ("L" in value) {
        return value.L.some((v) => compareValues(v, operand) === 0);
      }
      return false;
    }
    if (funcName === "size") {
      const pathToken = consume("PATH");
      consume("RPAREN");
      const segments = parsePath(pathToken.value, context.expressionAttributeNames);
      const value = getValueAtPath(item, segments);
      if (!value) {
        return false;
      }
      let size = 0;
      if ("S" in value) size = value.S.length;
      else if ("B" in value) size = value.B.length;
      else if ("SS" in value) size = value.SS.length;
      else if ("NS" in value) size = value.NS.length;
      else if ("BS" in value) size = value.BS.length;
      else if ("L" in value) size = value.L.length;
      else if ("M" in value) size = Object.keys(value.M).length;
      const nextToken = current();
      if (nextToken?.type === "COMPARATOR") {
        consume("COMPARATOR");
        const rightToken = consume("VALUE");
        const rightValue = resolveValue(rightToken.value);
        if (!rightValue || !("N" in rightValue)) {
          throw new ValidationException("Size comparison requires numeric operand");
        }
        return compareNumbers(size, parseFloat(rightValue.N), nextToken.value);
      }
      return size > 0;
    }
    throw new ValidationException(`Unknown function: ${funcName}`);
  }
  function parseComparison() {
    const leftToken = consume();
    const leftValue = resolveOperand2(leftToken);
    const nextToken = current();
    if (nextToken?.type === "COMPARATOR") {
      const op = consume("COMPARATOR").value;
      const rightToken = consume();
      const rightValue = resolveOperand2(rightToken);
      return compare(leftValue, rightValue, op);
    }
    if (nextToken?.type === "BETWEEN") {
      consume("BETWEEN");
      const lowToken = consume();
      const lowValue = resolveOperand2(lowToken);
      consume("AND");
      const highToken = consume();
      const highValue = resolveOperand2(highToken);
      if (!leftValue || !lowValue || !highValue) {
        return false;
      }
      return compareValues(leftValue, lowValue) >= 0 && compareValues(leftValue, highValue) <= 0;
    }
    if (nextToken?.type === "IN") {
      consume("IN");
      consume("LPAREN");
      const values = [];
      values.push(resolveOperand2(consume()));
      while (current()?.type === "COMMA") {
        consume("COMMA");
        values.push(resolveOperand2(consume()));
      }
      consume("RPAREN");
      if (!leftValue) {
        return false;
      }
      return values.some((v) => v && compareValues(leftValue, v) === 0);
    }
    return leftValue !== void 0;
  }
  function resolveOperand2(token) {
    if (token.type === "VALUE") {
      return resolveValue(token.value);
    }
    if (token.type === "PATH") {
      const segments = parsePath(token.value, context.expressionAttributeNames);
      return getValueAtPath(item, segments);
    }
    return void 0;
  }
  function resolveValue(ref) {
    if (ref.startsWith(":") && context.expressionAttributeValues) {
      return context.expressionAttributeValues[ref];
    }
    return void 0;
  }
  function compare(left, right, op) {
    if (!left || !right) {
      if (op === "<>") {
        return left !== right;
      }
      return false;
    }
    const cmp = compareValues(left, right);
    switch (op) {
      case "=":
        return cmp === 0;
      case "<>":
        return cmp !== 0;
      case "<":
        return cmp < 0;
      case "<=":
        return cmp <= 0;
      case ">":
        return cmp > 0;
      case ">=":
        return cmp >= 0;
      default:
        return false;
    }
  }
  function compareNumbers(left, right, op) {
    switch (op) {
      case "=":
        return left === right;
      case "<>":
        return left !== right;
      case "<":
        return left < right;
      case "<=":
        return left <= right;
      case ">":
        return left > right;
      case ">=":
        return left >= right;
      default:
        return false;
    }
  }
  return parseExpression();
}
function compareValues(a, b) {
  if ("S" in a && "S" in b) {
    return a.S.localeCompare(b.S);
  }
  if ("N" in a && "N" in b) {
    return parseFloat(a.N) - parseFloat(b.N);
  }
  if ("B" in a && "B" in b) {
    return a.B.localeCompare(b.B);
  }
  if ("BOOL" in a && "BOOL" in b) {
    return Number(a.BOOL) - Number(b.BOOL);
  }
  if ("NULL" in a && "NULL" in b) {
    return 0;
  }
  const aStr = JSON.stringify(a);
  const bStr = JSON.stringify(b);
  return aStr.localeCompare(bStr);
}

// src/store/item.ts
import { createHash } from "crypto";
function extractKey(item, keySchema) {
  const key = {};
  for (const element of keySchema) {
    const value = item[element.AttributeName];
    if (value) {
      key[element.AttributeName] = value;
    }
  }
  return key;
}
function serializeKey(key, keySchema) {
  const parts = [];
  for (const element of keySchema) {
    const value = key[element.AttributeName];
    if (value) {
      parts.push(serializeAttributeValue(value));
    }
  }
  return parts.join("#");
}
function serializeAttributeValue(value) {
  if ("S" in value) return `S:${value.S}`;
  if ("N" in value) return `N:${value.N}`;
  if ("B" in value) return `B:${value.B}`;
  if ("SS" in value) return `SS:${value.SS.sort().join(",")}`;
  if ("NS" in value) return `NS:${value.NS.sort().join(",")}`;
  if ("BS" in value) return `BS:${value.BS.sort().join(",")}`;
  if ("BOOL" in value) return `BOOL:${value.BOOL}`;
  if ("NULL" in value) return "NULL";
  if ("L" in value) return `L:${JSON.stringify(value.L)}`;
  if ("M" in value) return `M:${JSON.stringify(value.M)}`;
  return "";
}
function getHashKey(keySchema) {
  const hash = keySchema.find((k) => k.KeyType === "HASH");
  if (!hash) {
    throw new Error("No hash key found");
  }
  return hash.AttributeName;
}
function getRangeKey(keySchema) {
  const range = keySchema.find((k) => k.KeyType === "RANGE");
  return range?.AttributeName;
}
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
function estimateItemSize(item) {
  return JSON.stringify(item).length;
}
function extractRawValue(value) {
  if ("S" in value) return value.S;
  if ("N" in value) return value.N;
  if ("B" in value) return value.B;
  return serializeAttributeValue(value);
}
function hashAttributeValue(value) {
  const raw = extractRawValue(value);
  return createHash("md5").update("Outliers" + raw).digest("hex");
}

// src/expressions/key-condition.ts
function parseKeyCondition(expression, keySchema, context) {
  const hashKeyName = getHashKey(keySchema);
  const rangeKeyName = getRangeKey(keySchema);
  const resolvedNames = context.expressionAttributeNames || {};
  const resolvedValues = context.expressionAttributeValues || {};
  function resolveName(name) {
    if (name.startsWith("#")) {
      const resolved = resolvedNames[name];
      if (resolved === void 0) {
        throw new ValidationException(`Expression attribute name ${name} is not defined`);
      }
      return resolved;
    }
    return name;
  }
  function resolveValue(ref) {
    if (ref.startsWith(":")) {
      const value = resolvedValues[ref];
      if (value === void 0) {
        throw new ValidationException(`Expression attribute value ${ref} is not defined`);
      }
      return value;
    }
    throw new ValidationException(`Invalid value reference: ${ref}`);
  }
  function stripOuterParens(expr) {
    let s = expr.trim();
    while (s.startsWith("(") && s.endsWith(")")) {
      let depth = 0;
      let balanced = true;
      for (let i = 0; i < s.length - 1; i++) {
        if (s[i] === "(") depth++;
        else if (s[i] === ")") depth--;
        if (depth === 0) {
          balanced = false;
          break;
        }
      }
      if (balanced) {
        s = s.slice(1, -1).trim();
      } else {
        break;
      }
    }
    return s;
  }
  const normalizedExpression = stripOuterParens(expression);
  const parts = normalizedExpression.split(/\s+AND\s+/i);
  let hashValue;
  let rangeCondition;
  for (const part of parts) {
    const trimmed = stripOuterParens(part);
    const beginsWithMatch = trimmed.match(/^begins_with\s*\(\s*([#\w]+)\s*,\s*(:\w+)\s*\)$/i);
    if (beginsWithMatch) {
      const attrName = resolveName(beginsWithMatch[1]);
      const value = resolveValue(beginsWithMatch[2]);
      if (attrName === rangeKeyName) {
        rangeCondition = { operator: "begins_with", value };
      } else {
        throw new ValidationException(`begins_with can only be used on sort key`);
      }
      continue;
    }
    const betweenMatch = trimmed.match(/^([#\w]+)\s+BETWEEN\s+(:\w+)\s+AND\s+(:\w+)$/i);
    if (betweenMatch) {
      const attrName = resolveName(betweenMatch[1]);
      const value1 = resolveValue(betweenMatch[2]);
      const value2 = resolveValue(betweenMatch[3]);
      if (attrName === rangeKeyName) {
        rangeCondition = { operator: "BETWEEN", value: value1, value2 };
      } else {
        throw new ValidationException(`BETWEEN can only be used on sort key`);
      }
      continue;
    }
    const comparisonMatch = trimmed.match(/^([#\w]+)\s*(=|<>|<=|>=|<|>)\s*(:\w+)$/);
    if (comparisonMatch) {
      const attrName = resolveName(comparisonMatch[1]);
      const operator = comparisonMatch[2];
      const value = resolveValue(comparisonMatch[3]);
      if (attrName === hashKeyName) {
        if (operator !== "=") {
          throw new ValidationException(`Hash key condition must use = operator`);
        }
        hashValue = value;
      } else if (attrName === rangeKeyName) {
        rangeCondition = { operator, value };
      } else {
        throw new ValidationException(`Key condition references unknown attribute: ${attrName}`);
      }
      continue;
    }
    throw new ValidationException(`Invalid key condition expression: ${trimmed}`);
  }
  if (!hashValue) {
    throw new ValidationException(`Key condition must specify hash key equality`);
  }
  return {
    hashKey: hashKeyName,
    hashValue,
    rangeKey: rangeKeyName,
    rangeCondition
  };
}
function matchesKeyCondition(item, condition) {
  const itemHashValue = item[condition.hashKey];
  if (!itemHashValue || !attributeEquals(itemHashValue, condition.hashValue)) {
    return false;
  }
  if (condition.rangeCondition && condition.rangeKey) {
    const itemRangeValue = item[condition.rangeKey];
    if (!itemRangeValue) {
      return false;
    }
    return matchesRangeCondition(itemRangeValue, condition.rangeCondition);
  }
  return true;
}
function matchesRangeCondition(value, condition) {
  const cmp = compareValues2(value, condition.value);
  switch (condition.operator) {
    case "=":
      return cmp === 0;
    case "<":
      return cmp < 0;
    case "<=":
      return cmp <= 0;
    case ">":
      return cmp > 0;
    case ">=":
      return cmp >= 0;
    case "BETWEEN":
      if (!condition.value2) return false;
      return cmp >= 0 && compareValues2(value, condition.value2) <= 0;
    case "begins_with":
      if ("S" in value && "S" in condition.value) {
        return value.S.startsWith(condition.value.S);
      }
      if ("B" in value && "B" in condition.value) {
        return value.B.startsWith(condition.value.B);
      }
      return false;
    default:
      return false;
  }
}
function attributeEquals(a, b) {
  if ("S" in a && "S" in b) return a.S === b.S;
  if ("N" in a && "N" in b) return a.N === b.N;
  if ("B" in a && "B" in b) return a.B === b.B;
  return JSON.stringify(a) === JSON.stringify(b);
}
function compareValues2(a, b) {
  if ("S" in a && "S" in b) {
    return a.S.localeCompare(b.S);
  }
  if ("N" in a && "N" in b) {
    return parseFloat(a.N) - parseFloat(b.N);
  }
  if ("B" in a && "B" in b) {
    return a.B.localeCompare(b.B);
  }
  return 0;
}

// src/expressions/projection.ts
function applyProjection(item, projectionExpression, expressionAttributeNames) {
  if (!projectionExpression || projectionExpression.trim() === "") {
    return item;
  }
  const paths = projectionExpression.split(",").map((p) => p.trim());
  const result = {};
  for (const path of paths) {
    const segments = parsePath(path, expressionAttributeNames);
    const value = getValueAtPath(item, segments);
    if (value !== void 0) {
      setValueAtPath(result, segments, value);
    }
  }
  return result;
}

// src/expressions/update.ts
function parseUpdateExpression(expression) {
  const actions = [];
  let remaining = expression.trim();
  while (remaining.length > 0) {
    const setMatch = remaining.match(/^SET\s+/i);
    const removeMatch = remaining.match(/^REMOVE\s+/i);
    const addMatch = remaining.match(/^ADD\s+/i);
    const deleteMatch = remaining.match(/^DELETE\s+/i);
    if (setMatch) {
      remaining = remaining.slice(setMatch[0].length);
      const { items, rest } = parseActionList(remaining);
      for (const item of items) {
        const eqIdx = item.indexOf("=");
        if (eqIdx === -1) {
          throw new ValidationException(`Invalid SET action: ${item}`);
        }
        const path = item.slice(0, eqIdx).trim();
        const valueExpr = item.slice(eqIdx + 1).trim();
        const ifNotExistsMatch = valueExpr.match(/^if_not_exists\s*\(\s*([^,]+)\s*,\s*(.+)\s*\)$/i);
        if (ifNotExistsMatch) {
          actions.push({
            type: "SET",
            path,
            value: valueExpr,
            operation: "if_not_exists",
            operands: [ifNotExistsMatch[1].trim(), ifNotExistsMatch[2].trim()]
          });
          continue;
        }
        const listAppendMatch = valueExpr.match(/^list_append\s*\(\s*([^,]+)\s*,\s*(.+)\s*\)$/i);
        if (listAppendMatch) {
          actions.push({
            type: "SET",
            path,
            value: valueExpr,
            operation: "list_append",
            operands: [listAppendMatch[1].trim(), listAppendMatch[2].trim()]
          });
          continue;
        }
        const plusMatch = valueExpr.match(/^(.+?)\s*\+\s*(.+)$/);
        if (plusMatch) {
          actions.push({
            type: "SET",
            path,
            value: valueExpr,
            operation: "plus",
            operands: [plusMatch[1].trim(), plusMatch[2].trim()]
          });
          continue;
        }
        const minusMatch = valueExpr.match(/^(.+?)\s*-\s*(.+)$/);
        if (minusMatch) {
          actions.push({
            type: "SET",
            path,
            value: valueExpr,
            operation: "minus",
            operands: [minusMatch[1].trim(), minusMatch[2].trim()]
          });
          continue;
        }
        actions.push({ type: "SET", path, value: valueExpr });
      }
      remaining = rest;
    } else if (removeMatch) {
      remaining = remaining.slice(removeMatch[0].length);
      const { items, rest } = parseActionList(remaining);
      for (const item of items) {
        actions.push({ type: "REMOVE", path: item.trim() });
      }
      remaining = rest;
    } else if (addMatch) {
      remaining = remaining.slice(addMatch[0].length);
      const { items, rest } = parseActionList(remaining);
      for (const item of items) {
        const parts = item.trim().split(/\s+/);
        if (parts.length < 2) {
          throw new ValidationException(`Invalid ADD action: ${item}`);
        }
        actions.push({ type: "ADD", path: parts[0], value: parts.slice(1).join(" ") });
      }
      remaining = rest;
    } else if (deleteMatch) {
      remaining = remaining.slice(deleteMatch[0].length);
      const { items, rest } = parseActionList(remaining);
      for (const item of items) {
        const parts = item.trim().split(/\s+/);
        if (parts.length < 2) {
          throw new ValidationException(`Invalid DELETE action: ${item}`);
        }
        actions.push({ type: "DELETE", path: parts[0], value: parts.slice(1).join(" ") });
      }
      remaining = rest;
    } else {
      remaining = remaining.slice(1);
    }
  }
  return actions;
}
function parseActionList(expression) {
  const items = [];
  let current = "";
  let depth = 0;
  let i = 0;
  const stopKeywords = ["SET", "REMOVE", "ADD", "DELETE"];
  while (i < expression.length) {
    const char = expression[i];
    for (const keyword of stopKeywords) {
      if (expression.slice(i).toUpperCase().startsWith(keyword + " ") && depth === 0 && current.trim()) {
        items.push(current.trim());
        return { items, rest: expression.slice(i) };
      }
    }
    if (char === "(") {
      depth++;
      current += char;
    } else if (char === ")") {
      depth--;
      current += char;
    } else if (char === "," && depth === 0) {
      if (current.trim()) {
        items.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
    i++;
  }
  if (current.trim()) {
    items.push(current.trim());
  }
  return { items, rest: "" };
}
function applyUpdateExpression(item, expression, context) {
  if (!expression || expression.trim() === "") {
    return item;
  }
  const result = JSON.parse(JSON.stringify(item));
  const actions = parseUpdateExpression(expression);
  const removeActions = [];
  const otherActions = [];
  for (const action of actions) {
    if (action.type === "REMOVE") {
      removeActions.push(action);
    } else {
      otherActions.push(action);
    }
  }
  for (const action of otherActions) {
    switch (action.type) {
      case "SET":
        applySetAction(result, action, context);
        break;
      case "ADD":
        applyAddAction(result, action, context);
        break;
      case "DELETE":
        applyDeleteAction(result, action, context);
        break;
    }
  }
  removeActions.sort((a, b) => {
    const aSegments = parsePath(a.path, context.expressionAttributeNames);
    const bSegments = parsePath(b.path, context.expressionAttributeNames);
    let aLastIdx;
    let bLastIdx;
    for (const seg of aSegments) {
      if (seg.type === "index") {
        aLastIdx = seg.value;
      }
    }
    for (const seg of bSegments) {
      if (seg.type === "index") {
        bLastIdx = seg.value;
      }
    }
    if (aLastIdx !== void 0 && bLastIdx !== void 0) {
      return bLastIdx - aLastIdx;
    }
    return 0;
  });
  for (const action of removeActions) {
    applyRemoveAction(result, action, context);
  }
  return result;
}
function resolveOperand(item, operand, context) {
  operand = operand.trim();
  if (operand.startsWith(":")) {
    return context.expressionAttributeValues?.[operand];
  }
  const segments = parsePath(operand, context.expressionAttributeNames);
  return getValueAtPath(item, segments);
}
function applySetAction(item, action, context) {
  const segments = parsePath(action.path, context.expressionAttributeNames);
  let value;
  if (action.operation === "if_not_exists") {
    const existingValue = resolveOperand(item, action.operands[0], context);
    if (existingValue !== void 0) {
      value = existingValue;
    } else {
      value = resolveOperand(item, action.operands[1], context);
    }
  } else if (action.operation === "list_append") {
    const list1 = resolveOperand(item, action.operands[0], context);
    const list2 = resolveOperand(item, action.operands[1], context);
    if (list1 && "L" in list1 && list2 && "L" in list2) {
      value = { L: [...list1.L, ...list2.L] };
    } else if (list1 && "L" in list1) {
      value = list1;
    } else if (list2 && "L" in list2) {
      value = list2;
    }
  } else if (action.operation === "plus") {
    const left = resolveOperand(item, action.operands[0], context);
    const right = resolveOperand(item, action.operands[1], context);
    if (left && "N" in left && right && "N" in right) {
      const result = parseFloat(left.N) + parseFloat(right.N);
      value = { N: String(result) };
    }
  } else if (action.operation === "minus") {
    const left = resolveOperand(item, action.operands[0], context);
    const right = resolveOperand(item, action.operands[1], context);
    if (left && "N" in left && right && "N" in right) {
      const result = parseFloat(left.N) - parseFloat(right.N);
      value = { N: String(result) };
    }
  } else {
    value = resolveOperand(item, action.value, context);
  }
  if (value !== void 0) {
    setValueAtPath(item, segments, value);
  }
}
function applyRemoveAction(item, action, context) {
  const segments = parsePath(action.path, context.expressionAttributeNames);
  deleteValueAtPath(item, segments);
}
function applyAddAction(item, action, context) {
  const segments = parsePath(action.path, context.expressionAttributeNames);
  const addValue = resolveOperand(item, action.value, context);
  const existingValue = getValueAtPath(item, segments);
  if (!addValue) {
    return;
  }
  if ("N" in addValue) {
    if (existingValue && "N" in existingValue) {
      const result = parseFloat(existingValue.N) + parseFloat(addValue.N);
      setValueAtPath(item, segments, { N: String(result) });
    } else if (!existingValue) {
      setValueAtPath(item, segments, addValue);
    }
  } else if ("SS" in addValue) {
    if (existingValue && "SS" in existingValue) {
      const combined = /* @__PURE__ */ new Set([...existingValue.SS, ...addValue.SS]);
      setValueAtPath(item, segments, { SS: Array.from(combined) });
    } else if (!existingValue) {
      setValueAtPath(item, segments, addValue);
    }
  } else if ("NS" in addValue) {
    if (existingValue && "NS" in existingValue) {
      const combined = /* @__PURE__ */ new Set([...existingValue.NS, ...addValue.NS]);
      setValueAtPath(item, segments, { NS: Array.from(combined) });
    } else if (!existingValue) {
      setValueAtPath(item, segments, addValue);
    }
  } else if ("BS" in addValue) {
    if (existingValue && "BS" in existingValue) {
      const combined = /* @__PURE__ */ new Set([...existingValue.BS, ...addValue.BS]);
      setValueAtPath(item, segments, { BS: Array.from(combined) });
    } else if (!existingValue) {
      setValueAtPath(item, segments, addValue);
    }
  }
}
function applyDeleteAction(item, action, context) {
  const segments = parsePath(action.path, context.expressionAttributeNames);
  const deleteValue = resolveOperand(item, action.value, context);
  const existingValue = getValueAtPath(item, segments);
  if (!deleteValue || !existingValue) {
    return;
  }
  if ("SS" in deleteValue && "SS" in existingValue) {
    const toDelete = new Set(deleteValue.SS);
    const remaining = existingValue.SS.filter((s) => !toDelete.has(s));
    if (remaining.length > 0) {
      setValueAtPath(item, segments, { SS: remaining });
    } else {
      deleteValueAtPath(item, segments);
    }
  } else if ("NS" in deleteValue && "NS" in existingValue) {
    const toDelete = new Set(deleteValue.NS);
    const remaining = existingValue.NS.filter((n) => !toDelete.has(n));
    if (remaining.length > 0) {
      setValueAtPath(item, segments, { NS: remaining });
    } else {
      deleteValueAtPath(item, segments);
    }
  } else if ("BS" in deleteValue && "BS" in existingValue) {
    const toDelete = new Set(deleteValue.BS);
    const remaining = existingValue.BS.filter((b) => !toDelete.has(b));
    if (remaining.length > 0) {
      setValueAtPath(item, segments, { BS: remaining });
    } else {
      deleteValueAtPath(item, segments);
    }
  }
}

// src/operations/put-item.ts
function putItem(store, input) {
  if (!input.TableName) {
    throw new ValidationException("TableName is required");
  }
  if (!input.Item) {
    throw new ValidationException("Item is required");
  }
  const table = store.getTable(input.TableName);
  const hashKey = table.getHashKeyName();
  if (!input.Item[hashKey]) {
    throw new ValidationException(`Missing the key ${hashKey} in the item`);
  }
  const rangeKey = table.getRangeKeyName();
  if (rangeKey && !input.Item[rangeKey]) {
    throw new ValidationException(`Missing the key ${rangeKey} in the item`);
  }
  const existingItem = table.getItem(input.Item);
  if (input.ConditionExpression) {
    const conditionMet = evaluateCondition(input.ConditionExpression, existingItem || {}, {
      expressionAttributeNames: input.ExpressionAttributeNames,
      expressionAttributeValues: input.ExpressionAttributeValues
    });
    if (!conditionMet) {
      if (input.ReturnValuesOnConditionCheckFailure === "ALL_OLD" && existingItem) {
        throw new ConditionalCheckFailedException("The conditional request failed", existingItem);
      }
      throw new ConditionalCheckFailedException("The conditional request failed");
    }
  }
  const oldItem = table.putItem(input.Item);
  const output = {};
  if (input.ReturnValues === "ALL_OLD" && oldItem) {
    output.Attributes = oldItem;
  }
  if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== "NONE") {
    output.ConsumedCapacity = {
      TableName: input.TableName,
      CapacityUnits: 1,
      WriteCapacityUnits: 1
    };
  }
  return output;
}

// src/operations/get-item.ts
function getItem(store, input) {
  if (!input.TableName) {
    throw new ValidationException("TableName is required");
  }
  if (!input.Key) {
    throw new ValidationException("Key is required");
  }
  const table = store.getTable(input.TableName);
  const hashKey = table.getHashKeyName();
  if (!input.Key[hashKey]) {
    throw new ValidationException(`Missing the key ${hashKey} in the key`);
  }
  const rangeKey = table.getRangeKeyName();
  if (rangeKey && !input.Key[rangeKey]) {
    throw new ValidationException(`Missing the key ${rangeKey} in the key`);
  }
  let item = table.getItem(input.Key);
  if (item && input.ProjectionExpression) {
    item = applyProjection(item, input.ProjectionExpression, input.ExpressionAttributeNames);
  }
  const output = {};
  if (item) {
    output.Item = item;
  }
  if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== "NONE") {
    output.ConsumedCapacity = {
      TableName: input.TableName,
      CapacityUnits: 0.5,
      ReadCapacityUnits: 0.5
    };
  }
  return output;
}

// src/operations/delete-item.ts
function deleteItem(store, input) {
  if (!input.TableName) {
    throw new ValidationException("TableName is required");
  }
  if (!input.Key) {
    throw new ValidationException("Key is required");
  }
  const table = store.getTable(input.TableName);
  const hashKey = table.getHashKeyName();
  if (!input.Key[hashKey]) {
    throw new ValidationException(`Missing the key ${hashKey} in the key`);
  }
  const rangeKey = table.getRangeKeyName();
  if (rangeKey && !input.Key[rangeKey]) {
    throw new ValidationException(`Missing the key ${rangeKey} in the key`);
  }
  const existingItem = table.getItem(input.Key);
  if (input.ConditionExpression) {
    const conditionMet = evaluateCondition(input.ConditionExpression, existingItem || {}, {
      expressionAttributeNames: input.ExpressionAttributeNames,
      expressionAttributeValues: input.ExpressionAttributeValues
    });
    if (!conditionMet) {
      if (input.ReturnValuesOnConditionCheckFailure === "ALL_OLD" && existingItem) {
        throw new ConditionalCheckFailedException("The conditional request failed", existingItem);
      }
      throw new ConditionalCheckFailedException("The conditional request failed");
    }
  }
  const oldItem = table.deleteItem(input.Key);
  const output = {};
  if (input.ReturnValues === "ALL_OLD" && oldItem) {
    output.Attributes = oldItem;
  }
  if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== "NONE") {
    output.ConsumedCapacity = {
      TableName: input.TableName,
      CapacityUnits: 1,
      WriteCapacityUnits: 1
    };
  }
  return output;
}

// src/operations/update-item.ts
function updateItem(store, input) {
  if (!input.TableName) {
    throw new ValidationException("TableName is required");
  }
  if (!input.Key) {
    throw new ValidationException("Key is required");
  }
  const table = store.getTable(input.TableName);
  const hashKey = table.getHashKeyName();
  if (!input.Key[hashKey]) {
    throw new ValidationException(`Missing the key ${hashKey} in the key`);
  }
  const rangeKey = table.getRangeKeyName();
  if (rangeKey && !input.Key[rangeKey]) {
    throw new ValidationException(`Missing the key ${rangeKey} in the key`);
  }
  const existingItem = table.getItem(input.Key);
  if (input.ConditionExpression) {
    const conditionMet = evaluateCondition(input.ConditionExpression, existingItem || {}, {
      expressionAttributeNames: input.ExpressionAttributeNames,
      expressionAttributeValues: input.ExpressionAttributeValues
    });
    if (!conditionMet) {
      if (input.ReturnValuesOnConditionCheckFailure === "ALL_OLD" && existingItem) {
        throw new ConditionalCheckFailedException("The conditional request failed", existingItem);
      }
      throw new ConditionalCheckFailedException("The conditional request failed");
    }
  }
  let item = existingItem ? { ...existingItem } : { ...input.Key };
  if (input.UpdateExpression) {
    item = applyUpdateExpression(item, input.UpdateExpression, {
      expressionAttributeNames: input.ExpressionAttributeNames,
      expressionAttributeValues: input.ExpressionAttributeValues
    });
  }
  for (const [key, value] of Object.entries(input.Key)) {
    item[key] = value;
  }
  table.updateItem(input.Key, item);
  const output = {};
  switch (input.ReturnValues) {
    case "ALL_OLD":
      if (existingItem) {
        output.Attributes = existingItem;
      }
      break;
    case "ALL_NEW":
      output.Attributes = item;
      break;
    case "UPDATED_OLD":
      if (existingItem && input.UpdateExpression) {
        output.Attributes = getUpdatedAttributes(existingItem, item);
      }
      break;
    case "UPDATED_NEW":
      if (input.UpdateExpression) {
        output.Attributes = getUpdatedAttributes(existingItem || {}, item);
      }
      break;
  }
  if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== "NONE") {
    output.ConsumedCapacity = {
      TableName: input.TableName,
      CapacityUnits: 1,
      WriteCapacityUnits: 1
    };
  }
  return output;
}
function getUpdatedAttributes(oldItem, newItem) {
  const updated = {};
  for (const [key, newValue] of Object.entries(newItem)) {
    const oldValue = oldItem[key];
    if (!oldValue || JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      updated[key] = newValue;
    }
  }
  return updated;
}

// src/operations/query.ts
function query(store, input) {
  if (!input.TableName) {
    throw new ValidationException("TableName is required");
  }
  if (!input.KeyConditionExpression) {
    throw new ValidationException("KeyConditionExpression is required");
  }
  const table = store.getTable(input.TableName);
  let keySchema = table.keySchema;
  if (input.IndexName) {
    const indexKeySchema = table.getIndexKeySchema(input.IndexName);
    if (!indexKeySchema) {
      throw new ResourceNotFoundException(`Index ${input.IndexName} not found`);
    }
    keySchema = indexKeySchema;
  }
  const keyCondition = parseKeyCondition(input.KeyConditionExpression, keySchema, {
    expressionAttributeNames: input.ExpressionAttributeNames,
    expressionAttributeValues: input.ExpressionAttributeValues
  });
  let items;
  let lastEvaluatedKey;
  if (input.IndexName) {
    const result = table.queryIndex(
      input.IndexName,
      { [keyCondition.hashKey]: keyCondition.hashValue },
      {
        scanIndexForward: input.ScanIndexForward,
        exclusiveStartKey: input.ExclusiveStartKey
      }
    );
    items = result.items;
    lastEvaluatedKey = result.lastEvaluatedKey;
  } else {
    const result = table.queryByHashKey(
      { [keyCondition.hashKey]: keyCondition.hashValue },
      {
        scanIndexForward: input.ScanIndexForward,
        exclusiveStartKey: input.ExclusiveStartKey
      }
    );
    items = result.items;
    lastEvaluatedKey = result.lastEvaluatedKey;
  }
  if (keyCondition.rangeCondition) {
    items = items.filter((item) => matchesKeyCondition(item, keyCondition));
  }
  const scannedCount = items.length;
  if (input.FilterExpression) {
    items = items.filter(
      (item) => evaluateCondition(input.FilterExpression, item, {
        expressionAttributeNames: input.ExpressionAttributeNames,
        expressionAttributeValues: input.ExpressionAttributeValues
      })
    );
  }
  if (input.Limit && items.length > input.Limit) {
    items = items.slice(0, input.Limit);
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      lastEvaluatedKey = {};
      const hashKey = table.getHashKeyName();
      const rangeKey = table.getRangeKeyName();
      if (lastItem[hashKey]) {
        lastEvaluatedKey[hashKey] = lastItem[hashKey];
      }
      if (rangeKey && lastItem[rangeKey]) {
        lastEvaluatedKey[rangeKey] = lastItem[rangeKey];
      }
      if (input.IndexName) {
        const indexKeySchema = table.getIndexKeySchema(input.IndexName);
        if (indexKeySchema) {
          for (const key of indexKeySchema) {
            const attrValue = lastItem[key.AttributeName];
            if (attrValue) {
              lastEvaluatedKey[key.AttributeName] = attrValue;
            }
          }
        }
      }
    }
  }
  if (input.ProjectionExpression) {
    items = items.map((item) => applyProjection(item, input.ProjectionExpression, input.ExpressionAttributeNames));
  }
  const output = {
    Count: items.length,
    ScannedCount: scannedCount
  };
  if (input.Select !== "COUNT") {
    output.Items = items;
  }
  if (lastEvaluatedKey && Object.keys(lastEvaluatedKey).length > 0) {
    output.LastEvaluatedKey = lastEvaluatedKey;
  }
  if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== "NONE") {
    output.ConsumedCapacity = {
      TableName: input.TableName,
      CapacityUnits: Math.max(0.5, scannedCount * 0.5),
      ReadCapacityUnits: Math.max(0.5, scannedCount * 0.5)
    };
  }
  return output;
}

// src/operations/scan.ts
function scan(store, input) {
  if (!input.TableName) {
    throw new ValidationException("TableName is required");
  }
  const table = store.getTable(input.TableName);
  let items;
  let lastEvaluatedKey;
  if (input.IndexName) {
    if (!table.hasIndex(input.IndexName)) {
      throw new ResourceNotFoundException(`Index ${input.IndexName} not found`);
    }
    const result = table.scanIndex(input.IndexName, void 0, input.ExclusiveStartKey);
    items = result.items;
    lastEvaluatedKey = result.lastEvaluatedKey;
  } else {
    const result = table.scan(void 0, input.ExclusiveStartKey);
    items = result.items;
    lastEvaluatedKey = result.lastEvaluatedKey;
  }
  if (input.TotalSegments !== void 0 && input.Segment !== void 0) {
    const segmentSize = Math.ceil(items.length / input.TotalSegments);
    const start = input.Segment * segmentSize;
    const end = start + segmentSize;
    items = items.slice(start, end);
  }
  const scannedCount = items.length;
  if (input.FilterExpression) {
    items = items.filter(
      (item) => evaluateCondition(input.FilterExpression, item, {
        expressionAttributeNames: input.ExpressionAttributeNames,
        expressionAttributeValues: input.ExpressionAttributeValues
      })
    );
  }
  if (input.Limit && items.length > input.Limit) {
    items = items.slice(0, input.Limit);
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      lastEvaluatedKey = {};
      const hashKey = table.getHashKeyName();
      const rangeKey = table.getRangeKeyName();
      if (lastItem[hashKey]) {
        lastEvaluatedKey[hashKey] = lastItem[hashKey];
      }
      if (rangeKey && lastItem[rangeKey]) {
        lastEvaluatedKey[rangeKey] = lastItem[rangeKey];
      }
      if (input.IndexName) {
        const indexKeySchema = table.getIndexKeySchema(input.IndexName);
        if (indexKeySchema) {
          for (const key of indexKeySchema) {
            const attrValue = lastItem[key.AttributeName];
            if (attrValue) {
              lastEvaluatedKey[key.AttributeName] = attrValue;
            }
          }
        }
      }
    }
  }
  if (input.ProjectionExpression) {
    items = items.map((item) => applyProjection(item, input.ProjectionExpression, input.ExpressionAttributeNames));
  }
  const output = {
    Count: items.length,
    ScannedCount: scannedCount
  };
  if (input.Select !== "COUNT") {
    output.Items = items;
  }
  if (lastEvaluatedKey && Object.keys(lastEvaluatedKey).length > 0) {
    output.LastEvaluatedKey = lastEvaluatedKey;
  }
  if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== "NONE") {
    output.ConsumedCapacity = {
      TableName: input.TableName,
      CapacityUnits: Math.max(0.5, scannedCount * 0.5),
      ReadCapacityUnits: Math.max(0.5, scannedCount * 0.5)
    };
  }
  return output;
}

// src/operations/batch-get-item.ts
var MAX_BATCH_GET_ITEMS = 100;
function batchGetItem(store, input) {
  if (!input.RequestItems) {
    throw new ValidationException("RequestItems is required");
  }
  let totalKeys = 0;
  for (const tableRequest of Object.values(input.RequestItems)) {
    totalKeys += tableRequest.Keys.length;
  }
  if (totalKeys > MAX_BATCH_GET_ITEMS) {
    throw new ValidationException(`Too many items requested for the BatchGetItem call. Max is ${MAX_BATCH_GET_ITEMS}`);
  }
  const responses = {};
  const consumedCapacity = [];
  for (const [tableName, tableRequest] of Object.entries(input.RequestItems)) {
    const table = store.getTable(tableName);
    const items = [];
    let capacityUnits = 0;
    for (const key of tableRequest.Keys) {
      let item = table.getItem(key);
      if (item) {
        if (tableRequest.ProjectionExpression) {
          item = applyProjection(item, tableRequest.ProjectionExpression, tableRequest.ExpressionAttributeNames);
        }
        items.push(item);
        capacityUnits += 0.5;
      }
    }
    if (items.length > 0) {
      responses[tableName] = items;
    }
    if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== "NONE") {
      consumedCapacity.push({
        TableName: tableName,
        CapacityUnits: capacityUnits,
        ReadCapacityUnits: capacityUnits
      });
    }
  }
  const output = {};
  if (Object.keys(responses).length > 0) {
    output.Responses = responses;
  }
  if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== "NONE") {
    output.ConsumedCapacity = consumedCapacity;
  }
  return output;
}

// src/operations/batch-write-item.ts
var MAX_BATCH_WRITE_ITEMS = 25;
function batchWriteItem(store, input) {
  if (!input.RequestItems) {
    throw new ValidationException("RequestItems is required");
  }
  let totalItems = 0;
  for (const tableRequests of Object.values(input.RequestItems)) {
    totalItems += tableRequests.length;
  }
  if (totalItems > MAX_BATCH_WRITE_ITEMS) {
    throw new ValidationException(`Too many items requested for the BatchWriteItem call. Max is ${MAX_BATCH_WRITE_ITEMS}`);
  }
  const consumedCapacity = [];
  for (const [tableName, requests] of Object.entries(input.RequestItems)) {
    const table = store.getTable(tableName);
    let capacityUnits = 0;
    for (const request of requests) {
      if ("PutRequest" in request) {
        const item = request.PutRequest.Item;
        const hashKey = table.getHashKeyName();
        if (!item[hashKey]) {
          throw new ValidationException(`Missing the key ${hashKey} in the item`);
        }
        const rangeKey = table.getRangeKeyName();
        if (rangeKey && !item[rangeKey]) {
          throw new ValidationException(`Missing the key ${rangeKey} in the item`);
        }
        table.putItem(item);
        capacityUnits += 1;
      } else if ("DeleteRequest" in request) {
        const key = request.DeleteRequest.Key;
        const hashKey = table.getHashKeyName();
        if (!key[hashKey]) {
          throw new ValidationException(`Missing the key ${hashKey} in the key`);
        }
        const rangeKey = table.getRangeKeyName();
        if (rangeKey && !key[rangeKey]) {
          throw new ValidationException(`Missing the key ${rangeKey} in the key`);
        }
        table.deleteItem(key);
        capacityUnits += 1;
      }
    }
    if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== "NONE") {
      consumedCapacity.push({
        TableName: tableName,
        CapacityUnits: capacityUnits,
        WriteCapacityUnits: capacityUnits
      });
    }
  }
  const output = {};
  if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== "NONE") {
    output.ConsumedCapacity = consumedCapacity;
  }
  return output;
}

// src/operations/transact-get-items.ts
var MAX_TRANSACT_ITEMS = 100;
function transactGetItems(store, input) {
  if (!input.TransactItems) {
    throw new ValidationException("TransactItems is required");
  }
  if (input.TransactItems.length > MAX_TRANSACT_ITEMS) {
    throw new ValidationException(`Too many items in the TransactGetItems call. Max is ${MAX_TRANSACT_ITEMS}`);
  }
  const responses = [];
  const consumedCapacity = /* @__PURE__ */ new Map();
  for (const transactItem of input.TransactItems) {
    const { Get: getRequest } = transactItem;
    if (!getRequest.TableName) {
      throw new ValidationException("TableName is required in Get request");
    }
    if (!getRequest.Key) {
      throw new ValidationException("Key is required in Get request");
    }
    const table = store.getTable(getRequest.TableName);
    let item = table.getItem(getRequest.Key);
    if (item && getRequest.ProjectionExpression) {
      item = applyProjection(item, getRequest.ProjectionExpression, getRequest.ExpressionAttributeNames);
    }
    responses.push({ Item: item });
    const current = consumedCapacity.get(getRequest.TableName) || 0;
    consumedCapacity.set(getRequest.TableName, current + 2);
  }
  const output = {
    Responses: responses
  };
  if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== "NONE") {
    output.ConsumedCapacity = Array.from(consumedCapacity.entries()).map(([tableName, units]) => ({
      TableName: tableName,
      CapacityUnits: units,
      ReadCapacityUnits: units
    }));
  }
  return output;
}

// src/operations/transact-write-items.ts
var MAX_TRANSACT_ITEMS2 = 100;
var idempotencyTokens = /* @__PURE__ */ new Map();
var IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1e3;
function transactWriteItems(store, input) {
  if (!input.TransactItems) {
    throw new ValidationException("TransactItems is required");
  }
  if (input.TransactItems.length > MAX_TRANSACT_ITEMS2) {
    throw new ValidationException(`Too many items in the TransactWriteItems call. Max is ${MAX_TRANSACT_ITEMS2}`);
  }
  if (input.ClientRequestToken) {
    const cached = idempotencyTokens.get(input.ClientRequestToken);
    if (cached) {
      if (Date.now() - cached.timestamp < IDEMPOTENCY_WINDOW_MS) {
        return cached.result;
      }
      idempotencyTokens.delete(input.ClientRequestToken);
    }
  }
  const itemKeys = /* @__PURE__ */ new Set();
  for (const transactItem of input.TransactItems) {
    let tableName;
    let key;
    if ("ConditionCheck" in transactItem) {
      tableName = transactItem.ConditionCheck.TableName;
      key = transactItem.ConditionCheck.Key;
    } else if ("Put" in transactItem) {
      tableName = transactItem.Put.TableName;
      const table2 = store.getTable(tableName);
      key = extractKey(transactItem.Put.Item, table2.keySchema);
    } else if ("Delete" in transactItem) {
      tableName = transactItem.Delete.TableName;
      key = transactItem.Delete.Key;
    } else if ("Update" in transactItem) {
      tableName = transactItem.Update.TableName;
      key = transactItem.Update.Key;
    } else {
      throw new ValidationException("Invalid transaction item");
    }
    const table = store.getTable(tableName);
    const keyString = `${tableName}#${serializeKey(key, table.keySchema)}`;
    if (itemKeys.has(keyString)) {
      throw new ValidationException("Transaction request cannot include multiple operations on one item");
    }
    itemKeys.add(keyString);
  }
  const cancellationReasons = [];
  let hasCancellation = false;
  for (const transactItem of input.TransactItems) {
    const reason = validateTransactionItem(store, transactItem);
    cancellationReasons.push(reason);
    if (reason.Code !== "None") {
      hasCancellation = true;
    }
  }
  if (hasCancellation) {
    throw new TransactionCanceledException("Transaction cancelled, please refer cancance reasons for specific reasons", cancellationReasons);
  }
  const consumedCapacity = /* @__PURE__ */ new Map();
  for (const transactItem of input.TransactItems) {
    executeTransactionItem(store, transactItem, consumedCapacity);
  }
  const output = {};
  if (input.ReturnConsumedCapacity && input.ReturnConsumedCapacity !== "NONE") {
    output.ConsumedCapacity = Array.from(consumedCapacity.entries()).map(([tableName, units]) => ({
      TableName: tableName,
      CapacityUnits: units,
      WriteCapacityUnits: units
    }));
  }
  if (input.ClientRequestToken) {
    idempotencyTokens.set(input.ClientRequestToken, {
      timestamp: Date.now(),
      result: output
    });
  }
  return output;
}
function validateTransactionItem(store, transactItem) {
  try {
    if ("ConditionCheck" in transactItem) {
      const { ConditionCheck: check } = transactItem;
      const table = store.getTable(check.TableName);
      const existingItem = table.getItem(check.Key);
      const conditionMet = evaluateCondition(check.ConditionExpression, existingItem || {}, {
        expressionAttributeNames: check.ExpressionAttributeNames,
        expressionAttributeValues: check.ExpressionAttributeValues
      });
      if (!conditionMet) {
        return {
          Code: "ConditionalCheckFailed",
          Message: "The conditional request failed",
          Item: check.ReturnValuesOnConditionCheckFailure === "ALL_OLD" ? existingItem : void 0
        };
      }
    } else if ("Put" in transactItem) {
      const { Put: put } = transactItem;
      if (put.ConditionExpression) {
        const table = store.getTable(put.TableName);
        const key = extractKey(put.Item, table.keySchema);
        const existingItem = table.getItem(key);
        const conditionMet = evaluateCondition(put.ConditionExpression, existingItem || {}, {
          expressionAttributeNames: put.ExpressionAttributeNames,
          expressionAttributeValues: put.ExpressionAttributeValues
        });
        if (!conditionMet) {
          return {
            Code: "ConditionalCheckFailed",
            Message: "The conditional request failed",
            Item: put.ReturnValuesOnConditionCheckFailure === "ALL_OLD" ? existingItem : void 0
          };
        }
      }
    } else if ("Delete" in transactItem) {
      const { Delete: del } = transactItem;
      if (del.ConditionExpression) {
        const table = store.getTable(del.TableName);
        const existingItem = table.getItem(del.Key);
        const conditionMet = evaluateCondition(del.ConditionExpression, existingItem || {}, {
          expressionAttributeNames: del.ExpressionAttributeNames,
          expressionAttributeValues: del.ExpressionAttributeValues
        });
        if (!conditionMet) {
          return {
            Code: "ConditionalCheckFailed",
            Message: "The conditional request failed",
            Item: del.ReturnValuesOnConditionCheckFailure === "ALL_OLD" ? existingItem : void 0
          };
        }
      }
    } else if ("Update" in transactItem) {
      const { Update: update } = transactItem;
      if (update.ConditionExpression) {
        const table = store.getTable(update.TableName);
        const existingItem = table.getItem(update.Key);
        const conditionMet = evaluateCondition(update.ConditionExpression, existingItem || {}, {
          expressionAttributeNames: update.ExpressionAttributeNames,
          expressionAttributeValues: update.ExpressionAttributeValues
        });
        if (!conditionMet) {
          return {
            Code: "ConditionalCheckFailed",
            Message: "The conditional request failed",
            Item: update.ReturnValuesOnConditionCheckFailure === "ALL_OLD" ? existingItem : void 0
          };
        }
      }
    }
    return { Code: "None", Message: null };
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return {
        Code: "ConditionalCheckFailed",
        Message: error.message,
        Item: error.Item
      };
    }
    return {
      Code: "ValidationError",
      Message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
function executeTransactionItem(store, transactItem, consumedCapacity) {
  if ("ConditionCheck" in transactItem) {
    const tableName = transactItem.ConditionCheck.TableName;
    const current = consumedCapacity.get(tableName) || 0;
    consumedCapacity.set(tableName, current + 2);
    return;
  }
  if ("Put" in transactItem) {
    const { Put: put } = transactItem;
    const table = store.getTable(put.TableName);
    table.putItem(put.Item);
    const current = consumedCapacity.get(put.TableName) || 0;
    consumedCapacity.set(put.TableName, current + 2);
    return;
  }
  if ("Delete" in transactItem) {
    const { Delete: del } = transactItem;
    const table = store.getTable(del.TableName);
    table.deleteItem(del.Key);
    const current = consumedCapacity.get(del.TableName) || 0;
    consumedCapacity.set(del.TableName, current + 2);
    return;
  }
  if ("Update" in transactItem) {
    const { Update: update } = transactItem;
    const table = store.getTable(update.TableName);
    const existingItem = table.getItem(update.Key);
    let item = existingItem ? { ...existingItem } : { ...update.Key };
    item = applyUpdateExpression(item, update.UpdateExpression, {
      expressionAttributeNames: update.ExpressionAttributeNames,
      expressionAttributeValues: update.ExpressionAttributeValues
    });
    for (const [key, value] of Object.entries(update.Key)) {
      item[key] = value;
    }
    table.updateItem(update.Key, item);
    const current = consumedCapacity.get(update.TableName) || 0;
    consumedCapacity.set(update.TableName, current + 2);
  }
}

// src/server.ts
var operations = {
  CreateTable: createTable,
  DeleteTable: deleteTable,
  DescribeTable: describeTable,
  ListTables: listTables,
  PutItem: putItem,
  GetItem: getItem,
  DeleteItem: deleteItem,
  UpdateItem: updateItem,
  Query: query,
  Scan: scan,
  BatchGetItem: batchGetItem,
  BatchWriteItem: batchWriteItem,
  TransactGetItems: transactGetItems,
  TransactWriteItems: transactWriteItems
};
function parseTarget(target) {
  if (!target) return null;
  const match = target.match(/^DynamoDB_\d+\.(\w+)$/);
  return match ? match[1] ?? null : null;
}
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
function formatError(error) {
  if (error instanceof DynamoDBError) {
    return {
      body: JSON.stringify(error.toJSON()),
      status: error.statusCode
    };
  }
  return {
    body: JSON.stringify({
      __type: "com.amazonaws.dynamodb.v20120810#InternalServerError",
      message: error instanceof Error ? error.message : "Internal server error"
    }),
    status: 500
  };
}
async function handleRequest(store, method, target, getBody) {
  const requestId = generateUUID();
  if (method !== "POST") {
    return {
      body: JSON.stringify({ message: "Method not allowed" }),
      status: 405,
      requestId
    };
  }
  const operation = parseTarget(target);
  if (!operation) {
    return {
      body: JSON.stringify({
        __type: "com.amazon.coral.service#UnknownOperationException",
        message: "Unknown operation"
      }),
      status: 400,
      requestId
    };
  }
  const handler = operations[operation];
  if (!handler) {
    return {
      body: JSON.stringify({
        __type: "com.amazon.coral.service#UnknownOperationException",
        message: `Unknown operation: ${operation}`
      }),
      status: 400,
      requestId
    };
  }
  let body;
  try {
    const text = await getBody();
    body = text ? JSON.parse(text) : {};
  } catch {
    const err = formatError(new SerializationException("Could not parse request body"));
    return { ...err, requestId };
  }
  try {
    const result = handler(store, body);
    return {
      body: JSON.stringify(result),
      status: 200,
      requestId
    };
  } catch (error) {
    const err = formatError(error);
    return { ...err, requestId };
  }
}
var isBun = typeof globalThis.Bun !== "undefined";
function createBunServer(store, port) {
  const server = Bun.serve({
    port,
    async fetch(req) {
      const result = await handleRequest(store, req.method, req.headers.get("X-Amz-Target"), () => req.text());
      return new Response(result.body, {
        status: result.status,
        headers: {
          "Content-Type": "application/x-amz-json-1.0",
          "x-amzn-RequestId": result.requestId
        }
      });
    }
  });
  return {
    port: server.port ?? port,
    stop: () => server.stop()
  };
}
function createNodeServer(store, port) {
  return new Promise((resolve, reject) => {
    const server = createHttpServer(async (req, res) => {
      const getBody = () => {
        return new Promise((resolve2, reject2) => {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk.toString();
          });
          req.on("end", () => resolve2(body));
          req.on("error", reject2);
        });
      };
      const result = await handleRequest(
        store,
        req.method ?? "GET",
        req.headers["x-amz-target"],
        getBody
      );
      res.writeHead(result.status, {
        "Content-Type": "application/x-amz-json-1.0",
        "x-amzn-RequestId": result.requestId
      });
      res.end(result.body);
    });
    server.on("error", reject);
    server.listen(port, () => {
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      resolve({
        port: actualPort,
        stop: () => server.close()
      });
    });
  });
}
function createServer(store, port) {
  if (isBun) {
    return createBunServer(store, port);
  }
  return createNodeServer(store, port);
}

// src/store/table.ts
var sequenceCounter = 0;
function generateSequenceNumber() {
  return String(++sequenceCounter).padStart(21, "0");
}
function generateEventId() {
  return crypto.randomUUID().replace(/-/g, "");
}
var Table = class {
  name;
  keySchema;
  attributeDefinitions;
  provisionedThroughput;
  billingMode;
  createdAt;
  tableId;
  streamSpecification;
  latestStreamArn;
  latestStreamLabel;
  ttlSpecification;
  items = /* @__PURE__ */ new Map();
  globalSecondaryIndexes = /* @__PURE__ */ new Map();
  localSecondaryIndexes = /* @__PURE__ */ new Map();
  streamCallbacks = /* @__PURE__ */ new Set();
  region;
  constructor(options, region = "us-east-1") {
    this.name = options.tableName;
    this.keySchema = options.keySchema;
    this.attributeDefinitions = options.attributeDefinitions;
    this.provisionedThroughput = options.provisionedThroughput;
    this.billingMode = options.billingMode ?? (options.provisionedThroughput ? "PROVISIONED" : "PAY_PER_REQUEST");
    this.createdAt = Date.now();
    this.tableId = crypto.randomUUID();
    this.region = region;
    this.streamSpecification = options.streamSpecification;
    this.ttlSpecification = options.timeToLiveSpecification;
    if (options.streamSpecification?.StreamEnabled) {
      this.latestStreamLabel = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      this.latestStreamArn = `arn:aws:dynamodb:${region}:000000000000:table/${this.name}/stream/${this.latestStreamLabel}`;
    }
    if (options.globalSecondaryIndexes) {
      for (const gsi of options.globalSecondaryIndexes) {
        this.globalSecondaryIndexes.set(gsi.IndexName, {
          keySchema: gsi.KeySchema,
          projection: gsi.Projection,
          provisionedThroughput: gsi.ProvisionedThroughput,
          items: /* @__PURE__ */ new Map()
        });
      }
    }
    if (options.localSecondaryIndexes) {
      for (const lsi of options.localSecondaryIndexes) {
        this.localSecondaryIndexes.set(lsi.IndexName, {
          keySchema: lsi.KeySchema,
          projection: lsi.Projection,
          items: /* @__PURE__ */ new Map()
        });
      }
    }
  }
  getHashKeyName() {
    return getHashKey(this.keySchema);
  }
  getRangeKeyName() {
    return getRangeKey(this.keySchema);
  }
  getTtlAttributeName() {
    if (this.ttlSpecification?.Enabled) {
      return this.ttlSpecification.AttributeName;
    }
    return void 0;
  }
  setTtlSpecification(spec) {
    this.ttlSpecification = spec;
  }
  getTtlSpecification() {
    return this.ttlSpecification;
  }
  describe() {
    const desc = {
      TableName: this.name,
      TableStatus: "ACTIVE",
      CreationDateTime: this.createdAt / 1e3,
      TableArn: `arn:aws:dynamodb:${this.region}:000000000000:table/${this.name}`,
      TableId: this.tableId,
      KeySchema: this.keySchema,
      AttributeDefinitions: this.attributeDefinitions,
      ItemCount: this.items.size,
      TableSizeBytes: this.estimateTableSize()
    };
    if (this.billingMode === "PROVISIONED" && this.provisionedThroughput) {
      desc.ProvisionedThroughput = {
        ReadCapacityUnits: this.provisionedThroughput.ReadCapacityUnits,
        WriteCapacityUnits: this.provisionedThroughput.WriteCapacityUnits,
        NumberOfDecreasesToday: 0
      };
    } else {
      desc.BillingModeSummary = {
        BillingMode: "PAY_PER_REQUEST"
      };
    }
    if (this.globalSecondaryIndexes.size > 0) {
      desc.GlobalSecondaryIndexes = this.describeGlobalSecondaryIndexes();
    }
    if (this.localSecondaryIndexes.size > 0) {
      desc.LocalSecondaryIndexes = this.describeLocalSecondaryIndexes();
    }
    if (this.streamSpecification) {
      desc.StreamSpecification = this.streamSpecification;
      if (this.latestStreamArn) {
        desc.LatestStreamArn = this.latestStreamArn;
        desc.LatestStreamLabel = this.latestStreamLabel;
      }
    }
    return desc;
  }
  describeGlobalSecondaryIndexes() {
    const indexes = [];
    for (const [name, data] of this.globalSecondaryIndexes) {
      let itemCount = 0;
      for (const keys of data.items.values()) {
        itemCount += keys.size;
      }
      indexes.push({
        IndexName: name,
        KeySchema: data.keySchema,
        Projection: data.projection,
        IndexStatus: "ACTIVE",
        ProvisionedThroughput: data.provisionedThroughput,
        IndexSizeBytes: 0,
        ItemCount: itemCount,
        IndexArn: `arn:aws:dynamodb:${this.region}:000000000000:table/${this.name}/index/${name}`
      });
    }
    return indexes;
  }
  describeLocalSecondaryIndexes() {
    const indexes = [];
    for (const [name, data] of this.localSecondaryIndexes) {
      let itemCount = 0;
      for (const keys of data.items.values()) {
        itemCount += keys.size;
      }
      indexes.push({
        IndexName: name,
        KeySchema: data.keySchema,
        Projection: data.projection,
        IndexSizeBytes: 0,
        ItemCount: itemCount,
        IndexArn: `arn:aws:dynamodb:${this.region}:000000000000:table/${this.name}/index/${name}`
      });
    }
    return indexes;
  }
  estimateTableSize() {
    let size = 0;
    for (const item of this.items.values()) {
      size += estimateItemSize(item);
    }
    return size;
  }
  getItem(key) {
    const keyString = serializeKey(key, this.keySchema);
    const item = this.items.get(keyString);
    return item ? deepClone(item) : void 0;
  }
  putItem(item) {
    const key = extractKey(item, this.keySchema);
    const keyString = serializeKey(key, this.keySchema);
    const oldItem = this.items.get(keyString);
    this.items.set(keyString, deepClone(item));
    this.updateIndexes(item, oldItem);
    this.emitStreamRecord(oldItem ? "MODIFY" : "INSERT", key, oldItem, item);
    return oldItem ? deepClone(oldItem) : void 0;
  }
  deleteItem(key) {
    const keyString = serializeKey(key, this.keySchema);
    const oldItem = this.items.get(keyString);
    if (oldItem) {
      this.items.delete(keyString);
      this.removeFromIndexes(oldItem);
      this.emitStreamRecord("REMOVE", key, oldItem, void 0);
    }
    return oldItem ? deepClone(oldItem) : void 0;
  }
  updateItem(key, updatedItem) {
    const keyString = serializeKey(key, this.keySchema);
    const oldItem = this.items.get(keyString);
    this.items.set(keyString, deepClone(updatedItem));
    this.updateIndexes(updatedItem, oldItem);
    this.emitStreamRecord(oldItem ? "MODIFY" : "INSERT", key, oldItem, updatedItem);
    return oldItem ? deepClone(oldItem) : void 0;
  }
  updateIndexes(newItem, oldItem) {
    if (oldItem) {
      this.removeFromIndexes(oldItem);
    }
    this.addToIndexes(newItem);
  }
  addToIndexes(item) {
    const primaryKey = serializeKey(extractKey(item, this.keySchema), this.keySchema);
    for (const [, indexData] of this.globalSecondaryIndexes) {
      const indexKey = this.buildIndexKey(item, indexData.keySchema);
      if (indexKey) {
        let keys = indexData.items.get(indexKey);
        if (!keys) {
          keys = /* @__PURE__ */ new Set();
          indexData.items.set(indexKey, keys);
        }
        keys.add(primaryKey);
      }
    }
    for (const [, indexData] of this.localSecondaryIndexes) {
      const indexKey = this.buildIndexKey(item, indexData.keySchema);
      if (indexKey) {
        let keys = indexData.items.get(indexKey);
        if (!keys) {
          keys = /* @__PURE__ */ new Set();
          indexData.items.set(indexKey, keys);
        }
        keys.add(primaryKey);
      }
    }
  }
  removeFromIndexes(item) {
    const primaryKey = serializeKey(extractKey(item, this.keySchema), this.keySchema);
    for (const [, indexData] of this.globalSecondaryIndexes) {
      const indexKey = this.buildIndexKey(item, indexData.keySchema);
      if (indexKey) {
        const keys = indexData.items.get(indexKey);
        if (keys) {
          keys.delete(primaryKey);
          if (keys.size === 0) {
            indexData.items.delete(indexKey);
          }
        }
      }
    }
    for (const [, indexData] of this.localSecondaryIndexes) {
      const indexKey = this.buildIndexKey(item, indexData.keySchema);
      if (indexKey) {
        const keys = indexData.items.get(indexKey);
        if (keys) {
          keys.delete(primaryKey);
          if (keys.size === 0) {
            indexData.items.delete(indexKey);
          }
        }
      }
    }
  }
  buildIndexKey(item, keySchema) {
    const hashAttr = getHashKey(keySchema);
    if (!item[hashAttr]) {
      return null;
    }
    const rangeAttr = getRangeKey(keySchema);
    if (rangeAttr && !item[rangeAttr]) {
      return null;
    }
    return serializeKey(extractKey(item, keySchema), keySchema);
  }
  scan(limit, exclusiveStartKey) {
    const hashAttr = this.getHashKeyName();
    const rangeAttr = this.getRangeKeyName();
    const allItems = Array.from(this.items.values()).map((item) => deepClone(item));
    allItems.sort((a, b) => {
      const hashA = a[hashAttr];
      const hashB = b[hashAttr];
      if (hashA && hashB) {
        const hashCmp = hashAttributeValue(hashA).localeCompare(hashAttributeValue(hashB));
        if (hashCmp !== 0) return hashCmp;
      }
      if (rangeAttr) {
        const rangeA = a[rangeAttr];
        const rangeB = b[rangeAttr];
        if (rangeA && rangeB) {
          return this.compareAttributes(rangeA, rangeB);
        }
      }
      return 0;
    });
    let startIdx = 0;
    if (exclusiveStartKey) {
      const startKey = serializeKey(exclusiveStartKey, this.keySchema);
      startIdx = allItems.findIndex(
        (item) => serializeKey(extractKey(item, this.keySchema), this.keySchema) === startKey
      );
      if (startIdx !== -1) {
        startIdx++;
      } else {
        startIdx = 0;
      }
    }
    const items = limit ? allItems.slice(startIdx, startIdx + limit) : allItems.slice(startIdx);
    const hasMore = limit ? startIdx + limit < allItems.length : false;
    const lastItem = items[items.length - 1];
    return {
      items,
      lastEvaluatedKey: hasMore && lastItem ? extractKey(lastItem, this.keySchema) : void 0
    };
  }
  queryByHashKey(hashValue, options) {
    const hashAttr = this.getHashKeyName();
    const rangeAttr = this.getRangeKeyName();
    const matchingItems = [];
    for (const item of this.items.values()) {
      const itemHashValue = item[hashAttr];
      const queryHashValue = hashValue[hashAttr];
      if (itemHashValue && queryHashValue && this.attributeEquals(itemHashValue, queryHashValue)) {
        matchingItems.push(deepClone(item));
      }
    }
    if (rangeAttr) {
      matchingItems.sort((a, b) => {
        const aVal = a[rangeAttr];
        const bVal = b[rangeAttr];
        if (!aVal && !bVal) return 0;
        if (!aVal) return 1;
        if (!bVal) return -1;
        const cmp = this.compareAttributes(aVal, bVal);
        return options?.scanIndexForward === false ? -cmp : cmp;
      });
    }
    let startIdx = 0;
    if (options?.exclusiveStartKey) {
      const startKey = serializeKey(options.exclusiveStartKey, this.keySchema);
      startIdx = matchingItems.findIndex(
        (item) => serializeKey(extractKey(item, this.keySchema), this.keySchema) === startKey
      );
      if (startIdx !== -1) {
        startIdx++;
      } else {
        startIdx = 0;
      }
    }
    const limit = options?.limit;
    const sliced = limit ? matchingItems.slice(startIdx, startIdx + limit) : matchingItems.slice(startIdx);
    const hasMore = limit ? startIdx + limit < matchingItems.length : false;
    const lastItem = sliced[sliced.length - 1];
    return {
      items: sliced,
      lastEvaluatedKey: hasMore && lastItem ? extractKey(lastItem, this.keySchema) : void 0
    };
  }
  queryIndex(indexName, hashValue, options) {
    const gsi = this.globalSecondaryIndexes.get(indexName);
    const lsi = this.localSecondaryIndexes.get(indexName);
    const indexData = gsi || lsi;
    if (!indexData) {
      throw new Error(`Index ${indexName} not found`);
    }
    const indexHashAttr = getHashKey(indexData.keySchema);
    const indexRangeAttr = getRangeKey(indexData.keySchema);
    const matchingItems = [];
    for (const item of this.items.values()) {
      const itemHashValue = item[indexHashAttr];
      const queryHashValue = hashValue[indexHashAttr];
      if (!itemHashValue || !queryHashValue || !this.attributeEquals(itemHashValue, queryHashValue)) {
        continue;
      }
      if (indexRangeAttr && !item[indexRangeAttr]) {
        continue;
      }
      matchingItems.push(deepClone(item));
    }
    if (indexRangeAttr) {
      matchingItems.sort((a, b) => {
        const aVal = a[indexRangeAttr];
        const bVal = b[indexRangeAttr];
        if (!aVal && !bVal) return 0;
        if (!aVal) return 1;
        if (!bVal) return -1;
        const cmp = this.compareAttributes(aVal, bVal);
        return options?.scanIndexForward === false ? -cmp : cmp;
      });
    }
    let startIdx = 0;
    if (options?.exclusiveStartKey) {
      const combinedKeySchema = [...indexData.keySchema];
      const tableRangeKey = this.getRangeKeyName();
      if (tableRangeKey && !combinedKeySchema.some((k) => k.AttributeName === tableRangeKey)) {
        combinedKeySchema.push({ AttributeName: tableRangeKey, KeyType: "RANGE" });
      }
      const tableHashKey = this.getHashKeyName();
      if (!combinedKeySchema.some((k) => k.AttributeName === tableHashKey)) {
        combinedKeySchema.push({ AttributeName: tableHashKey, KeyType: "HASH" });
      }
      const startKey = serializeKey(options.exclusiveStartKey, combinedKeySchema);
      startIdx = matchingItems.findIndex(
        (item) => serializeKey(extractKey(item, combinedKeySchema), combinedKeySchema) === startKey
      );
      if (startIdx !== -1) {
        startIdx++;
      } else {
        startIdx = 0;
      }
    }
    const limit = options?.limit;
    const sliced = limit ? matchingItems.slice(startIdx, startIdx + limit) : matchingItems.slice(startIdx);
    const hasMore = limit ? startIdx + limit < matchingItems.length : false;
    const lastItem = sliced[sliced.length - 1];
    let lastEvaluatedKey;
    if (hasMore && lastItem) {
      lastEvaluatedKey = extractKey(lastItem, this.keySchema);
      for (const keyElement of indexData.keySchema) {
        const attrValue = lastItem[keyElement.AttributeName];
        if (attrValue) {
          lastEvaluatedKey[keyElement.AttributeName] = attrValue;
        }
      }
    }
    return {
      items: sliced,
      lastEvaluatedKey,
      indexKeySchema: indexData.keySchema
    };
  }
  scanIndex(indexName, limit, exclusiveStartKey) {
    const gsi = this.globalSecondaryIndexes.get(indexName);
    const lsi = this.localSecondaryIndexes.get(indexName);
    const indexData = gsi || lsi;
    if (!indexData) {
      throw new Error(`Index ${indexName} not found`);
    }
    const indexHashAttr = getHashKey(indexData.keySchema);
    const indexRangeAttr = getRangeKey(indexData.keySchema);
    const matchingItems = [];
    for (const item of this.items.values()) {
      if (item[indexHashAttr]) {
        matchingItems.push(deepClone(item));
      }
    }
    matchingItems.sort((a, b) => {
      const hashA = a[indexHashAttr];
      const hashB = b[indexHashAttr];
      if (hashA && hashB) {
        const hashCmp = hashAttributeValue(hashA).localeCompare(hashAttributeValue(hashB));
        if (hashCmp !== 0) return hashCmp;
      }
      if (indexRangeAttr) {
        const rangeA = a[indexRangeAttr];
        const rangeB = b[indexRangeAttr];
        if (rangeA && rangeB) {
          return this.compareAttributes(rangeA, rangeB);
        }
      }
      return 0;
    });
    let startIdx = 0;
    if (exclusiveStartKey) {
      const startKey = serializeKey(exclusiveStartKey, this.keySchema);
      startIdx = matchingItems.findIndex(
        (item) => serializeKey(extractKey(item, this.keySchema), this.keySchema) === startKey
      );
      if (startIdx !== -1) {
        startIdx++;
      } else {
        startIdx = 0;
      }
    }
    const sliced = limit ? matchingItems.slice(startIdx, startIdx + limit) : matchingItems.slice(startIdx);
    const hasMore = limit ? startIdx + limit < matchingItems.length : false;
    const lastItem = sliced[sliced.length - 1];
    let lastEvaluatedKey;
    if (hasMore && lastItem) {
      lastEvaluatedKey = extractKey(lastItem, this.keySchema);
      for (const keyElement of indexData.keySchema) {
        const attrValue = lastItem[keyElement.AttributeName];
        if (attrValue) {
          lastEvaluatedKey[keyElement.AttributeName] = attrValue;
        }
      }
    }
    return {
      items: sliced,
      lastEvaluatedKey,
      indexKeySchema: indexData.keySchema
    };
  }
  hasIndex(indexName) {
    return this.globalSecondaryIndexes.has(indexName) || this.localSecondaryIndexes.has(indexName);
  }
  getIndexKeySchema(indexName) {
    return this.globalSecondaryIndexes.get(indexName)?.keySchema || this.localSecondaryIndexes.get(indexName)?.keySchema;
  }
  attributeEquals(a, b) {
    if ("S" in a && "S" in b) return a.S === b.S;
    if ("N" in a && "N" in b) return a.N === b.N;
    if ("B" in a && "B" in b) return a.B === b.B;
    return JSON.stringify(a) === JSON.stringify(b);
  }
  compareAttributes(a, b) {
    if ("S" in a && "S" in b) return a.S.localeCompare(b.S);
    if ("N" in a && "N" in b) return parseFloat(a.N) - parseFloat(b.N);
    if ("B" in a && "B" in b) return a.B.localeCompare(b.B);
    return 0;
  }
  getAllItems() {
    return Array.from(this.items.values()).map((item) => deepClone(item));
  }
  clear() {
    this.items.clear();
    for (const index of this.globalSecondaryIndexes.values()) {
      index.items.clear();
    }
    for (const index of this.localSecondaryIndexes.values()) {
      index.items.clear();
    }
  }
  onStreamRecord(callback) {
    this.streamCallbacks.add(callback);
    return () => {
      this.streamCallbacks.delete(callback);
    };
  }
  emitStreamRecord(eventName, keys, oldImage, newImage) {
    if (!this.streamSpecification?.StreamEnabled || this.streamCallbacks.size === 0) {
      return;
    }
    const viewType = this.streamSpecification.StreamViewType || "NEW_AND_OLD_IMAGES";
    const record = {
      eventID: generateEventId(),
      eventName,
      eventVersion: "1.1",
      eventSource: "aws:dynamodb",
      awsRegion: this.region,
      dynamodb: {
        ApproximateCreationDateTime: Date.now() / 1e3,
        Keys: keys,
        SequenceNumber: generateSequenceNumber(),
        SizeBytes: estimateItemSize(keys),
        StreamViewType: viewType
      }
    };
    if (viewType === "NEW_IMAGE" || viewType === "NEW_AND_OLD_IMAGES") {
      if (newImage) {
        record.dynamodb.NewImage = deepClone(newImage);
      }
    }
    if (viewType === "OLD_IMAGE" || viewType === "NEW_AND_OLD_IMAGES") {
      if (oldImage) {
        record.dynamodb.OldImage = deepClone(oldImage);
      }
    }
    for (const callback of this.streamCallbacks) {
      try {
        callback(record);
      } catch {
      }
    }
  }
  expireTtlItems(currentTimeSeconds) {
    const ttlAttr = this.getTtlAttributeName();
    if (!ttlAttr) {
      return [];
    }
    const expiredItems = [];
    for (const [keyString, item] of this.items) {
      const ttlValue = item[ttlAttr];
      if (ttlValue && "N" in ttlValue) {
        const ttlTimestamp = parseInt(ttlValue.N, 10);
        if (ttlTimestamp <= currentTimeSeconds) {
          expiredItems.push(deepClone(item));
          const key = extractKey(item, this.keySchema);
          this.items.delete(keyString);
          this.removeFromIndexes(item);
          this.emitStreamRecord("REMOVE", key, item, void 0);
        }
      }
    }
    return expiredItems;
  }
};

// src/store/index.ts
var TableStore = class {
  tables = /* @__PURE__ */ new Map();
  region;
  constructor(region = "us-east-1") {
    this.region = region;
  }
  createTable(input) {
    if (this.tables.has(input.TableName)) {
      throw new ResourceInUseException(`Table already exists: ${input.TableName}`);
    }
    const table = new Table(
      {
        tableName: input.TableName,
        keySchema: input.KeySchema,
        attributeDefinitions: input.AttributeDefinitions,
        provisionedThroughput: input.ProvisionedThroughput,
        billingMode: input.BillingMode,
        globalSecondaryIndexes: input.GlobalSecondaryIndexes,
        localSecondaryIndexes: input.LocalSecondaryIndexes,
        streamSpecification: input.StreamSpecification,
        timeToLiveSpecification: input.TimeToLiveSpecification
      },
      this.region
    );
    this.tables.set(input.TableName, table);
    return table;
  }
  getTable(tableName) {
    const table = this.tables.get(tableName);
    if (!table) {
      throw new ResourceNotFoundException(`Requested resource not found: Table: ${tableName} not found`);
    }
    return table;
  }
  hasTable(tableName) {
    return this.tables.has(tableName);
  }
  deleteTable(tableName) {
    const table = this.tables.get(tableName);
    if (!table) {
      throw new ResourceNotFoundException(`Requested resource not found: Table: ${tableName} not found`);
    }
    this.tables.delete(tableName);
    return table;
  }
  listTables(exclusiveStartTableName, limit) {
    const allNames = Array.from(this.tables.keys()).sort();
    let startIdx = 0;
    if (exclusiveStartTableName) {
      startIdx = allNames.indexOf(exclusiveStartTableName);
      if (startIdx !== -1) {
        startIdx++;
      } else {
        startIdx = 0;
      }
    }
    const tableNames = limit ? allNames.slice(startIdx, startIdx + limit) : allNames.slice(startIdx);
    const hasMore = limit ? startIdx + tableNames.length < allNames.length : false;
    const lastEvaluatedTableName = hasMore ? tableNames[tableNames.length - 1] : void 0;
    return { tableNames, lastEvaluatedTableName };
  }
  clear() {
    this.tables.clear();
  }
  expireTtlItems(currentTimeSeconds) {
    for (const table of this.tables.values()) {
      table.expireTtlItems(currentTimeSeconds);
    }
  }
};

// src/dynamodb-server.ts
var DynamoDBServer = class {
  server;
  javaServer;
  store;
  clock;
  config;
  endpoint;
  client;
  documentClient;
  streamCallbacks = /* @__PURE__ */ new Map();
  constructor(config = {}) {
    this.config = {
      port: config.port ?? 0,
      region: config.region ?? "us-east-1",
      hostname: config.hostname ?? "localhost",
      engine: config.engine ?? "memory"
    };
    this.endpoint = {
      protocol: "http:",
      hostname: this.config.hostname,
      path: "/"
    };
    this.store = new TableStore(this.config.region);
    this.clock = new VirtualClock();
  }
  async listen(port) {
    if (this.server || this.javaServer) {
      throw new Error("Server is already running");
    }
    const listenPort = port ?? this.config.port;
    if (this.config.engine === "java") {
      this.javaServer = createJavaServer(listenPort, this.config.region);
      await this.javaServer.wait();
      this.config.port = this.javaServer.port;
    } else {
      const serverOrPromise = createServer(this.store, listenPort);
      if (serverOrPromise instanceof Promise) {
        this.server = await serverOrPromise;
      } else {
        this.server = serverOrPromise;
      }
      this.config.port = this.server.port;
    }
    this.endpoint.port = this.config.port;
  }
  async stop() {
    if (this.server) {
      this.server.stop();
      this.server = void 0;
    }
    if (this.javaServer) {
      await this.javaServer.stop();
      this.javaServer = void 0;
    }
    this.client = void 0;
    this.documentClient = void 0;
  }
  get port() {
    return this.config.port;
  }
  get engine() {
    return this.config.engine;
  }
  getEndpoint() {
    return this.endpoint;
  }
  getClient() {
    if (!this.client) {
      this.client = new DynamoDBClient2({
        endpoint: this.endpoint,
        region: this.config.region,
        credentials: {
          accessKeyId: "fake",
          secretAccessKey: "fake"
        }
      });
    }
    return this.client;
  }
  getDocumentClient() {
    if (!this.documentClient) {
      this.documentClient = DynamoDBDocumentClient.from(this.getClient(), {
        marshallOptions: {
          removeUndefinedValues: true
        }
      });
    }
    return this.documentClient;
  }
  /**
   * Advance the virtual clock by the specified number of milliseconds.
   * This triggers TTL processing for expired items.
   * Only available when using the 'memory' engine.
   */
  advanceTime(ms) {
    if (this.config.engine === "java") {
      throw new Error("advanceTime is not supported with the Java engine");
    }
    this.clock.advance(ms);
    this.processTTL();
  }
  /**
   * Set the virtual clock to the specified timestamp.
   * This triggers TTL processing for expired items.
   * Only available when using the 'memory' engine.
   */
  setTime(timestamp) {
    if (this.config.engine === "java") {
      throw new Error("setTime is not supported with the Java engine");
    }
    this.clock.set(timestamp);
    this.processTTL();
  }
  /**
   * Get the current virtual clock time.
   * Only available when using the 'memory' engine.
   */
  getTime() {
    if (this.config.engine === "java") {
      throw new Error("getTime is not supported with the Java engine");
    }
    return this.clock.now();
  }
  processTTL() {
    const currentTimeSeconds = this.clock.nowInSeconds();
    this.store.expireTtlItems(currentTimeSeconds);
  }
  /**
   * Register a callback for stream records on a specific table.
   * Only available when using the 'memory' engine.
   */
  onStreamRecord(tableName, callback) {
    if (this.config.engine === "java") {
      throw new Error("onStreamRecord is not supported with the Java engine");
    }
    const table = this.store.getTable(tableName);
    return table.onStreamRecord(callback);
  }
  /**
   * Reset the server, clearing all tables and data.
   * Only available when using the 'memory' engine.
   */
  reset() {
    if (this.config.engine === "java") {
      throw new Error("reset is not supported with the Java engine");
    }
    this.store.clear();
    this.clock.reset();
    this.streamCallbacks.clear();
  }
  /**
   * Get the internal table store.
   * Only available when using the 'memory' engine.
   */
  getTableStore() {
    if (this.config.engine === "java") {
      throw new Error("getTableStore is not supported with the Java engine");
    }
    return this.store;
  }
};
export {
  ConditionalCheckFailedException,
  DynamoDBError,
  DynamoDBServer,
  IdempotentParameterMismatchException,
  InternalServerError,
  ItemCollectionSizeLimitExceededException,
  ProvisionedThroughputExceededException,
  ResourceInUseException,
  ResourceNotFoundException,
  SerializationException,
  TransactionCanceledException,
  TransactionConflictException,
  ValidationException,
  VirtualClock
};
