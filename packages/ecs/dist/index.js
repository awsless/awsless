import {
  __commonJS,
  __export,
  __toESM
} from "./chunk-U67V476Y.js";

// ../../node_modules/.pnpm/expect-type@1.3.0/node_modules/expect-type/dist/branding.js
var require_branding = __commonJS({
  "../../node_modules/.pnpm/expect-type@1.3.0/node_modules/expect-type/dist/branding.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../node_modules/.pnpm/expect-type@1.3.0/node_modules/expect-type/dist/messages.js
var require_messages = __commonJS({
  "../../node_modules/.pnpm/expect-type@1.3.0/node_modules/expect-type/dist/messages.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../node_modules/.pnpm/expect-type@1.3.0/node_modules/expect-type/dist/overloads.js
var require_overloads = __commonJS({
  "../../node_modules/.pnpm/expect-type@1.3.0/node_modules/expect-type/dist/overloads.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../node_modules/.pnpm/expect-type@1.3.0/node_modules/expect-type/dist/utils.js
var require_utils = __commonJS({
  "../../node_modules/.pnpm/expect-type@1.3.0/node_modules/expect-type/dist/utils.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// ../../node_modules/.pnpm/expect-type@1.3.0/node_modules/expect-type/dist/index.js
var require_dist = __commonJS({
  "../../node_modules/.pnpm/expect-type@1.3.0/node_modules/expect-type/dist/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o2, m2, k2, k22) {
      if (k22 === void 0) k22 = k2;
      var desc = Object.getOwnPropertyDescriptor(m2, k2);
      if (!desc || ("get" in desc ? !m2.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m2[k2];
        } };
      }
      Object.defineProperty(o2, k22, desc);
    }) : (function(o2, m2, k2, k22) {
      if (k22 === void 0) k22 = k2;
      o2[k22] = m2[k2];
    }));
    var __exportStar = exports && exports.__exportStar || function(m2, exports2) {
      for (var p2 in m2) if (p2 !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p2)) __createBinding(exports2, m2, p2);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.expectTypeOf = void 0;
    __exportStar(require_branding(), exports);
    __exportStar(require_messages(), exports);
    __exportStar(require_overloads(), exports);
    __exportStar(require_utils(), exports);
    var fn2 = () => true;
    var expectTypeOf2 = (_actual) => {
      const nonFunctionProperties = [
        "parameters",
        "returns",
        "resolves",
        "not",
        "items",
        "constructorParameters",
        "thisParameter",
        "instance",
        "guards",
        "asserts",
        "branded"
      ];
      const obj = {
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        toBeAny: fn2,
        toBeUnknown: fn2,
        toBeNever: fn2,
        toBeFunction: fn2,
        toBeObject: fn2,
        toBeArray: fn2,
        toBeString: fn2,
        toBeNumber: fn2,
        toBeBoolean: fn2,
        toBeVoid: fn2,
        toBeSymbol: fn2,
        toBeNull: fn2,
        toBeUndefined: fn2,
        toBeNullable: fn2,
        toBeBigInt: fn2,
        toMatchTypeOf: fn2,
        toEqualTypeOf: fn2,
        toBeConstructibleWith: fn2,
        toMatchObjectType: fn2,
        toExtend: fn2,
        map: exports.expectTypeOf,
        toBeCallableWith: exports.expectTypeOf,
        extract: exports.expectTypeOf,
        exclude: exports.expectTypeOf,
        pick: exports.expectTypeOf,
        omit: exports.expectTypeOf,
        toHaveProperty: exports.expectTypeOf,
        parameter: exports.expectTypeOf
      };
      const getterProperties = nonFunctionProperties;
      getterProperties.forEach((prop) => Object.defineProperty(obj, prop, { get: () => (0, exports.expectTypeOf)({}) }));
      return obj;
    };
    exports.expectTypeOf = expectTypeOf2;
  }
});

// src/index.ts
import { ECSClient as ECSClient4 } from "@aws-sdk/client-ecs";

// src/client.ts
import { ECSClient } from "@aws-sdk/client-ecs";
import { globalClient } from "@awsless/utils";
var ecsClient = globalClient(() => {
  return new ECSClient({});
});

// src/commands.ts
import { RunTaskCommand } from "@aws-sdk/client-ecs";
import { stringify } from "@awsless/json";
var runTask = async ({
  client = ecsClient(),
  cluster,
  taskDefinition,
  subnets,
  securityGroups,
  container,
  payload,
  assignPublicIp = true
}) => {
  const result = await client.send(
    new RunTaskCommand({
      cluster,
      taskDefinition,
      launchType: "FARGATE",
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets,
          securityGroups,
          assignPublicIp: assignPublicIp ? "ENABLED" : "DISABLED"
        }
      },
      overrides: {
        containerOverrides: [
          {
            name: container,
            environment: payload !== void 0 ? [
              {
                name: "PAYLOAD",
                value: stringify(payload)
              }
            ] : []
          }
        ]
      },
      count: 1
    })
  );
  if (result.failures && result.failures.length > 0) {
    const { reason, detail } = result.failures[0];
    throw new Error(`ECS RunTask failed: ${reason}${detail ? ` - ${detail}` : ""}`);
  }
  return { taskArn: result.tasks?.[0]?.taskArn };
};

// src/mock.ts
import { ECSClient as ECSClient3, RunTaskCommand as RunTaskCommand2 } from "@aws-sdk/client-ecs";
import { parse } from "@awsless/json";
import { mockObjectValues, nextTick } from "@awsless/utils";

// ../../node_modules/.pnpm/aws-sdk-vitest-mock@1.0.55_@aws-sdk+core@3.973.26_vitest@4.1.2_@opentelemetry+api@1.9.0_564c9e47d957cbee0e9e478e77855009/node_modules/aws-sdk-vitest-mock/matchers-uIr6Rs4e.js
var e = {
  red: (e3) => `\x1B[31m${e3}\x1B[39m`,
  green: (e3) => `\x1B[32m${e3}\x1B[39m`,
  yellow: (e3) => `\x1B[33m${e3}\x1B[39m`,
  blue: (e3) => `\x1B[34m${e3}\x1B[39m`,
  magenta: (e3) => `\x1B[35m${e3}\x1B[39m`,
  cyan: (e3) => `\x1B[36m${e3}\x1B[39m`,
  gray: (e3) => `\x1B[90m${e3}\x1B[39m`,
  bold: (e3) => `\x1B[1m${e3}\x1B[22m`
};

// ../../node_modules/.pnpm/tinyrainbow@3.1.0/node_modules/tinyrainbow/dist/index.js
var b = {
  reset: [0, 0],
  bold: [1, 22, "\x1B[22m\x1B[1m"],
  dim: [2, 22, "\x1B[22m\x1B[2m"],
  italic: [3, 23],
  underline: [4, 24],
  inverse: [7, 27],
  hidden: [8, 28],
  strikethrough: [9, 29],
  black: [30, 39],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  white: [37, 39],
  gray: [90, 39],
  bgBlack: [40, 49],
  bgRed: [41, 49],
  bgGreen: [42, 49],
  bgYellow: [43, 49],
  bgBlue: [44, 49],
  bgMagenta: [45, 49],
  bgCyan: [46, 49],
  bgWhite: [47, 49],
  blackBright: [90, 39],
  redBright: [91, 39],
  greenBright: [92, 39],
  yellowBright: [93, 39],
  blueBright: [94, 39],
  magentaBright: [95, 39],
  cyanBright: [96, 39],
  whiteBright: [97, 39],
  bgBlackBright: [100, 49],
  bgRedBright: [101, 49],
  bgGreenBright: [102, 49],
  bgYellowBright: [103, 49],
  bgBlueBright: [104, 49],
  bgMagentaBright: [105, 49],
  bgCyanBright: [106, 49],
  bgWhiteBright: [107, 49]
};
function i(e3) {
  return String(e3);
}
i.open = "";
i.close = "";
function B() {
  let e3 = typeof process != "undefined" ? process : void 0, r2 = (e3 == null ? void 0 : e3.env) || {}, a2 = r2.FORCE_TTY !== "false", l2 = (e3 == null ? void 0 : e3.argv) || [];
  return !("NO_COLOR" in r2 || l2.includes("--no-color")) && ("FORCE_COLOR" in r2 || l2.includes("--color") || (e3 == null ? void 0 : e3.platform) === "win32" || a2 && r2.TERM !== "dumb" || "CI" in r2) || typeof window != "undefined" && !!window.chrome;
}
function C({ force: e3 } = {}) {
  let r2 = e3 || B(), a2 = (t, o2, u2, n2) => {
    let g2 = "", s2 = 0;
    do
      g2 += t.substring(s2, n2) + u2, s2 = n2 + o2.length, n2 = t.indexOf(o2, s2);
    while (~n2);
    return g2 + t.substring(s2);
  }, l2 = (t, o2, u2 = t) => {
    let n2 = (g2) => {
      let s2 = String(g2), h2 = s2.indexOf(o2, t.length);
      return ~h2 ? t + a2(s2, o2, u2, h2) + o2 : t + s2 + o2;
    };
    return n2.open = t, n2.close = o2, n2;
  }, c2 = {
    isColorSupported: r2
  }, f2 = (t) => `\x1B[${t}m`;
  for (let t in b) {
    let o2 = b[t];
    c2[t] = r2 ? l2(
      f2(o2[0]),
      f2(o2[1]),
      o2[2]
    ) : i;
  }
  return c2;
}
var d = C();
var y = d;

// ../../node_modules/.pnpm/@vitest+pretty-format@4.1.2/node_modules/@vitest/pretty-format/dist/index.js
function _mergeNamespaces(n2, m2) {
  m2.forEach(function(e3) {
    e3 && typeof e3 !== "string" && !Array.isArray(e3) && Object.keys(e3).forEach(function(k2) {
      if (k2 !== "default" && !(k2 in n2)) {
        var d3 = Object.getOwnPropertyDescriptor(e3, k2);
        Object.defineProperty(n2, k2, d3.get ? d3 : {
          enumerable: true,
          get: function() {
            return e3[k2];
          }
        });
      }
    });
  });
  return Object.freeze(n2);
}
function getKeysOfEnumerableProperties(object2, compareKeys) {
  const rawKeys = Object.keys(object2);
  const keys2 = compareKeys === null ? rawKeys : rawKeys.sort(compareKeys);
  if (Object.getOwnPropertySymbols) {
    for (const symbol of Object.getOwnPropertySymbols(object2)) {
      if (Object.getOwnPropertyDescriptor(object2, symbol).enumerable) {
        keys2.push(symbol);
      }
    }
  }
  return keys2;
}
function printIteratorEntries(iterator, config2, indentation, depth, refs, printer2, separator = ": ") {
  let result = "";
  let width = 0;
  let current = iterator.next();
  if (!current.done) {
    result += config2.spacingOuter;
    const indentationNext = indentation + config2.indent;
    while (!current.done) {
      result += indentationNext;
      if (width++ === config2.maxWidth) {
        result += "\u2026";
        break;
      }
      const name = printer2(current.value[0], config2, indentationNext, depth, refs);
      const value = printer2(current.value[1], config2, indentationNext, depth, refs);
      result += name + separator + value;
      current = iterator.next();
      if (!current.done) {
        result += `,${config2.spacingInner}`;
      } else if (!config2.min) {
        result += ",";
      }
    }
    result += config2.spacingOuter + indentation;
  }
  return result;
}
function printIteratorValues(iterator, config2, indentation, depth, refs, printer2) {
  let result = "";
  let width = 0;
  let current = iterator.next();
  if (!current.done) {
    result += config2.spacingOuter;
    const indentationNext = indentation + config2.indent;
    while (!current.done) {
      result += indentationNext;
      if (width++ === config2.maxWidth) {
        result += "\u2026";
        break;
      }
      result += printer2(current.value, config2, indentationNext, depth, refs);
      current = iterator.next();
      if (!current.done) {
        result += `,${config2.spacingInner}`;
      } else if (!config2.min) {
        result += ",";
      }
    }
    result += config2.spacingOuter + indentation;
  }
  return result;
}
function printListItems(list, config2, indentation, depth, refs, printer2) {
  let result = "";
  list = list instanceof ArrayBuffer ? new DataView(list) : list;
  const isDataView = (l2) => l2 instanceof DataView;
  const length = isDataView(list) ? list.byteLength : list.length;
  if (length > 0) {
    result += config2.spacingOuter;
    const indentationNext = indentation + config2.indent;
    for (let i3 = 0; i3 < length; i3++) {
      result += indentationNext;
      if (i3 === config2.maxWidth) {
        result += "\u2026";
        break;
      }
      if (isDataView(list) || i3 in list) {
        result += printer2(isDataView(list) ? list.getInt8(i3) : list[i3], config2, indentationNext, depth, refs);
      }
      if (i3 < length - 1) {
        result += `,${config2.spacingInner}`;
      } else if (!config2.min) {
        result += ",";
      }
    }
    result += config2.spacingOuter + indentation;
  }
  return result;
}
function printObjectProperties(val, config2, indentation, depth, refs, printer2) {
  let result = "";
  const keys2 = getKeysOfEnumerableProperties(val, config2.compareKeys);
  if (keys2.length > 0) {
    result += config2.spacingOuter;
    const indentationNext = indentation + config2.indent;
    for (let i3 = 0; i3 < keys2.length; i3++) {
      const key = keys2[i3];
      const name = printer2(key, config2, indentationNext, depth, refs);
      const value = printer2(val[key], config2, indentationNext, depth, refs);
      result += `${indentationNext + name}: ${value}`;
      if (i3 < keys2.length - 1) {
        result += `,${config2.spacingInner}`;
      } else if (!config2.min) {
        result += ",";
      }
    }
    result += config2.spacingOuter + indentation;
  }
  return result;
}
var asymmetricMatcher = typeof Symbol === "function" && Symbol.for ? /* @__PURE__ */ Symbol.for("jest.asymmetricMatcher") : 1267621;
var SPACE$2 = " ";
var serialize$5 = (val, config2, indentation, depth, refs, printer2) => {
  const stringedValue = val.toString();
  if (stringedValue === "ArrayContaining" || stringedValue === "ArrayNotContaining") {
    if (++depth > config2.maxDepth) {
      return `[${stringedValue}]`;
    }
    return `${stringedValue + SPACE$2}[${printListItems(val.sample, config2, indentation, depth, refs, printer2)}]`;
  }
  if (stringedValue === "ObjectContaining" || stringedValue === "ObjectNotContaining") {
    if (++depth > config2.maxDepth) {
      return `[${stringedValue}]`;
    }
    return `${stringedValue + SPACE$2}{${printObjectProperties(val.sample, config2, indentation, depth, refs, printer2)}}`;
  }
  if (stringedValue === "StringMatching" || stringedValue === "StringNotMatching") {
    return stringedValue + SPACE$2 + printer2(val.sample, config2, indentation, depth, refs);
  }
  if (stringedValue === "StringContaining" || stringedValue === "StringNotContaining") {
    return stringedValue + SPACE$2 + printer2(val.sample, config2, indentation, depth, refs);
  }
  if (typeof val.toAsymmetricMatcher !== "function") {
    throw new TypeError(`Asymmetric matcher ${val.constructor.name} does not implement toAsymmetricMatcher()`);
  }
  return val.toAsymmetricMatcher();
};
var test$5 = (val) => val && val.$$typeof === asymmetricMatcher;
var plugin$5 = {
  serialize: serialize$5,
  test: test$5
};
var SPACE$1 = " ";
var OBJECT_NAMES = /* @__PURE__ */ new Set(["DOMStringMap", "NamedNodeMap"]);
var ARRAY_REGEXP = /^(?:HTML\w*Collection|NodeList)$/;
function testName(name) {
  return OBJECT_NAMES.has(name) || ARRAY_REGEXP.test(name);
}
var test$4 = (val) => val && val.constructor && !!val.constructor.name && testName(val.constructor.name);
function isNamedNodeMap(collection) {
  return collection.constructor.name === "NamedNodeMap";
}
var serialize$4 = (collection, config2, indentation, depth, refs, printer2) => {
  const name = collection.constructor.name;
  if (++depth > config2.maxDepth) {
    return `[${name}]`;
  }
  return (config2.min ? "" : name + SPACE$1) + (OBJECT_NAMES.has(name) ? `{${printObjectProperties(isNamedNodeMap(collection) ? [...collection].reduce((props, attribute) => {
    props[attribute.name] = attribute.value;
    return props;
  }, {}) : { ...collection }, config2, indentation, depth, refs, printer2)}}` : `[${printListItems([...collection], config2, indentation, depth, refs, printer2)}]`);
};
var plugin$4 = {
  serialize: serialize$4,
  test: test$4
};
function escapeHTML(str) {
  return str.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function printProps(keys2, props, config2, indentation, depth, refs, printer2) {
  const indentationNext = indentation + config2.indent;
  const colors = config2.colors;
  return keys2.map((key) => {
    const value = props[key];
    if (typeof value === "string" && value[0] === "_" && value.startsWith("__vitest_") && value.match(/__vitest_\d+__/)) {
      return "";
    }
    let printed = printer2(value, config2, indentationNext, depth, refs);
    if (typeof value !== "string") {
      if (printed.includes("\n")) {
        printed = config2.spacingOuter + indentationNext + printed + config2.spacingOuter + indentation;
      }
      printed = `{${printed}}`;
    }
    return `${config2.spacingInner + indentation + colors.prop.open + key + colors.prop.close}=${colors.value.open}${printed}${colors.value.close}`;
  }).join("");
}
function printChildren(children, config2, indentation, depth, refs, printer2) {
  return children.map((child) => config2.spacingOuter + indentation + (typeof child === "string" ? printText(child, config2) : printer2(child, config2, indentation, depth, refs))).join("");
}
function printShadowRoot(children, config2, indentation, depth, refs, printer2) {
  if (config2.printShadowRoot === false) {
    return "";
  }
  return [`${config2.spacingOuter + indentation}#shadow-root`, printChildren(children, config2, indentation + config2.indent, depth, refs, printer2)].join("");
}
function printText(text, config2) {
  const contentColor = config2.colors.content;
  return contentColor.open + escapeHTML(text) + contentColor.close;
}
function printComment(comment, config2) {
  const commentColor = config2.colors.comment;
  return `${commentColor.open}<!--${escapeHTML(comment)}-->${commentColor.close}`;
}
function printElement(type3, printedProps, printedChildren, config2, indentation) {
  const tagColor = config2.colors.tag;
  return `${tagColor.open}<${type3}${printedProps && tagColor.close + printedProps + config2.spacingOuter + indentation + tagColor.open}${printedChildren ? `>${tagColor.close}${printedChildren}${config2.spacingOuter}${indentation}${tagColor.open}</${type3}` : `${printedProps && !config2.min ? "" : " "}/`}>${tagColor.close}`;
}
function printElementAsLeaf(type3, config2) {
  const tagColor = config2.colors.tag;
  return `${tagColor.open}<${type3}${tagColor.close} \u2026${tagColor.open} />${tagColor.close}`;
}
var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var COMMENT_NODE = 8;
var FRAGMENT_NODE = 11;
var ELEMENT_REGEXP = /^(?:(?:HTML|SVG)\w*)?Element$/;
function testHasAttribute(val) {
  try {
    return typeof val.hasAttribute === "function" && val.hasAttribute("is");
  } catch {
    return false;
  }
}
function testNode(val) {
  const constructorName = val.constructor.name;
  const { nodeType, tagName } = val;
  const isCustomElement = typeof tagName === "string" && tagName.includes("-") || testHasAttribute(val);
  return nodeType === ELEMENT_NODE && (ELEMENT_REGEXP.test(constructorName) || isCustomElement) || nodeType === TEXT_NODE && constructorName === "Text" || nodeType === COMMENT_NODE && constructorName === "Comment" || nodeType === FRAGMENT_NODE && constructorName === "DocumentFragment";
}
var test$3 = (val) => val?.constructor?.name && testNode(val);
function nodeIsText(node) {
  return node.nodeType === TEXT_NODE;
}
function nodeIsComment(node) {
  return node.nodeType === COMMENT_NODE;
}
function nodeIsFragment(node) {
  return node.nodeType === FRAGMENT_NODE;
}
function filterChildren(children, filterNode) {
  let filtered = children.filter((node) => {
    if (node.nodeType === TEXT_NODE) {
      const text = node.data || "";
      return text.trim().length > 0;
    }
    return true;
  });
  if (filterNode) {
    filtered = filtered.filter(filterNode);
  }
  return filtered;
}
function serializeDOM(node, config2, indentation, depth, refs, printer2, filterNode) {
  if (nodeIsText(node)) {
    return printText(node.data, config2);
  }
  if (nodeIsComment(node)) {
    return printComment(node.data, config2);
  }
  const type3 = nodeIsFragment(node) ? "DocumentFragment" : node.tagName.toLowerCase();
  if (++depth > config2.maxDepth) {
    return printElementAsLeaf(type3, config2);
  }
  const children = Array.prototype.slice.call(node.childNodes || node.children);
  const shadowChildren = nodeIsFragment(node) || !node.shadowRoot ? [] : Array.prototype.slice.call(node.shadowRoot.children);
  const resolvedChildren = filterNode ? filterChildren(children, filterNode) : children;
  const resolvedShadowChildren = filterNode ? filterChildren(shadowChildren, filterNode) : shadowChildren;
  return printElement(type3, printProps(nodeIsFragment(node) ? [] : Array.from(node.attributes, (attr) => attr.name).sort(), nodeIsFragment(node) ? {} : [...node.attributes].reduce((props, attribute) => {
    props[attribute.name] = attribute.value;
    return props;
  }, {}), config2, indentation + config2.indent, depth, refs, printer2), (resolvedShadowChildren.length > 0 ? printShadowRoot(resolvedShadowChildren, config2, indentation + config2.indent, depth, refs, printer2) : "") + printChildren(resolvedChildren, config2, indentation + config2.indent, depth, refs, printer2), config2, indentation);
}
var serialize$3 = (node, config2, indentation, depth, refs, printer2) => serializeDOM(node, config2, indentation, depth, refs, printer2);
function createDOMElementFilter(filterNode) {
  return {
    test: test$3,
    serialize: (node, config2, indentation, depth, refs, printer2) => serializeDOM(node, config2, indentation, depth, refs, printer2, filterNode)
  };
}
var plugin$3 = {
  serialize: serialize$3,
  test: test$3
};
var IS_ITERABLE_SENTINEL = "@@__IMMUTABLE_ITERABLE__@@";
var IS_LIST_SENTINEL = "@@__IMMUTABLE_LIST__@@";
var IS_KEYED_SENTINEL = "@@__IMMUTABLE_KEYED__@@";
var IS_MAP_SENTINEL = "@@__IMMUTABLE_MAP__@@";
var IS_ORDERED_SENTINEL = "@@__IMMUTABLE_ORDERED__@@";
var IS_RECORD_SENTINEL = "@@__IMMUTABLE_RECORD__@@";
var IS_SEQ_SENTINEL = "@@__IMMUTABLE_SEQ__@@";
var IS_SET_SENTINEL = "@@__IMMUTABLE_SET__@@";
var IS_STACK_SENTINEL = "@@__IMMUTABLE_STACK__@@";
var getImmutableName = (name) => `Immutable.${name}`;
var printAsLeaf = (name) => `[${name}]`;
var SPACE = " ";
var LAZY = "\u2026";
function printImmutableEntries(val, config2, indentation, depth, refs, printer2, type3) {
  return ++depth > config2.maxDepth ? printAsLeaf(getImmutableName(type3)) : `${getImmutableName(type3) + SPACE}{${printIteratorEntries(val.entries(), config2, indentation, depth, refs, printer2)}}`;
}
function getRecordEntries(val) {
  let i3 = 0;
  return { next() {
    if (i3 < val._keys.length) {
      const key = val._keys[i3++];
      return {
        done: false,
        value: [key, val.get(key)]
      };
    }
    return {
      done: true,
      value: void 0
    };
  } };
}
function printImmutableRecord(val, config2, indentation, depth, refs, printer2) {
  const name = getImmutableName(val._name || "Record");
  return ++depth > config2.maxDepth ? printAsLeaf(name) : `${name + SPACE}{${printIteratorEntries(getRecordEntries(val), config2, indentation, depth, refs, printer2)}}`;
}
function printImmutableSeq(val, config2, indentation, depth, refs, printer2) {
  const name = getImmutableName("Seq");
  if (++depth > config2.maxDepth) {
    return printAsLeaf(name);
  }
  if (val[IS_KEYED_SENTINEL]) {
    return `${name + SPACE}{${val._iter || val._object ? printIteratorEntries(val.entries(), config2, indentation, depth, refs, printer2) : LAZY}}`;
  }
  return `${name + SPACE}[${val._iter || val._array || val._collection || val._iterable ? printIteratorValues(val.values(), config2, indentation, depth, refs, printer2) : LAZY}]`;
}
function printImmutableValues(val, config2, indentation, depth, refs, printer2, type3) {
  return ++depth > config2.maxDepth ? printAsLeaf(getImmutableName(type3)) : `${getImmutableName(type3) + SPACE}[${printIteratorValues(val.values(), config2, indentation, depth, refs, printer2)}]`;
}
var serialize$2 = (val, config2, indentation, depth, refs, printer2) => {
  if (val[IS_MAP_SENTINEL]) {
    return printImmutableEntries(val, config2, indentation, depth, refs, printer2, val[IS_ORDERED_SENTINEL] ? "OrderedMap" : "Map");
  }
  if (val[IS_LIST_SENTINEL]) {
    return printImmutableValues(val, config2, indentation, depth, refs, printer2, "List");
  }
  if (val[IS_SET_SENTINEL]) {
    return printImmutableValues(val, config2, indentation, depth, refs, printer2, val[IS_ORDERED_SENTINEL] ? "OrderedSet" : "Set");
  }
  if (val[IS_STACK_SENTINEL]) {
    return printImmutableValues(val, config2, indentation, depth, refs, printer2, "Stack");
  }
  if (val[IS_SEQ_SENTINEL]) {
    return printImmutableSeq(val, config2, indentation, depth, refs, printer2);
  }
  return printImmutableRecord(val, config2, indentation, depth, refs, printer2);
};
var test$2 = (val) => val && (val[IS_ITERABLE_SENTINEL] === true || val[IS_RECORD_SENTINEL] === true);
var plugin$2 = {
  serialize: serialize$2,
  test: test$2
};
function getDefaultExportFromCjs(x2) {
  return x2 && x2.__esModule && Object.prototype.hasOwnProperty.call(x2, "default") ? x2["default"] : x2;
}
var reactIs$1 = { exports: {} };
var reactIs_production = {};
var hasRequiredReactIs_production;
function requireReactIs_production() {
  if (hasRequiredReactIs_production) return reactIs_production;
  hasRequiredReactIs_production = 1;
  var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = /* @__PURE__ */ Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = /* @__PURE__ */ Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = /* @__PURE__ */ Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = /* @__PURE__ */ Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo"), REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy"), REACT_VIEW_TRANSITION_TYPE = /* @__PURE__ */ Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = /* @__PURE__ */ Symbol.for("react.client.reference");
  function typeOf2(object2) {
    if ("object" === typeof object2 && null !== object2) {
      var $$typeof = object2.$$typeof;
      switch ($$typeof) {
        case REACT_ELEMENT_TYPE:
          switch (object2 = object2.type, object2) {
            case REACT_FRAGMENT_TYPE:
            case REACT_PROFILER_TYPE:
            case REACT_STRICT_MODE_TYPE:
            case REACT_SUSPENSE_TYPE:
            case REACT_SUSPENSE_LIST_TYPE:
            case REACT_VIEW_TRANSITION_TYPE:
              return object2;
            default:
              switch (object2 = object2 && object2.$$typeof, object2) {
                case REACT_CONTEXT_TYPE:
                case REACT_FORWARD_REF_TYPE:
                case REACT_LAZY_TYPE:
                case REACT_MEMO_TYPE:
                  return object2;
                case REACT_CONSUMER_TYPE:
                  return object2;
                default:
                  return $$typeof;
              }
          }
        case REACT_PORTAL_TYPE:
          return $$typeof;
      }
    }
  }
  reactIs_production.ContextConsumer = REACT_CONSUMER_TYPE;
  reactIs_production.ContextProvider = REACT_CONTEXT_TYPE;
  reactIs_production.Element = REACT_ELEMENT_TYPE;
  reactIs_production.ForwardRef = REACT_FORWARD_REF_TYPE;
  reactIs_production.Fragment = REACT_FRAGMENT_TYPE;
  reactIs_production.Lazy = REACT_LAZY_TYPE;
  reactIs_production.Memo = REACT_MEMO_TYPE;
  reactIs_production.Portal = REACT_PORTAL_TYPE;
  reactIs_production.Profiler = REACT_PROFILER_TYPE;
  reactIs_production.StrictMode = REACT_STRICT_MODE_TYPE;
  reactIs_production.Suspense = REACT_SUSPENSE_TYPE;
  reactIs_production.SuspenseList = REACT_SUSPENSE_LIST_TYPE;
  reactIs_production.isContextConsumer = function(object2) {
    return typeOf2(object2) === REACT_CONSUMER_TYPE;
  };
  reactIs_production.isContextProvider = function(object2) {
    return typeOf2(object2) === REACT_CONTEXT_TYPE;
  };
  reactIs_production.isElement = function(object2) {
    return "object" === typeof object2 && null !== object2 && object2.$$typeof === REACT_ELEMENT_TYPE;
  };
  reactIs_production.isForwardRef = function(object2) {
    return typeOf2(object2) === REACT_FORWARD_REF_TYPE;
  };
  reactIs_production.isFragment = function(object2) {
    return typeOf2(object2) === REACT_FRAGMENT_TYPE;
  };
  reactIs_production.isLazy = function(object2) {
    return typeOf2(object2) === REACT_LAZY_TYPE;
  };
  reactIs_production.isMemo = function(object2) {
    return typeOf2(object2) === REACT_MEMO_TYPE;
  };
  reactIs_production.isPortal = function(object2) {
    return typeOf2(object2) === REACT_PORTAL_TYPE;
  };
  reactIs_production.isProfiler = function(object2) {
    return typeOf2(object2) === REACT_PROFILER_TYPE;
  };
  reactIs_production.isStrictMode = function(object2) {
    return typeOf2(object2) === REACT_STRICT_MODE_TYPE;
  };
  reactIs_production.isSuspense = function(object2) {
    return typeOf2(object2) === REACT_SUSPENSE_TYPE;
  };
  reactIs_production.isSuspenseList = function(object2) {
    return typeOf2(object2) === REACT_SUSPENSE_LIST_TYPE;
  };
  reactIs_production.isValidElementType = function(type3) {
    return "string" === typeof type3 || "function" === typeof type3 || type3 === REACT_FRAGMENT_TYPE || type3 === REACT_PROFILER_TYPE || type3 === REACT_STRICT_MODE_TYPE || type3 === REACT_SUSPENSE_TYPE || type3 === REACT_SUSPENSE_LIST_TYPE || "object" === typeof type3 && null !== type3 && (type3.$$typeof === REACT_LAZY_TYPE || type3.$$typeof === REACT_MEMO_TYPE || type3.$$typeof === REACT_CONTEXT_TYPE || type3.$$typeof === REACT_CONSUMER_TYPE || type3.$$typeof === REACT_FORWARD_REF_TYPE || type3.$$typeof === REACT_CLIENT_REFERENCE || void 0 !== type3.getModuleId) ? true : false;
  };
  reactIs_production.typeOf = typeOf2;
  return reactIs_production;
}
var hasRequiredReactIs$1;
function requireReactIs$1() {
  if (hasRequiredReactIs$1) return reactIs$1.exports;
  hasRequiredReactIs$1 = 1;
  {
    reactIs$1.exports = requireReactIs_production();
  }
  return reactIs$1.exports;
}
var reactIsExports$1 = requireReactIs$1();
var index$1 = /* @__PURE__ */ getDefaultExportFromCjs(reactIsExports$1);
var ReactIs19 = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: index$1
}, [reactIsExports$1]);
var reactIs = { exports: {} };
var reactIs_production_min = {};
var hasRequiredReactIs_production_min;
function requireReactIs_production_min() {
  if (hasRequiredReactIs_production_min) return reactIs_production_min;
  hasRequiredReactIs_production_min = 1;
  var b3 = /* @__PURE__ */ Symbol.for("react.element"), c2 = /* @__PURE__ */ Symbol.for("react.portal"), d3 = /* @__PURE__ */ Symbol.for("react.fragment"), e3 = /* @__PURE__ */ Symbol.for("react.strict_mode"), f2 = /* @__PURE__ */ Symbol.for("react.profiler"), g2 = /* @__PURE__ */ Symbol.for("react.provider"), h2 = /* @__PURE__ */ Symbol.for("react.context"), k2 = /* @__PURE__ */ Symbol.for("react.server_context"), l2 = /* @__PURE__ */ Symbol.for("react.forward_ref"), m2 = /* @__PURE__ */ Symbol.for("react.suspense"), n2 = /* @__PURE__ */ Symbol.for("react.suspense_list"), p2 = /* @__PURE__ */ Symbol.for("react.memo"), q = /* @__PURE__ */ Symbol.for("react.lazy"), t = /* @__PURE__ */ Symbol.for("react.offscreen"), u2;
  u2 = /* @__PURE__ */ Symbol.for("react.module.reference");
  function v2(a2) {
    if ("object" === typeof a2 && null !== a2) {
      var r2 = a2.$$typeof;
      switch (r2) {
        case b3:
          switch (a2 = a2.type, a2) {
            case d3:
            case f2:
            case e3:
            case m2:
            case n2:
              return a2;
            default:
              switch (a2 = a2 && a2.$$typeof, a2) {
                case k2:
                case h2:
                case l2:
                case q:
                case p2:
                case g2:
                  return a2;
                default:
                  return r2;
              }
          }
        case c2:
          return r2;
      }
    }
  }
  reactIs_production_min.ContextConsumer = h2;
  reactIs_production_min.ContextProvider = g2;
  reactIs_production_min.Element = b3;
  reactIs_production_min.ForwardRef = l2;
  reactIs_production_min.Fragment = d3;
  reactIs_production_min.Lazy = q;
  reactIs_production_min.Memo = p2;
  reactIs_production_min.Portal = c2;
  reactIs_production_min.Profiler = f2;
  reactIs_production_min.StrictMode = e3;
  reactIs_production_min.Suspense = m2;
  reactIs_production_min.SuspenseList = n2;
  reactIs_production_min.isAsyncMode = function() {
    return false;
  };
  reactIs_production_min.isConcurrentMode = function() {
    return false;
  };
  reactIs_production_min.isContextConsumer = function(a2) {
    return v2(a2) === h2;
  };
  reactIs_production_min.isContextProvider = function(a2) {
    return v2(a2) === g2;
  };
  reactIs_production_min.isElement = function(a2) {
    return "object" === typeof a2 && null !== a2 && a2.$$typeof === b3;
  };
  reactIs_production_min.isForwardRef = function(a2) {
    return v2(a2) === l2;
  };
  reactIs_production_min.isFragment = function(a2) {
    return v2(a2) === d3;
  };
  reactIs_production_min.isLazy = function(a2) {
    return v2(a2) === q;
  };
  reactIs_production_min.isMemo = function(a2) {
    return v2(a2) === p2;
  };
  reactIs_production_min.isPortal = function(a2) {
    return v2(a2) === c2;
  };
  reactIs_production_min.isProfiler = function(a2) {
    return v2(a2) === f2;
  };
  reactIs_production_min.isStrictMode = function(a2) {
    return v2(a2) === e3;
  };
  reactIs_production_min.isSuspense = function(a2) {
    return v2(a2) === m2;
  };
  reactIs_production_min.isSuspenseList = function(a2) {
    return v2(a2) === n2;
  };
  reactIs_production_min.isValidElementType = function(a2) {
    return "string" === typeof a2 || "function" === typeof a2 || a2 === d3 || a2 === f2 || a2 === e3 || a2 === m2 || a2 === n2 || a2 === t || "object" === typeof a2 && null !== a2 && (a2.$$typeof === q || a2.$$typeof === p2 || a2.$$typeof === g2 || a2.$$typeof === h2 || a2.$$typeof === l2 || a2.$$typeof === u2 || void 0 !== a2.getModuleId) ? true : false;
  };
  reactIs_production_min.typeOf = v2;
  return reactIs_production_min;
}
var hasRequiredReactIs;
function requireReactIs() {
  if (hasRequiredReactIs) return reactIs.exports;
  hasRequiredReactIs = 1;
  {
    reactIs.exports = requireReactIs_production_min();
  }
  return reactIs.exports;
}
var reactIsExports = requireReactIs();
var index = /* @__PURE__ */ getDefaultExportFromCjs(reactIsExports);
var ReactIs18 = /* @__PURE__ */ _mergeNamespaces({
  __proto__: null,
  default: index
}, [reactIsExports]);
var reactIsMethods = [
  "isAsyncMode",
  "isConcurrentMode",
  "isContextConsumer",
  "isContextProvider",
  "isElement",
  "isForwardRef",
  "isFragment",
  "isLazy",
  "isMemo",
  "isPortal",
  "isProfiler",
  "isStrictMode",
  "isSuspense",
  "isSuspenseList",
  "isValidElementType"
];
var ReactIs = Object.fromEntries(reactIsMethods.map((m2) => [m2, (v2) => ReactIs18[m2](v2) || ReactIs19[m2](v2)]));
function getChildren(arg, children = []) {
  if (Array.isArray(arg)) {
    for (const item of arg) {
      getChildren(item, children);
    }
  } else if (arg != null && arg !== false && arg !== "") {
    children.push(arg);
  }
  return children;
}
function getType(element) {
  const type3 = element.type;
  if (typeof type3 === "string") {
    return type3;
  }
  if (typeof type3 === "function") {
    return type3.displayName || type3.name || "Unknown";
  }
  if (ReactIs.isFragment(element)) {
    return "React.Fragment";
  }
  if (ReactIs.isSuspense(element)) {
    return "React.Suspense";
  }
  if (typeof type3 === "object" && type3 !== null) {
    if (ReactIs.isContextProvider(element)) {
      return "Context.Provider";
    }
    if (ReactIs.isContextConsumer(element)) {
      return "Context.Consumer";
    }
    if (ReactIs.isForwardRef(element)) {
      if (type3.displayName) {
        return type3.displayName;
      }
      const functionName2 = type3.render.displayName || type3.render.name || "";
      return functionName2 === "" ? "ForwardRef" : `ForwardRef(${functionName2})`;
    }
    if (ReactIs.isMemo(element)) {
      const functionName2 = type3.displayName || type3.type.displayName || type3.type.name || "";
      return functionName2 === "" ? "Memo" : `Memo(${functionName2})`;
    }
  }
  return "UNDEFINED";
}
function getPropKeys$1(element) {
  const { props } = element;
  return Object.keys(props).filter((key) => key !== "children" && props[key] !== void 0).sort();
}
var serialize$1 = (element, config2, indentation, depth, refs, printer2) => ++depth > config2.maxDepth ? printElementAsLeaf(getType(element), config2) : printElement(getType(element), printProps(getPropKeys$1(element), element.props, config2, indentation + config2.indent, depth, refs, printer2), printChildren(getChildren(element.props.children), config2, indentation + config2.indent, depth, refs, printer2), config2, indentation);
var test$1 = (val) => val != null && ReactIs.isElement(val);
var plugin$1 = {
  serialize: serialize$1,
  test: test$1
};
var testSymbol = typeof Symbol === "function" && Symbol.for ? /* @__PURE__ */ Symbol.for("react.test.json") : 245830487;
function getPropKeys(object2) {
  const { props } = object2;
  return props ? Object.keys(props).filter((key) => props[key] !== void 0).sort() : [];
}
var serialize = (object2, config2, indentation, depth, refs, printer2) => ++depth > config2.maxDepth ? printElementAsLeaf(object2.type, config2) : printElement(object2.type, object2.props ? printProps(getPropKeys(object2), object2.props, config2, indentation + config2.indent, depth, refs, printer2) : "", object2.children ? printChildren(object2.children, config2, indentation + config2.indent, depth, refs, printer2) : "", config2, indentation);
var test = (val) => val && val.$$typeof === testSymbol;
var plugin = {
  serialize,
  test
};
var toString = Object.prototype.toString;
var toISOString = Date.prototype.toISOString;
var errorToString = Error.prototype.toString;
var regExpToString = RegExp.prototype.toString;
function getConstructorName(val) {
  return typeof val.constructor === "function" && val.constructor.name || "Object";
}
function isWindow(val) {
  return typeof window !== "undefined" && val === window;
}
var SYMBOL_REGEXP = /^Symbol\((.*)\)(.*)$/;
var NEWLINE_REGEXP = /\n/g;
var PrettyFormatPluginError = class extends Error {
  constructor(message, stack) {
    super(message);
    this.stack = stack;
    this.name = this.constructor.name;
  }
};
function isToStringedArrayType(toStringed) {
  return toStringed === "[object Array]" || toStringed === "[object ArrayBuffer]" || toStringed === "[object DataView]" || toStringed === "[object Float32Array]" || toStringed === "[object Float64Array]" || toStringed === "[object Int8Array]" || toStringed === "[object Int16Array]" || toStringed === "[object Int32Array]" || toStringed === "[object Uint8Array]" || toStringed === "[object Uint8ClampedArray]" || toStringed === "[object Uint16Array]" || toStringed === "[object Uint32Array]";
}
function printNumber(val) {
  return Object.is(val, -0) ? "-0" : String(val);
}
function printBigInt(val) {
  return String(`${val}n`);
}
function printFunction(val, printFunctionName2) {
  if (!printFunctionName2) {
    return "[Function]";
  }
  return `[Function ${val.name || "anonymous"}]`;
}
function printSymbol(val) {
  return String(val).replace(SYMBOL_REGEXP, "Symbol($1)");
}
function printError(val) {
  return `[${errorToString.call(val)}]`;
}
function printBasicValue(val, printFunctionName2, escapeRegex2, escapeString) {
  if (val === true || val === false) {
    return `${val}`;
  }
  if (val === void 0) {
    return "undefined";
  }
  if (val === null) {
    return "null";
  }
  const typeOf2 = typeof val;
  if (typeOf2 === "number") {
    return printNumber(val);
  }
  if (typeOf2 === "bigint") {
    return printBigInt(val);
  }
  if (typeOf2 === "string") {
    if (escapeString) {
      return `"${val.replaceAll(/"|\\/g, "\\$&")}"`;
    }
    return `"${val}"`;
  }
  if (typeOf2 === "function") {
    return printFunction(val, printFunctionName2);
  }
  if (typeOf2 === "symbol") {
    return printSymbol(val);
  }
  const toStringed = toString.call(val);
  if (toStringed === "[object WeakMap]") {
    return "WeakMap {}";
  }
  if (toStringed === "[object WeakSet]") {
    return "WeakSet {}";
  }
  if (toStringed === "[object Function]" || toStringed === "[object GeneratorFunction]") {
    return printFunction(val, printFunctionName2);
  }
  if (toStringed === "[object Symbol]") {
    return printSymbol(val);
  }
  if (toStringed === "[object Date]") {
    return Number.isNaN(+val) ? "Date { NaN }" : toISOString.call(val);
  }
  if (toStringed === "[object Error]") {
    return printError(val);
  }
  if (toStringed === "[object RegExp]") {
    if (escapeRegex2) {
      return regExpToString.call(val).replaceAll(/[$()*+.?[\\\]^{|}]/g, "\\$&");
    }
    return regExpToString.call(val);
  }
  if (val instanceof Error) {
    return printError(val);
  }
  return null;
}
function printComplexValue(val, config2, indentation, depth, refs, hasCalledToJSON) {
  if (refs.includes(val)) {
    return "[Circular]";
  }
  refs = [...refs];
  refs.push(val);
  const hitMaxDepth = ++depth > config2.maxDepth;
  const min = config2.min;
  if (config2.callToJSON && !hitMaxDepth && val.toJSON && typeof val.toJSON === "function" && !hasCalledToJSON) {
    return printer(val.toJSON(), config2, indentation, depth, refs, true);
  }
  const toStringed = toString.call(val);
  if (toStringed === "[object Arguments]") {
    return hitMaxDepth ? "[Arguments]" : `${min ? "" : "Arguments "}[${printListItems(val, config2, indentation, depth, refs, printer)}]`;
  }
  if (isToStringedArrayType(toStringed)) {
    return hitMaxDepth ? `[${val.constructor.name}]` : `${min ? "" : !config2.printBasicPrototype && val.constructor.name === "Array" ? "" : `${val.constructor.name} `}[${printListItems(val, config2, indentation, depth, refs, printer)}]`;
  }
  if (toStringed === "[object Map]") {
    return hitMaxDepth ? "[Map]" : `Map {${printIteratorEntries(val.entries(), config2, indentation, depth, refs, printer, " => ")}}`;
  }
  if (toStringed === "[object Set]") {
    return hitMaxDepth ? "[Set]" : `Set {${printIteratorValues(val.values(), config2, indentation, depth, refs, printer)}}`;
  }
  return hitMaxDepth || isWindow(val) ? `[${getConstructorName(val)}]` : `${min ? "" : !config2.printBasicPrototype && getConstructorName(val) === "Object" ? "" : `${getConstructorName(val)} `}{${printObjectProperties(val, config2, indentation, depth, refs, printer)}}`;
}
var ErrorPlugin = {
  test: (val) => val && val instanceof Error,
  serialize(val, config2, indentation, depth, refs, printer2) {
    if (refs.includes(val)) {
      return "[Circular]";
    }
    refs = [...refs, val];
    const hitMaxDepth = ++depth > config2.maxDepth;
    const { message, cause, ...rest } = val;
    const entries = {
      message,
      ...typeof cause !== "undefined" ? { cause } : {},
      ...val instanceof AggregateError ? { errors: val.errors } : {},
      ...rest
    };
    const name = val.name !== "Error" ? val.name : getConstructorName(val);
    return hitMaxDepth ? `[${name}]` : `${name} {${printIteratorEntries(Object.entries(entries).values(), config2, indentation, depth, refs, printer2)}}`;
  }
};
function isNewPlugin(plugin3) {
  return plugin3.serialize != null;
}
function printPlugin(plugin3, val, config2, indentation, depth, refs) {
  let printed;
  try {
    printed = isNewPlugin(plugin3) ? plugin3.serialize(val, config2, indentation, depth, refs, printer) : plugin3.print(val, (valChild) => printer(valChild, config2, indentation, depth, refs), (str) => {
      const indentationNext = indentation + config2.indent;
      return indentationNext + str.replaceAll(NEWLINE_REGEXP, `
${indentationNext}`);
    }, {
      edgeSpacing: config2.spacingOuter,
      min: config2.min,
      spacing: config2.spacingInner
    }, config2.colors);
  } catch (error) {
    throw new PrettyFormatPluginError(error.message, error.stack);
  }
  if (typeof printed !== "string") {
    throw new TypeError(`pretty-format: Plugin must return type "string" but instead returned "${typeof printed}".`);
  }
  return printed;
}
function findPlugin(plugins2, val) {
  for (const plugin3 of plugins2) {
    try {
      if (plugin3.test(val)) {
        return plugin3;
      }
    } catch (error) {
      throw new PrettyFormatPluginError(error.message, error.stack);
    }
  }
  return null;
}
function printer(val, config2, indentation, depth, refs, hasCalledToJSON) {
  let result;
  const plugin3 = findPlugin(config2.plugins, val);
  if (plugin3 !== null) {
    result = printPlugin(plugin3, val, config2, indentation, depth, refs);
  } else {
    const basicResult = printBasicValue(val, config2.printFunctionName, config2.escapeRegex, config2.escapeString);
    if (basicResult !== null) {
      result = basicResult;
    } else {
      result = printComplexValue(val, config2, indentation, depth, refs, hasCalledToJSON);
    }
  }
  config2._outputLengthPerDepth[depth] ??= 0;
  config2._outputLengthPerDepth[depth] += result.length;
  if (config2._outputLengthPerDepth[depth] > config2.maxOutputLength) {
    config2.maxDepth = 0;
  }
  return result;
}
var DEFAULT_THEME = {
  comment: "gray",
  content: "reset",
  prop: "yellow",
  tag: "cyan",
  value: "green"
};
var DEFAULT_THEME_KEYS = Object.keys(DEFAULT_THEME);
var DEFAULT_OPTIONS = {
  callToJSON: true,
  compareKeys: void 0,
  escapeRegex: false,
  escapeString: true,
  highlight: false,
  indent: 2,
  maxDepth: Number.POSITIVE_INFINITY,
  maxOutputLength: 1e6,
  maxWidth: Number.POSITIVE_INFINITY,
  min: false,
  plugins: [],
  printBasicPrototype: true,
  printFunctionName: true,
  printShadowRoot: true,
  theme: DEFAULT_THEME
};
function validateOptions(options) {
  for (const key of Object.keys(options)) {
    if (!Object.hasOwn(DEFAULT_OPTIONS, key)) {
      throw new Error(`pretty-format: Unknown option "${key}".`);
    }
  }
  if (options.min && options.indent !== void 0 && options.indent !== 0) {
    throw new Error('pretty-format: Options "min" and "indent" cannot be used together.');
  }
}
function getColorsHighlight() {
  return DEFAULT_THEME_KEYS.reduce((colors, key) => {
    const value = DEFAULT_THEME[key];
    const color = value && y[value];
    if (color && typeof color.close === "string" && typeof color.open === "string") {
      colors[key] = color;
    } else {
      throw new Error(`pretty-format: Option "theme" has a key "${key}" whose value "${value}" is undefined in ansi-styles.`);
    }
    return colors;
  }, /* @__PURE__ */ Object.create(null));
}
function getColorsEmpty() {
  return DEFAULT_THEME_KEYS.reduce((colors, key) => {
    colors[key] = {
      close: "",
      open: ""
    };
    return colors;
  }, /* @__PURE__ */ Object.create(null));
}
function getPrintFunctionName(options) {
  return options?.printFunctionName ?? DEFAULT_OPTIONS.printFunctionName;
}
function getEscapeRegex(options) {
  return options?.escapeRegex ?? DEFAULT_OPTIONS.escapeRegex;
}
function getEscapeString(options) {
  return options?.escapeString ?? DEFAULT_OPTIONS.escapeString;
}
function getConfig(options) {
  return {
    callToJSON: options?.callToJSON ?? DEFAULT_OPTIONS.callToJSON,
    colors: options?.highlight ? getColorsHighlight() : getColorsEmpty(),
    compareKeys: typeof options?.compareKeys === "function" || options?.compareKeys === null ? options.compareKeys : DEFAULT_OPTIONS.compareKeys,
    escapeRegex: getEscapeRegex(options),
    escapeString: getEscapeString(options),
    indent: options?.min ? "" : createIndent(options?.indent ?? DEFAULT_OPTIONS.indent),
    maxDepth: options?.maxDepth ?? DEFAULT_OPTIONS.maxDepth,
    maxWidth: options?.maxWidth ?? DEFAULT_OPTIONS.maxWidth,
    min: options?.min ?? DEFAULT_OPTIONS.min,
    plugins: options?.plugins ?? DEFAULT_OPTIONS.plugins,
    printBasicPrototype: options?.printBasicPrototype ?? true,
    printFunctionName: getPrintFunctionName(options),
    printShadowRoot: options?.printShadowRoot ?? true,
    spacingInner: options?.min ? " " : "\n",
    spacingOuter: options?.min ? "" : "\n",
    maxOutputLength: options?.maxOutputLength ?? DEFAULT_OPTIONS.maxOutputLength,
    _outputLengthPerDepth: []
  };
}
function createIndent(indent) {
  return Array.from({ length: indent + 1 }).join(" ");
}
function format(val, options) {
  if (options) {
    validateOptions(options);
    if (options.plugins) {
      const plugin3 = findPlugin(options.plugins, val);
      if (plugin3 !== null) {
        return printPlugin(plugin3, val, getConfig(options), "", 0, []);
      }
    }
  }
  const basicResult = printBasicValue(val, getPrintFunctionName(options), getEscapeRegex(options), getEscapeString(options));
  if (basicResult !== null) {
    return basicResult;
  }
  return printComplexValue(val, getConfig(options), "", 0, []);
}
var plugins = {
  AsymmetricMatcher: plugin$5,
  DOMCollection: plugin$4,
  DOMElement: plugin$3,
  Immutable: plugin$2,
  ReactElement: plugin$1,
  ReactTestComponent: plugin,
  Error: ErrorPlugin
};

// ../../node_modules/.pnpm/@vitest+utils@4.1.2/node_modules/@vitest/utils/dist/display.js
var ansiColors = {
  bold: ["1", "22"],
  dim: ["2", "22"],
  italic: ["3", "23"],
  underline: ["4", "24"],
  // 5 & 6 are blinking
  inverse: ["7", "27"],
  hidden: ["8", "28"],
  strike: ["9", "29"],
  // 10-20 are fonts
  // 21-29 are resets for 1-9
  black: ["30", "39"],
  red: ["31", "39"],
  green: ["32", "39"],
  yellow: ["33", "39"],
  blue: ["34", "39"],
  magenta: ["35", "39"],
  cyan: ["36", "39"],
  white: ["37", "39"],
  brightblack: ["30;1", "39"],
  brightred: ["31;1", "39"],
  brightgreen: ["32;1", "39"],
  brightyellow: ["33;1", "39"],
  brightblue: ["34;1", "39"],
  brightmagenta: ["35;1", "39"],
  brightcyan: ["36;1", "39"],
  brightwhite: ["37;1", "39"],
  grey: ["90", "39"]
};
var styles = {
  special: "cyan",
  number: "yellow",
  bigint: "yellow",
  boolean: "yellow",
  undefined: "grey",
  null: "bold",
  string: "green",
  symbol: "green",
  date: "magenta",
  regexp: "red"
};
var truncator = "\u2026";
function colorise(value, styleType) {
  const color = ansiColors[styles[styleType]] || ansiColors[styleType] || "";
  if (!color) {
    return String(value);
  }
  return `\x1B[${color[0]}m${String(value)}\x1B[${color[1]}m`;
}
function normaliseOptions({
  showHidden = false,
  depth = 2,
  colors = false,
  customInspect = true,
  showProxy = false,
  maxArrayLength = Infinity,
  breakLength = Infinity,
  seen = [],
  // eslint-disable-next-line no-shadow
  truncate: truncate3 = Infinity,
  stylize = String
} = {}, inspect3) {
  const options = {
    showHidden: Boolean(showHidden),
    depth: Number(depth),
    colors: Boolean(colors),
    customInspect: Boolean(customInspect),
    showProxy: Boolean(showProxy),
    maxArrayLength: Number(maxArrayLength),
    breakLength: Number(breakLength),
    truncate: Number(truncate3),
    seen,
    inspect: inspect3,
    stylize
  };
  if (options.colors) {
    options.stylize = colorise;
  }
  return options;
}
function isHighSurrogate(char) {
  return char >= "\uD800" && char <= "\uDBFF";
}
function truncate(string2, length, tail = truncator) {
  string2 = String(string2);
  const tailLength = tail.length;
  const stringLength = string2.length;
  if (tailLength > length && stringLength > tailLength) {
    return tail;
  }
  if (stringLength > length && stringLength > tailLength) {
    let end = length - tailLength;
    if (end > 0 && isHighSurrogate(string2[end - 1])) {
      end = end - 1;
    }
    return `${string2.slice(0, end)}${tail}`;
  }
  return string2;
}
function inspectList(list, options, inspectItem, separator = ", ") {
  inspectItem = inspectItem || options.inspect;
  const size = list.length;
  if (size === 0)
    return "";
  const originalLength = options.truncate;
  let output = "";
  let peek = "";
  let truncated = "";
  for (let i3 = 0; i3 < size; i3 += 1) {
    const last = i3 + 1 === list.length;
    const secondToLast = i3 + 2 === list.length;
    truncated = `${truncator}(${list.length - i3})`;
    const value = list[i3];
    options.truncate = originalLength - output.length - (last ? 0 : separator.length);
    const string2 = peek || inspectItem(value, options) + (last ? "" : separator);
    const nextLength = output.length + string2.length;
    const truncatedLength = nextLength + truncated.length;
    if (last && nextLength > originalLength && output.length + truncated.length <= originalLength) {
      break;
    }
    if (!last && !secondToLast && truncatedLength > originalLength) {
      break;
    }
    peek = last ? "" : inspectItem(list[i3 + 1], options) + (secondToLast ? "" : separator);
    if (!last && secondToLast && truncatedLength > originalLength && nextLength + peek.length > originalLength) {
      break;
    }
    output += string2;
    if (!last && !secondToLast && nextLength + peek.length >= originalLength) {
      truncated = `${truncator}(${list.length - i3 - 1})`;
      break;
    }
    truncated = "";
  }
  return `${output}${truncated}`;
}
function quoteComplexKey(key) {
  if (key.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/)) {
    return key;
  }
  return JSON.stringify(key).replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
}
function inspectProperty([key, value], options) {
  options.truncate -= 2;
  if (typeof key === "string") {
    key = quoteComplexKey(key);
  } else if (typeof key !== "number") {
    key = `[${options.inspect(key, options)}]`;
  }
  options.truncate -= key.length;
  value = options.inspect(value, options);
  return `${key}: ${value}`;
}
function inspectArray(array2, options) {
  const nonIndexProperties = Object.keys(array2).slice(array2.length);
  if (!array2.length && !nonIndexProperties.length)
    return "[]";
  options.truncate -= 4;
  const listContents = inspectList(array2, options);
  options.truncate -= listContents.length;
  let propertyContents = "";
  if (nonIndexProperties.length) {
    propertyContents = inspectList(nonIndexProperties.map((key) => [key, array2[key]]), options, inspectProperty);
  }
  return `[ ${listContents}${propertyContents ? `, ${propertyContents}` : ""} ]`;
}
var getArrayName = (array2) => {
  if (typeof Buffer === "function" && array2 instanceof Buffer) {
    return "Buffer";
  }
  if (array2[Symbol.toStringTag]) {
    return array2[Symbol.toStringTag];
  }
  return array2.constructor.name;
};
function inspectTypedArray(array2, options) {
  const name = getArrayName(array2);
  options.truncate -= name.length + 4;
  const nonIndexProperties = Object.keys(array2).slice(array2.length);
  if (!array2.length && !nonIndexProperties.length)
    return `${name}[]`;
  let output = "";
  for (let i3 = 0; i3 < array2.length; i3++) {
    const string2 = `${options.stylize(truncate(array2[i3], options.truncate), "number")}${i3 === array2.length - 1 ? "" : ", "}`;
    options.truncate -= string2.length;
    if (array2[i3] !== array2.length && options.truncate <= 3) {
      output += `${truncator}(${array2.length - array2[i3] + 1})`;
      break;
    }
    output += string2;
  }
  let propertyContents = "";
  if (nonIndexProperties.length) {
    propertyContents = inspectList(nonIndexProperties.map((key) => [key, array2[key]]), options, inspectProperty);
  }
  return `${name}[ ${output}${propertyContents ? `, ${propertyContents}` : ""} ]`;
}
function inspectDate(dateObject, options) {
  const stringRepresentation = dateObject.toJSON();
  if (stringRepresentation === null) {
    return "Invalid Date";
  }
  const split = stringRepresentation.split("T");
  const date = split[0];
  return options.stylize(`${date}T${truncate(split[1], options.truncate - date.length - 1)}`, "date");
}
function inspectFunction(func, options) {
  const functionType = func[Symbol.toStringTag] || "Function";
  const name = func.name;
  if (!name) {
    return options.stylize(`[${functionType}]`, "special");
  }
  return options.stylize(`[${functionType} ${truncate(name, options.truncate - 11)}]`, "special");
}
function inspectMapEntry([key, value], options) {
  options.truncate -= 4;
  key = options.inspect(key, options);
  options.truncate -= key.length;
  value = options.inspect(value, options);
  return `${key} => ${value}`;
}
function mapToEntries(map2) {
  const entries = [];
  map2.forEach((value, key) => {
    entries.push([key, value]);
  });
  return entries;
}
function inspectMap(map2, options) {
  if (map2.size === 0)
    return "Map{}";
  options.truncate -= 7;
  return `Map{ ${inspectList(mapToEntries(map2), options, inspectMapEntry)} }`;
}
var isNaN = Number.isNaN || ((i3) => i3 !== i3);
function inspectNumber(number, options) {
  if (isNaN(number)) {
    return options.stylize("NaN", "number");
  }
  if (number === Infinity) {
    return options.stylize("Infinity", "number");
  }
  if (number === -Infinity) {
    return options.stylize("-Infinity", "number");
  }
  if (number === 0) {
    return options.stylize(1 / number === Infinity ? "+0" : "-0", "number");
  }
  return options.stylize(truncate(String(number), options.truncate), "number");
}
function inspectBigInt(number, options) {
  let nums = truncate(number.toString(), options.truncate - 1);
  if (nums !== truncator)
    nums += "n";
  return options.stylize(nums, "bigint");
}
function inspectRegExp(value, options) {
  const flags = value.toString().split("/")[2];
  const sourceLength = options.truncate - (2 + flags.length);
  const source = value.source;
  return options.stylize(`/${truncate(source, sourceLength)}/${flags}`, "regexp");
}
function arrayFromSet(set3) {
  const values = [];
  set3.forEach((value) => {
    values.push(value);
  });
  return values;
}
function inspectSet(set3, options) {
  if (set3.size === 0)
    return "Set{}";
  options.truncate -= 7;
  return `Set{ ${inspectList(arrayFromSet(set3), options)} }`;
}
var stringEscapeChars = new RegExp("['\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u0600-\\u0604\\u070f\\u17b4\\u17b5\\u200c-\\u200f\\u2028-\\u202f\\u2060-\\u206f\\ufeff\\ufff0-\\uffff]", "g");
var escapeCharacters = {
  "\b": "\\b",
  "	": "\\t",
  "\n": "\\n",
  "\f": "\\f",
  "\r": "\\r",
  "'": "\\'",
  "\\": "\\\\"
};
var hex = 16;
function escape(char) {
  return escapeCharacters[char] || `\\u${`0000${char.charCodeAt(0).toString(hex)}`.slice(-4)}`;
}
function inspectString(string2, options) {
  if (stringEscapeChars.test(string2)) {
    string2 = string2.replace(stringEscapeChars, escape);
  }
  return options.stylize(`'${truncate(string2, options.truncate - 2)}'`, "string");
}
function inspectSymbol(value) {
  if ("description" in Symbol.prototype) {
    return value.description ? `Symbol(${value.description})` : "Symbol()";
  }
  return value.toString();
}
var getPromiseValue = () => "Promise{\u2026}";
function inspectObject$1(object2, options) {
  const properties = Object.getOwnPropertyNames(object2);
  const symbols = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(object2) : [];
  if (properties.length === 0 && symbols.length === 0) {
    return "{}";
  }
  options.truncate -= 4;
  options.seen = options.seen || [];
  if (options.seen.includes(object2)) {
    return "[Circular]";
  }
  options.seen.push(object2);
  const propertyContents = inspectList(properties.map((key) => [key, object2[key]]), options, inspectProperty);
  const symbolContents = inspectList(symbols.map((key) => [key, object2[key]]), options, inspectProperty);
  options.seen.pop();
  let sep = "";
  if (propertyContents && symbolContents) {
    sep = ", ";
  }
  return `{ ${propertyContents}${sep}${symbolContents} }`;
}
var toStringTag = typeof Symbol !== "undefined" && Symbol.toStringTag ? Symbol.toStringTag : false;
function inspectClass(value, options) {
  let name = "";
  if (toStringTag && toStringTag in value) {
    name = value[toStringTag];
  }
  name = name || value.constructor.name;
  if (!name || name === "_class") {
    name = "<Anonymous Class>";
  }
  options.truncate -= name.length;
  return `${name}${inspectObject$1(value, options)}`;
}
function inspectArguments(args, options) {
  if (args.length === 0)
    return "Arguments[]";
  options.truncate -= 13;
  return `Arguments[ ${inspectList(args, options)} ]`;
}
var errorKeys = [
  "stack",
  "line",
  "column",
  "name",
  "message",
  "fileName",
  "lineNumber",
  "columnNumber",
  "number",
  "description",
  "cause"
];
function inspectObject(error, options) {
  const properties = Object.getOwnPropertyNames(error).filter((key) => errorKeys.indexOf(key) === -1);
  const name = error.name;
  options.truncate -= name.length;
  let message = "";
  if (typeof error.message === "string") {
    message = truncate(error.message, options.truncate);
  } else {
    properties.unshift("message");
  }
  message = message ? `: ${message}` : "";
  options.truncate -= message.length + 5;
  options.seen = options.seen || [];
  if (options.seen.includes(error)) {
    return "[Circular]";
  }
  options.seen.push(error);
  const propertyContents = inspectList(properties.map((key) => [key, error[key]]), options, inspectProperty);
  return `${name}${message}${propertyContents ? ` { ${propertyContents} }` : ""}`;
}
function inspectAttribute([key, value], options) {
  options.truncate -= 3;
  if (!value) {
    return `${options.stylize(String(key), "yellow")}`;
  }
  return `${options.stylize(String(key), "yellow")}=${options.stylize(`"${value}"`, "string")}`;
}
function inspectNodeCollection(collection, options) {
  return inspectList(collection, options, inspectNode, "\n");
}
function inspectNode(node, options) {
  switch (node.nodeType) {
    case 1:
      return inspectHTML(node, options);
    case 3:
      return options.inspect(node.data, options);
    default:
      return options.inspect(node, options);
  }
}
function inspectHTML(element, options) {
  const properties = element.getAttributeNames();
  const name = element.tagName.toLowerCase();
  const head = options.stylize(`<${name}`, "special");
  const headClose = options.stylize(`>`, "special");
  const tail = options.stylize(`</${name}>`, "special");
  options.truncate -= name.length * 2 + 5;
  let propertyContents = "";
  if (properties.length > 0) {
    propertyContents += " ";
    propertyContents += inspectList(properties.map((key) => [key, element.getAttribute(key)]), options, inspectAttribute, " ");
  }
  options.truncate -= propertyContents.length;
  const truncate3 = options.truncate;
  let children = inspectNodeCollection(element.children, options);
  if (children && children.length > truncate3) {
    children = `${truncator}(${element.children.length})`;
  }
  return `${head}${propertyContents}${headClose}${children}${tail}`;
}
var symbolsSupported = typeof Symbol === "function" && typeof Symbol.for === "function";
var chaiInspect = symbolsSupported ? /* @__PURE__ */ Symbol.for("chai/inspect") : "@@chai/inspect";
var nodeInspect = /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom");
var constructorMap = /* @__PURE__ */ new WeakMap();
var stringTagMap = {};
var baseTypesMap = {
  undefined: (value, options) => options.stylize("undefined", "undefined"),
  null: (value, options) => options.stylize("null", "null"),
  boolean: (value, options) => options.stylize(String(value), "boolean"),
  Boolean: (value, options) => options.stylize(String(value), "boolean"),
  number: inspectNumber,
  Number: inspectNumber,
  bigint: inspectBigInt,
  BigInt: inspectBigInt,
  string: inspectString,
  String: inspectString,
  function: inspectFunction,
  Function: inspectFunction,
  symbol: inspectSymbol,
  // A Symbol polyfill will return `Symbol` not `symbol` from typedetect
  Symbol: inspectSymbol,
  Array: inspectArray,
  Date: inspectDate,
  Map: inspectMap,
  Set: inspectSet,
  RegExp: inspectRegExp,
  Promise: getPromiseValue,
  // WeakSet, WeakMap are totally opaque to us
  WeakSet: (value, options) => options.stylize("WeakSet{\u2026}", "special"),
  WeakMap: (value, options) => options.stylize("WeakMap{\u2026}", "special"),
  Arguments: inspectArguments,
  Int8Array: inspectTypedArray,
  Uint8Array: inspectTypedArray,
  Uint8ClampedArray: inspectTypedArray,
  Int16Array: inspectTypedArray,
  Uint16Array: inspectTypedArray,
  Int32Array: inspectTypedArray,
  Uint32Array: inspectTypedArray,
  Float32Array: inspectTypedArray,
  Float64Array: inspectTypedArray,
  Generator: () => "",
  DataView: () => "",
  ArrayBuffer: () => "",
  Error: inspectObject,
  HTMLCollection: inspectNodeCollection,
  NodeList: inspectNodeCollection
};
var inspectCustom = (value, options, type3, inspectFn) => {
  if (chaiInspect in value && typeof value[chaiInspect] === "function") {
    return value[chaiInspect](options);
  }
  if (nodeInspect in value && typeof value[nodeInspect] === "function") {
    return value[nodeInspect](options.depth, options, inspectFn);
  }
  if ("inspect" in value && typeof value.inspect === "function") {
    return value.inspect(options.depth, options);
  }
  if ("constructor" in value && constructorMap.has(value.constructor)) {
    return constructorMap.get(value.constructor)(value, options);
  }
  if (stringTagMap[type3]) {
    return stringTagMap[type3](value, options);
  }
  return "";
};
var toString2 = Object.prototype.toString;
function inspect$1(value, opts = {}) {
  const options = normaliseOptions(opts, inspect$1);
  const { customInspect } = options;
  let type3 = value === null ? "null" : typeof value;
  if (type3 === "object") {
    type3 = toString2.call(value).slice(8, -1);
  }
  if (type3 in baseTypesMap) {
    return baseTypesMap[type3](value, options);
  }
  if (customInspect && value) {
    const output = inspectCustom(value, options, type3, inspect$1);
    if (output) {
      if (typeof output === "string")
        return output;
      return inspect$1(output, options);
    }
  }
  const proto = value ? Object.getPrototypeOf(value) : false;
  if (proto === Object.prototype || proto === null) {
    return inspectObject$1(value, options);
  }
  if (value && typeof HTMLElement === "function" && value instanceof HTMLElement) {
    return inspectHTML(value, options);
  }
  if ("constructor" in value) {
    if (value.constructor !== Object) {
      return inspectClass(value, options);
    }
    return inspectObject$1(value, options);
  }
  if (value === Object(value)) {
    return inspectObject$1(value, options);
  }
  return options.stylize(String(value), type3);
}
var { AsymmetricMatcher, DOMCollection, DOMElement, Immutable, ReactElement, ReactTestComponent } = plugins;
var PLUGINS = [
  ReactTestComponent,
  ReactElement,
  DOMElement,
  DOMCollection,
  Immutable,
  AsymmetricMatcher
];
function stringify2(object2, maxDepth = 10, { maxLength, filterNode, ...options } = {}) {
  const MAX_LENGTH = maxLength ?? 1e4;
  let result;
  const filterFn = typeof filterNode === "string" ? createNodeFilterFromSelector(filterNode) : filterNode;
  const plugins2 = filterFn ? [
    ReactTestComponent,
    ReactElement,
    createDOMElementFilter(filterFn),
    DOMCollection,
    Immutable,
    AsymmetricMatcher
  ] : PLUGINS;
  try {
    result = format(object2, {
      maxDepth,
      escapeString: false,
      plugins: plugins2,
      ...options
    });
  } catch {
    result = format(object2, {
      callToJSON: false,
      maxDepth,
      escapeString: false,
      plugins: plugins2,
      ...options
    });
  }
  return result.length >= MAX_LENGTH && maxDepth > 1 ? stringify2(object2, Math.floor(Math.min(maxDepth, Number.MAX_SAFE_INTEGER) / 2), {
    maxLength,
    filterNode,
    ...options
  }) : result;
}
function createNodeFilterFromSelector(selector) {
  const ELEMENT_NODE2 = 1;
  const COMMENT_NODE2 = 8;
  return (node) => {
    if (node.nodeType === COMMENT_NODE2) {
      return false;
    }
    if (node.nodeType === ELEMENT_NODE2 && node.matches) {
      try {
        return !node.matches(selector);
      } catch {
        return true;
      }
    }
    return true;
  };
}
var formatRegExp = /%[sdjifoOc%]/g;
function baseFormat(args, options = {}) {
  const formatArg = (item, inspecOptions) => {
    if (options.prettifyObject) {
      return stringify2(item, void 0, {
        printBasicPrototype: false,
        escapeString: false
      });
    }
    return inspect(item, inspecOptions);
  };
  if (typeof args[0] !== "string") {
    const objects = [];
    for (let i4 = 0; i4 < args.length; i4++) {
      objects.push(formatArg(args[i4], {
        depth: 0,
        colors: false
      }));
    }
    return objects.join(" ");
  }
  const len = args.length;
  let i3 = 1;
  const template = args[0];
  let str = String(template).replace(formatRegExp, (x2) => {
    if (x2 === "%%") {
      return "%";
    }
    if (i3 >= len) {
      return x2;
    }
    switch (x2) {
      case "%s": {
        const value = args[i3++];
        if (typeof value === "bigint") {
          return `${value.toString()}n`;
        }
        if (typeof value === "number" && value === 0 && 1 / value < 0) {
          return "-0";
        }
        if (typeof value === "object" && value !== null) {
          if (typeof value.toString === "function" && value.toString !== Object.prototype.toString) {
            return value.toString();
          }
          return formatArg(value, {
            depth: 0,
            colors: false
          });
        }
        return String(value);
      }
      case "%d": {
        const value = args[i3++];
        if (typeof value === "bigint") {
          return `${value.toString()}n`;
        }
        if (typeof value === "symbol") {
          return "NaN";
        }
        return Number(value).toString();
      }
      case "%i": {
        const value = args[i3++];
        if (typeof value === "bigint") {
          return `${value.toString()}n`;
        }
        return Number.parseInt(String(value)).toString();
      }
      case "%f":
        return Number.parseFloat(String(args[i3++])).toString();
      case "%o":
        return formatArg(args[i3++], {
          showHidden: true,
          showProxy: true
        });
      case "%O":
        return formatArg(args[i3++]);
      case "%c": {
        i3++;
        return "";
      }
      case "%j":
        try {
          return JSON.stringify(args[i3++]);
        } catch (err) {
          const m2 = err.message;
          if (m2.includes("circular structure") || m2.includes("cyclic structures") || m2.includes("cyclic object")) {
            return "[Circular]";
          }
          throw err;
        }
      default:
        return x2;
    }
  });
  for (let x2 = args[i3]; i3 < len; x2 = args[++i3]) {
    if (x2 === null || typeof x2 !== "object") {
      str += ` ${typeof x2 === "symbol" ? x2.toString() : x2}`;
    } else {
      str += ` ${formatArg(x2)}`;
    }
  }
  return str;
}
function format2(...args) {
  return baseFormat(args);
}
function inspect(obj, options = {}) {
  if (options.truncate === 0) {
    options.truncate = Number.POSITIVE_INFINITY;
  }
  return inspect$1(obj, options);
}
function objDisplay(obj, options = {}) {
  if (typeof options.truncate === "undefined") {
    options.truncate = 40;
  }
  const str = inspect(obj, options);
  const type3 = Object.prototype.toString.call(obj);
  if (options.truncate && str.length >= options.truncate) {
    if (type3 === "[object Function]") {
      const fn2 = obj;
      return !fn2.name ? "[Function]" : `[Function: ${fn2.name}]`;
    } else if (type3 === "[object Array]") {
      return `[ Array(${obj.length}) ]`;
    } else if (type3 === "[object Object]") {
      const keys2 = Object.keys(obj);
      const kstr = keys2.length > 2 ? `${keys2.splice(0, 2).join(", ")}, ...` : keys2.join(", ");
      return `{ Object (${kstr}) }`;
    } else {
      return str;
    }
  }
  return str;
}

// ../../node_modules/.pnpm/@vitest+utils@4.1.2/node_modules/@vitest/utils/dist/helpers.js
function createSimpleStackTrace(options) {
  const { message = "$$stack trace error", stackTraceLimit = 1 } = options || {};
  const limit = Error.stackTraceLimit;
  const prepareStackTrace = Error.prepareStackTrace;
  Error.stackTraceLimit = stackTraceLimit;
  Error.prepareStackTrace = (e3) => e3.stack;
  const err = new Error(message);
  const stackTrace = err.stack || "";
  Error.prepareStackTrace = prepareStackTrace;
  Error.stackTraceLimit = limit;
  return stackTrace;
}
function notNullish(v2) {
  return v2 != null;
}
function assertTypes(value, name, types) {
  const receivedType = typeof value;
  const pass = types.includes(receivedType);
  if (!pass) {
    throw new TypeError(`${name} value must be ${types.join(" or ")}, received "${receivedType}"`);
  }
}
function isPrimitive(value) {
  return value === null || typeof value !== "function" && typeof value !== "object";
}
function filterOutComments(s2) {
  const result = [];
  let commentState = "none";
  for (let i3 = 0; i3 < s2.length; ++i3) {
    if (commentState === "singleline") {
      if (s2[i3] === "\n") {
        commentState = "none";
      }
    } else if (commentState === "multiline") {
      if (s2[i3 - 1] === "*" && s2[i3] === "/") {
        commentState = "none";
      }
    } else if (commentState === "none") {
      if (s2[i3] === "/" && s2[i3 + 1] === "/") {
        commentState = "singleline";
      } else if (s2[i3] === "/" && s2[i3 + 1] === "*") {
        commentState = "multiline";
        i3 += 2;
      } else {
        result.push(s2[i3]);
      }
    }
  }
  return result.join("");
}
function toArray(array2) {
  if (array2 === null || array2 === void 0) {
    array2 = [];
  }
  if (Array.isArray(array2)) {
    return array2;
  }
  return [array2];
}
function isObject(item) {
  return item != null && typeof item === "object" && !Array.isArray(item);
}
function isFinalObj(obj) {
  return obj === Object.prototype || obj === Function.prototype || obj === RegExp.prototype;
}
function getType2(value) {
  return Object.prototype.toString.apply(value).slice(8, -1);
}
function collectOwnProperties(obj, collector) {
  const collect = typeof collector === "function" ? collector : (key) => collector.add(key);
  Object.getOwnPropertyNames(obj).forEach(collect);
  Object.getOwnPropertySymbols(obj).forEach(collect);
}
function getOwnProperties(obj) {
  const ownProps = /* @__PURE__ */ new Set();
  if (isFinalObj(obj)) {
    return [];
  }
  collectOwnProperties(obj, ownProps);
  return Array.from(ownProps);
}
var defaultCloneOptions = { forceWritable: false };
function deepClone(val, options = defaultCloneOptions) {
  const seen = /* @__PURE__ */ new WeakMap();
  return clone(val, seen, options);
}
function clone(val, seen, options = defaultCloneOptions) {
  let k2, out;
  if (seen.has(val)) {
    return seen.get(val);
  }
  if (Array.isArray(val)) {
    out = Array.from({ length: k2 = val.length });
    seen.set(val, out);
    while (k2--) {
      out[k2] = clone(val[k2], seen, options);
    }
    return out;
  }
  if (Object.prototype.toString.call(val) === "[object Object]") {
    out = Object.create(Object.getPrototypeOf(val));
    seen.set(val, out);
    const props = getOwnProperties(val);
    for (const k3 of props) {
      const descriptor = Object.getOwnPropertyDescriptor(val, k3);
      if (!descriptor) {
        continue;
      }
      const cloned = clone(val[k3], seen, options);
      if (options.forceWritable) {
        Object.defineProperty(out, k3, {
          enumerable: descriptor.enumerable,
          configurable: true,
          writable: true,
          value: cloned
        });
      } else if ("get" in descriptor) {
        Object.defineProperty(out, k3, {
          ...descriptor,
          get() {
            return cloned;
          }
        });
      } else {
        Object.defineProperty(out, k3, {
          ...descriptor,
          value: cloned
        });
      }
    }
    return out;
  }
  return val;
}
function noop() {
}
function objectAttr(source, path, defaultValue = void 0) {
  const paths = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let result = source;
  for (const p2 of paths) {
    result = new Object(result)[p2];
    if (result === void 0) {
      return defaultValue;
    }
  }
  return result;
}
function createDefer() {
  let resolve2 = null;
  let reject = null;
  const p2 = new Promise((_resolve, _reject) => {
    resolve2 = _resolve;
    reject = _reject;
  });
  p2.resolve = resolve2;
  p2.reject = reject;
  return p2;
}
function getCallLastIndex(code) {
  let charIndex = -1;
  let inString = null;
  let startedBracers = 0;
  let endedBracers = 0;
  let beforeChar = null;
  while (charIndex <= code.length) {
    beforeChar = code[charIndex];
    charIndex++;
    const char = code[charIndex];
    const isCharString = char === '"' || char === "'" || char === "`";
    if (isCharString && beforeChar !== "\\") {
      if (inString === char) {
        inString = null;
      } else if (!inString) {
        inString = char;
      }
    }
    if (!inString) {
      if (char === "(") {
        startedBracers++;
      }
      if (char === ")") {
        endedBracers++;
      }
    }
    if (startedBracers && endedBracers && startedBracers === endedBracers) {
      return charIndex;
    }
  }
  return null;
}
function isNegativeNaN(val) {
  if (!Number.isNaN(val)) {
    return false;
  }
  const f64 = new Float64Array(1);
  f64[0] = val;
  const u32 = new Uint32Array(f64.buffer);
  const isNegative = u32[1] >>> 31 === 1;
  return isNegative;
}
function ordinal(i3) {
  const j2 = i3 % 10;
  const k2 = i3 % 100;
  if (j2 === 1 && k2 !== 11) {
    return `${i3}st`;
  }
  if (j2 === 2 && k2 !== 12) {
    return `${i3}nd`;
  }
  if (j2 === 3 && k2 !== 13) {
    return `${i3}rd`;
  }
  return `${i3}th`;
}
function unique(array2) {
  return Array.from(new Set(array2));
}

// ../../node_modules/.pnpm/@vitest+utils@4.1.2/node_modules/@vitest/utils/dist/diff.js
var DIFF_DELETE = -1;
var DIFF_INSERT = 1;
var DIFF_EQUAL = 0;
var Diff = class {
  0;
  1;
  constructor(op, text) {
    this[0] = op;
    this[1] = text;
  }
};
function diff_commonPrefix(text1, text2) {
  if (!text1 || !text2 || text1.charAt(0) !== text2.charAt(0)) {
    return 0;
  }
  let pointermin = 0;
  let pointermax = Math.min(text1.length, text2.length);
  let pointermid = pointermax;
  let pointerstart = 0;
  while (pointermin < pointermid) {
    if (text1.substring(pointerstart, pointermid) === text2.substring(pointerstart, pointermid)) {
      pointermin = pointermid;
      pointerstart = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
}
function diff_commonSuffix(text1, text2) {
  if (!text1 || !text2 || text1.charAt(text1.length - 1) !== text2.charAt(text2.length - 1)) {
    return 0;
  }
  let pointermin = 0;
  let pointermax = Math.min(text1.length, text2.length);
  let pointermid = pointermax;
  let pointerend = 0;
  while (pointermin < pointermid) {
    if (text1.substring(text1.length - pointermid, text1.length - pointerend) === text2.substring(text2.length - pointermid, text2.length - pointerend)) {
      pointermin = pointermid;
      pointerend = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
}
function diff_commonOverlap_(text1, text2) {
  const text1_length = text1.length;
  const text2_length = text2.length;
  if (text1_length === 0 || text2_length === 0) {
    return 0;
  }
  if (text1_length > text2_length) {
    text1 = text1.substring(text1_length - text2_length);
  } else if (text1_length < text2_length) {
    text2 = text2.substring(0, text1_length);
  }
  const text_length = Math.min(text1_length, text2_length);
  if (text1 === text2) {
    return text_length;
  }
  let best = 0;
  let length = 1;
  while (true) {
    const pattern = text1.substring(text_length - length);
    const found2 = text2.indexOf(pattern);
    if (found2 === -1) {
      return best;
    }
    length += found2;
    if (found2 === 0 || text1.substring(text_length - length) === text2.substring(0, length)) {
      best = length;
      length++;
    }
  }
}
function diff_cleanupSemantic(diffs) {
  let changes = false;
  const equalities = [];
  let equalitiesLength = 0;
  let lastEquality = null;
  let pointer = 0;
  let length_insertions1 = 0;
  let length_deletions1 = 0;
  let length_insertions2 = 0;
  let length_deletions2 = 0;
  while (pointer < diffs.length) {
    if (diffs[pointer][0] === DIFF_EQUAL) {
      equalities[equalitiesLength++] = pointer;
      length_insertions1 = length_insertions2;
      length_deletions1 = length_deletions2;
      length_insertions2 = 0;
      length_deletions2 = 0;
      lastEquality = diffs[pointer][1];
    } else {
      if (diffs[pointer][0] === DIFF_INSERT) {
        length_insertions2 += diffs[pointer][1].length;
      } else {
        length_deletions2 += diffs[pointer][1].length;
      }
      if (lastEquality && lastEquality.length <= Math.max(length_insertions1, length_deletions1) && lastEquality.length <= Math.max(length_insertions2, length_deletions2)) {
        diffs.splice(equalities[equalitiesLength - 1], 0, new Diff(DIFF_DELETE, lastEquality));
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
        equalitiesLength--;
        equalitiesLength--;
        pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
        length_insertions1 = 0;
        length_deletions1 = 0;
        length_insertions2 = 0;
        length_deletions2 = 0;
        lastEquality = null;
        changes = true;
      }
    }
    pointer++;
  }
  if (changes) {
    diff_cleanupMerge(diffs);
  }
  diff_cleanupSemanticLossless(diffs);
  pointer = 1;
  while (pointer < diffs.length) {
    if (diffs[pointer - 1][0] === DIFF_DELETE && diffs[pointer][0] === DIFF_INSERT) {
      const deletion = diffs[pointer - 1][1];
      const insertion = diffs[pointer][1];
      const overlap_length1 = diff_commonOverlap_(deletion, insertion);
      const overlap_length2 = diff_commonOverlap_(insertion, deletion);
      if (overlap_length1 >= overlap_length2) {
        if (overlap_length1 >= deletion.length / 2 || overlap_length1 >= insertion.length / 2) {
          diffs.splice(pointer, 0, new Diff(DIFF_EQUAL, insertion.substring(0, overlap_length1)));
          diffs[pointer - 1][1] = deletion.substring(0, deletion.length - overlap_length1);
          diffs[pointer + 1][1] = insertion.substring(overlap_length1);
          pointer++;
        }
      } else {
        if (overlap_length2 >= deletion.length / 2 || overlap_length2 >= insertion.length / 2) {
          diffs.splice(pointer, 0, new Diff(DIFF_EQUAL, deletion.substring(0, overlap_length2)));
          diffs[pointer - 1][0] = DIFF_INSERT;
          diffs[pointer - 1][1] = insertion.substring(0, insertion.length - overlap_length2);
          diffs[pointer + 1][0] = DIFF_DELETE;
          diffs[pointer + 1][1] = deletion.substring(overlap_length2);
          pointer++;
        }
      }
      pointer++;
    }
    pointer++;
  }
}
var nonAlphaNumericRegex_ = /[^a-z0-9]/i;
var whitespaceRegex_ = /\s/;
var linebreakRegex_ = /[\r\n]/;
var blanklineEndRegex_ = /\n\r?\n$/;
var blanklineStartRegex_ = /^\r?\n\r?\n/;
function diff_cleanupSemanticLossless(diffs) {
  let pointer = 1;
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] === DIFF_EQUAL && diffs[pointer + 1][0] === DIFF_EQUAL) {
      let equality1 = diffs[pointer - 1][1];
      let edit = diffs[pointer][1];
      let equality2 = diffs[pointer + 1][1];
      const commonOffset = diff_commonSuffix(equality1, edit);
      if (commonOffset) {
        const commonString = edit.substring(edit.length - commonOffset);
        equality1 = equality1.substring(0, equality1.length - commonOffset);
        edit = commonString + edit.substring(0, edit.length - commonOffset);
        equality2 = commonString + equality2;
      }
      let bestEquality1 = equality1;
      let bestEdit = edit;
      let bestEquality2 = equality2;
      let bestScore = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
      while (edit.charAt(0) === equality2.charAt(0)) {
        equality1 += edit.charAt(0);
        edit = edit.substring(1) + equality2.charAt(0);
        equality2 = equality2.substring(1);
        const score = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
        if (score >= bestScore) {
          bestScore = score;
          bestEquality1 = equality1;
          bestEdit = edit;
          bestEquality2 = equality2;
        }
      }
      if (diffs[pointer - 1][1] !== bestEquality1) {
        if (bestEquality1) {
          diffs[pointer - 1][1] = bestEquality1;
        } else {
          diffs.splice(pointer - 1, 1);
          pointer--;
        }
        diffs[pointer][1] = bestEdit;
        if (bestEquality2) {
          diffs[pointer + 1][1] = bestEquality2;
        } else {
          diffs.splice(pointer + 1, 1);
          pointer--;
        }
      }
    }
    pointer++;
  }
}
function diff_cleanupMerge(diffs) {
  diffs.push(new Diff(DIFF_EQUAL, ""));
  let pointer = 0;
  let count_delete = 0;
  let count_insert = 0;
  let text_delete = "";
  let text_insert = "";
  let commonlength;
  while (pointer < diffs.length) {
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++;
        text_insert += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_DELETE:
        count_delete++;
        text_delete += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_EQUAL:
        if (count_delete + count_insert > 1) {
          if (count_delete !== 0 && count_insert !== 0) {
            commonlength = diff_commonPrefix(text_insert, text_delete);
            if (commonlength !== 0) {
              if (pointer - count_delete - count_insert > 0 && diffs[pointer - count_delete - count_insert - 1][0] === DIFF_EQUAL) {
                diffs[pointer - count_delete - count_insert - 1][1] += text_insert.substring(0, commonlength);
              } else {
                diffs.splice(0, 0, new Diff(DIFF_EQUAL, text_insert.substring(0, commonlength)));
                pointer++;
              }
              text_insert = text_insert.substring(commonlength);
              text_delete = text_delete.substring(commonlength);
            }
            commonlength = diff_commonSuffix(text_insert, text_delete);
            if (commonlength !== 0) {
              diffs[pointer][1] = text_insert.substring(text_insert.length - commonlength) + diffs[pointer][1];
              text_insert = text_insert.substring(0, text_insert.length - commonlength);
              text_delete = text_delete.substring(0, text_delete.length - commonlength);
            }
          }
          pointer -= count_delete + count_insert;
          diffs.splice(pointer, count_delete + count_insert);
          if (text_delete.length) {
            diffs.splice(pointer, 0, new Diff(DIFF_DELETE, text_delete));
            pointer++;
          }
          if (text_insert.length) {
            diffs.splice(pointer, 0, new Diff(DIFF_INSERT, text_insert));
            pointer++;
          }
          pointer++;
        } else if (pointer !== 0 && diffs[pointer - 1][0] === DIFF_EQUAL) {
          diffs[pointer - 1][1] += diffs[pointer][1];
          diffs.splice(pointer, 1);
        } else {
          pointer++;
        }
        count_insert = 0;
        count_delete = 0;
        text_delete = "";
        text_insert = "";
        break;
    }
  }
  if (diffs.at(-1)?.[1] === "") {
    diffs.pop();
  }
  let changes = false;
  pointer = 1;
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] === DIFF_EQUAL && diffs[pointer + 1][0] === DIFF_EQUAL) {
      if (diffs[pointer][1].substring(diffs[pointer][1].length - diffs[pointer - 1][1].length) === diffs[pointer - 1][1]) {
        diffs[pointer][1] = diffs[pointer - 1][1] + diffs[pointer][1].substring(0, diffs[pointer][1].length - diffs[pointer - 1][1].length);
        diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
        diffs.splice(pointer - 1, 1);
        changes = true;
      } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) === diffs[pointer + 1][1]) {
        diffs[pointer - 1][1] += diffs[pointer + 1][1];
        diffs[pointer][1] = diffs[pointer][1].substring(diffs[pointer + 1][1].length) + diffs[pointer + 1][1];
        diffs.splice(pointer + 1, 1);
        changes = true;
      }
    }
    pointer++;
  }
  if (changes) {
    diff_cleanupMerge(diffs);
  }
}
function diff_cleanupSemanticScore_(one, two) {
  if (!one || !two) {
    return 6;
  }
  const char1 = one.charAt(one.length - 1);
  const char2 = two.charAt(0);
  const nonAlphaNumeric1 = char1.match(nonAlphaNumericRegex_);
  const nonAlphaNumeric2 = char2.match(nonAlphaNumericRegex_);
  const whitespace1 = nonAlphaNumeric1 && char1.match(whitespaceRegex_);
  const whitespace2 = nonAlphaNumeric2 && char2.match(whitespaceRegex_);
  const lineBreak1 = whitespace1 && char1.match(linebreakRegex_);
  const lineBreak2 = whitespace2 && char2.match(linebreakRegex_);
  const blankLine1 = lineBreak1 && one.match(blanklineEndRegex_);
  const blankLine2 = lineBreak2 && two.match(blanklineStartRegex_);
  if (blankLine1 || blankLine2) {
    return 5;
  } else if (lineBreak1 || lineBreak2) {
    return 4;
  } else if (nonAlphaNumeric1 && !whitespace1 && whitespace2) {
    return 3;
  } else if (whitespace1 || whitespace2) {
    return 2;
  } else if (nonAlphaNumeric1 || nonAlphaNumeric2) {
    return 1;
  }
  return 0;
}
var NO_DIFF_MESSAGE = "Compared values have no visual difference.";
var SIMILAR_MESSAGE = "Compared values serialize to the same structure.\nPrinting internal object structure without calling `toJSON` instead.";
function getDefaultExportFromCjs2(x2) {
  return x2 && x2.__esModule && Object.prototype.hasOwnProperty.call(x2, "default") ? x2["default"] : x2;
}
var build = {};
var hasRequiredBuild;
function requireBuild() {
  if (hasRequiredBuild) return build;
  hasRequiredBuild = 1;
  Object.defineProperty(build, "__esModule", {
    value: true
  });
  build.default = diffSequence;
  const pkg = "diff-sequences";
  const NOT_YET_SET = 0;
  const countCommonItemsF = (aIndex, aEnd, bIndex, bEnd, isCommon) => {
    let nCommon = 0;
    while (aIndex < aEnd && bIndex < bEnd && isCommon(aIndex, bIndex)) {
      aIndex += 1;
      bIndex += 1;
      nCommon += 1;
    }
    return nCommon;
  };
  const countCommonItemsR = (aStart, aIndex, bStart, bIndex, isCommon) => {
    let nCommon = 0;
    while (aStart <= aIndex && bStart <= bIndex && isCommon(aIndex, bIndex)) {
      aIndex -= 1;
      bIndex -= 1;
      nCommon += 1;
    }
    return nCommon;
  };
  const extendPathsF = (d3, aEnd, bEnd, bF, isCommon, aIndexesF, iMaxF) => {
    let iF = 0;
    let kF = -d3;
    let aFirst = aIndexesF[iF];
    let aIndexPrev1 = aFirst;
    aIndexesF[iF] += countCommonItemsF(
      aFirst + 1,
      aEnd,
      bF + aFirst - kF + 1,
      bEnd,
      isCommon
    );
    const nF = d3 < iMaxF ? d3 : iMaxF;
    for (iF += 1, kF += 2; iF <= nF; iF += 1, kF += 2) {
      if (iF !== d3 && aIndexPrev1 < aIndexesF[iF]) {
        aFirst = aIndexesF[iF];
      } else {
        aFirst = aIndexPrev1 + 1;
        if (aEnd <= aFirst) {
          return iF - 1;
        }
      }
      aIndexPrev1 = aIndexesF[iF];
      aIndexesF[iF] = aFirst + countCommonItemsF(aFirst + 1, aEnd, bF + aFirst - kF + 1, bEnd, isCommon);
    }
    return iMaxF;
  };
  const extendPathsR = (d3, aStart, bStart, bR, isCommon, aIndexesR, iMaxR) => {
    let iR = 0;
    let kR = d3;
    let aFirst = aIndexesR[iR];
    let aIndexPrev1 = aFirst;
    aIndexesR[iR] -= countCommonItemsR(
      aStart,
      aFirst - 1,
      bStart,
      bR + aFirst - kR - 1,
      isCommon
    );
    const nR = d3 < iMaxR ? d3 : iMaxR;
    for (iR += 1, kR -= 2; iR <= nR; iR += 1, kR -= 2) {
      if (iR !== d3 && aIndexesR[iR] < aIndexPrev1) {
        aFirst = aIndexesR[iR];
      } else {
        aFirst = aIndexPrev1 - 1;
        if (aFirst < aStart) {
          return iR - 1;
        }
      }
      aIndexPrev1 = aIndexesR[iR];
      aIndexesR[iR] = aFirst - countCommonItemsR(
        aStart,
        aFirst - 1,
        bStart,
        bR + aFirst - kR - 1,
        isCommon
      );
    }
    return iMaxR;
  };
  const extendOverlappablePathsF = (d3, aStart, aEnd, bStart, bEnd, isCommon, aIndexesF, iMaxF, aIndexesR, iMaxR, division) => {
    const bF = bStart - aStart;
    const aLength = aEnd - aStart;
    const bLength = bEnd - bStart;
    const baDeltaLength = bLength - aLength;
    const kMinOverlapF = -baDeltaLength - (d3 - 1);
    const kMaxOverlapF = -baDeltaLength + (d3 - 1);
    let aIndexPrev1 = NOT_YET_SET;
    const nF = d3 < iMaxF ? d3 : iMaxF;
    for (let iF = 0, kF = -d3; iF <= nF; iF += 1, kF += 2) {
      const insert = iF === 0 || iF !== d3 && aIndexPrev1 < aIndexesF[iF];
      const aLastPrev = insert ? aIndexesF[iF] : aIndexPrev1;
      const aFirst = insert ? aLastPrev : aLastPrev + 1;
      const bFirst = bF + aFirst - kF;
      const nCommonF = countCommonItemsF(
        aFirst + 1,
        aEnd,
        bFirst + 1,
        bEnd,
        isCommon
      );
      const aLast = aFirst + nCommonF;
      aIndexPrev1 = aIndexesF[iF];
      aIndexesF[iF] = aLast;
      if (kMinOverlapF <= kF && kF <= kMaxOverlapF) {
        const iR = (d3 - 1 - (kF + baDeltaLength)) / 2;
        if (iR <= iMaxR && aIndexesR[iR] - 1 <= aLast) {
          const bLastPrev = bF + aLastPrev - (insert ? kF + 1 : kF - 1);
          const nCommonR = countCommonItemsR(
            aStart,
            aLastPrev,
            bStart,
            bLastPrev,
            isCommon
          );
          const aIndexPrevFirst = aLastPrev - nCommonR;
          const bIndexPrevFirst = bLastPrev - nCommonR;
          const aEndPreceding = aIndexPrevFirst + 1;
          const bEndPreceding = bIndexPrevFirst + 1;
          division.nChangePreceding = d3 - 1;
          if (d3 - 1 === aEndPreceding + bEndPreceding - aStart - bStart) {
            division.aEndPreceding = aStart;
            division.bEndPreceding = bStart;
          } else {
            division.aEndPreceding = aEndPreceding;
            division.bEndPreceding = bEndPreceding;
          }
          division.nCommonPreceding = nCommonR;
          if (nCommonR !== 0) {
            division.aCommonPreceding = aEndPreceding;
            division.bCommonPreceding = bEndPreceding;
          }
          division.nCommonFollowing = nCommonF;
          if (nCommonF !== 0) {
            division.aCommonFollowing = aFirst + 1;
            division.bCommonFollowing = bFirst + 1;
          }
          const aStartFollowing = aLast + 1;
          const bStartFollowing = bFirst + nCommonF + 1;
          division.nChangeFollowing = d3 - 1;
          if (d3 - 1 === aEnd + bEnd - aStartFollowing - bStartFollowing) {
            division.aStartFollowing = aEnd;
            division.bStartFollowing = bEnd;
          } else {
            division.aStartFollowing = aStartFollowing;
            division.bStartFollowing = bStartFollowing;
          }
          return true;
        }
      }
    }
    return false;
  };
  const extendOverlappablePathsR = (d3, aStart, aEnd, bStart, bEnd, isCommon, aIndexesF, iMaxF, aIndexesR, iMaxR, division) => {
    const bR = bEnd - aEnd;
    const aLength = aEnd - aStart;
    const bLength = bEnd - bStart;
    const baDeltaLength = bLength - aLength;
    const kMinOverlapR = baDeltaLength - d3;
    const kMaxOverlapR = baDeltaLength + d3;
    let aIndexPrev1 = NOT_YET_SET;
    const nR = d3 < iMaxR ? d3 : iMaxR;
    for (let iR = 0, kR = d3; iR <= nR; iR += 1, kR -= 2) {
      const insert = iR === 0 || iR !== d3 && aIndexesR[iR] < aIndexPrev1;
      const aLastPrev = insert ? aIndexesR[iR] : aIndexPrev1;
      const aFirst = insert ? aLastPrev : aLastPrev - 1;
      const bFirst = bR + aFirst - kR;
      const nCommonR = countCommonItemsR(
        aStart,
        aFirst - 1,
        bStart,
        bFirst - 1,
        isCommon
      );
      const aLast = aFirst - nCommonR;
      aIndexPrev1 = aIndexesR[iR];
      aIndexesR[iR] = aLast;
      if (kMinOverlapR <= kR && kR <= kMaxOverlapR) {
        const iF = (d3 + (kR - baDeltaLength)) / 2;
        if (iF <= iMaxF && aLast - 1 <= aIndexesF[iF]) {
          const bLast = bFirst - nCommonR;
          division.nChangePreceding = d3;
          if (d3 === aLast + bLast - aStart - bStart) {
            division.aEndPreceding = aStart;
            division.bEndPreceding = bStart;
          } else {
            division.aEndPreceding = aLast;
            division.bEndPreceding = bLast;
          }
          division.nCommonPreceding = nCommonR;
          if (nCommonR !== 0) {
            division.aCommonPreceding = aLast;
            division.bCommonPreceding = bLast;
          }
          division.nChangeFollowing = d3 - 1;
          if (d3 === 1) {
            division.nCommonFollowing = 0;
            division.aStartFollowing = aEnd;
            division.bStartFollowing = bEnd;
          } else {
            const bLastPrev = bR + aLastPrev - (insert ? kR - 1 : kR + 1);
            const nCommonF = countCommonItemsF(
              aLastPrev,
              aEnd,
              bLastPrev,
              bEnd,
              isCommon
            );
            division.nCommonFollowing = nCommonF;
            if (nCommonF !== 0) {
              division.aCommonFollowing = aLastPrev;
              division.bCommonFollowing = bLastPrev;
            }
            const aStartFollowing = aLastPrev + nCommonF;
            const bStartFollowing = bLastPrev + nCommonF;
            if (d3 - 1 === aEnd + bEnd - aStartFollowing - bStartFollowing) {
              division.aStartFollowing = aEnd;
              division.bStartFollowing = bEnd;
            } else {
              division.aStartFollowing = aStartFollowing;
              division.bStartFollowing = bStartFollowing;
            }
          }
          return true;
        }
      }
    }
    return false;
  };
  const divide = (nChange, aStart, aEnd, bStart, bEnd, isCommon, aIndexesF, aIndexesR, division) => {
    const bF = bStart - aStart;
    const bR = bEnd - aEnd;
    const aLength = aEnd - aStart;
    const bLength = bEnd - bStart;
    const baDeltaLength = bLength - aLength;
    let iMaxF = aLength;
    let iMaxR = aLength;
    aIndexesF[0] = aStart - 1;
    aIndexesR[0] = aEnd;
    if (baDeltaLength % 2 === 0) {
      const dMin = (nChange || baDeltaLength) / 2;
      const dMax = (aLength + bLength) / 2;
      for (let d3 = 1; d3 <= dMax; d3 += 1) {
        iMaxF = extendPathsF(d3, aEnd, bEnd, bF, isCommon, aIndexesF, iMaxF);
        if (d3 < dMin) {
          iMaxR = extendPathsR(d3, aStart, bStart, bR, isCommon, aIndexesR, iMaxR);
        } else if (
          // If a reverse path overlaps a forward path in the same diagonal,
          // return a division of the index intervals at the middle change.
          extendOverlappablePathsR(
            d3,
            aStart,
            aEnd,
            bStart,
            bEnd,
            isCommon,
            aIndexesF,
            iMaxF,
            aIndexesR,
            iMaxR,
            division
          )
        ) {
          return;
        }
      }
    } else {
      const dMin = ((nChange || baDeltaLength) + 1) / 2;
      const dMax = (aLength + bLength + 1) / 2;
      let d3 = 1;
      iMaxF = extendPathsF(d3, aEnd, bEnd, bF, isCommon, aIndexesF, iMaxF);
      for (d3 += 1; d3 <= dMax; d3 += 1) {
        iMaxR = extendPathsR(
          d3 - 1,
          aStart,
          bStart,
          bR,
          isCommon,
          aIndexesR,
          iMaxR
        );
        if (d3 < dMin) {
          iMaxF = extendPathsF(d3, aEnd, bEnd, bF, isCommon, aIndexesF, iMaxF);
        } else if (
          // If a forward path overlaps a reverse path in the same diagonal,
          // return a division of the index intervals at the middle change.
          extendOverlappablePathsF(
            d3,
            aStart,
            aEnd,
            bStart,
            bEnd,
            isCommon,
            aIndexesF,
            iMaxF,
            aIndexesR,
            iMaxR,
            division
          )
        ) {
          return;
        }
      }
    }
    throw new Error(
      `${pkg}: no overlap aStart=${aStart} aEnd=${aEnd} bStart=${bStart} bEnd=${bEnd}`
    );
  };
  const findSubsequences = (nChange, aStart, aEnd, bStart, bEnd, transposed, callbacks, aIndexesF, aIndexesR, division) => {
    if (bEnd - bStart < aEnd - aStart) {
      transposed = !transposed;
      if (transposed && callbacks.length === 1) {
        const { foundSubsequence: foundSubsequence2, isCommon: isCommon2 } = callbacks[0];
        callbacks[1] = {
          foundSubsequence: (nCommon, bCommon, aCommon) => {
            foundSubsequence2(nCommon, aCommon, bCommon);
          },
          isCommon: (bIndex, aIndex) => isCommon2(aIndex, bIndex)
        };
      }
      const tStart = aStart;
      const tEnd = aEnd;
      aStart = bStart;
      aEnd = bEnd;
      bStart = tStart;
      bEnd = tEnd;
    }
    const { foundSubsequence, isCommon } = callbacks[transposed ? 1 : 0];
    divide(
      nChange,
      aStart,
      aEnd,
      bStart,
      bEnd,
      isCommon,
      aIndexesF,
      aIndexesR,
      division
    );
    const {
      nChangePreceding,
      aEndPreceding,
      bEndPreceding,
      nCommonPreceding,
      aCommonPreceding,
      bCommonPreceding,
      nCommonFollowing,
      aCommonFollowing,
      bCommonFollowing,
      nChangeFollowing,
      aStartFollowing,
      bStartFollowing
    } = division;
    if (aStart < aEndPreceding && bStart < bEndPreceding) {
      findSubsequences(
        nChangePreceding,
        aStart,
        aEndPreceding,
        bStart,
        bEndPreceding,
        transposed,
        callbacks,
        aIndexesF,
        aIndexesR,
        division
      );
    }
    if (nCommonPreceding !== 0) {
      foundSubsequence(nCommonPreceding, aCommonPreceding, bCommonPreceding);
    }
    if (nCommonFollowing !== 0) {
      foundSubsequence(nCommonFollowing, aCommonFollowing, bCommonFollowing);
    }
    if (aStartFollowing < aEnd && bStartFollowing < bEnd) {
      findSubsequences(
        nChangeFollowing,
        aStartFollowing,
        aEnd,
        bStartFollowing,
        bEnd,
        transposed,
        callbacks,
        aIndexesF,
        aIndexesR,
        division
      );
    }
  };
  const validateLength = (name, arg) => {
    if (typeof arg !== "number") {
      throw new TypeError(`${pkg}: ${name} typeof ${typeof arg} is not a number`);
    }
    if (!Number.isSafeInteger(arg)) {
      throw new RangeError(`${pkg}: ${name} value ${arg} is not a safe integer`);
    }
    if (arg < 0) {
      throw new RangeError(`${pkg}: ${name} value ${arg} is a negative integer`);
    }
  };
  const validateCallback = (name, arg) => {
    const type3 = typeof arg;
    if (type3 !== "function") {
      throw new TypeError(`${pkg}: ${name} typeof ${type3} is not a function`);
    }
  };
  function diffSequence(aLength, bLength, isCommon, foundSubsequence) {
    validateLength("aLength", aLength);
    validateLength("bLength", bLength);
    validateCallback("isCommon", isCommon);
    validateCallback("foundSubsequence", foundSubsequence);
    const nCommonF = countCommonItemsF(0, aLength, 0, bLength, isCommon);
    if (nCommonF !== 0) {
      foundSubsequence(nCommonF, 0, 0);
    }
    if (aLength !== nCommonF || bLength !== nCommonF) {
      const aStart = nCommonF;
      const bStart = nCommonF;
      const nCommonR = countCommonItemsR(
        aStart,
        aLength - 1,
        bStart,
        bLength - 1,
        isCommon
      );
      const aEnd = aLength - nCommonR;
      const bEnd = bLength - nCommonR;
      const nCommonFR = nCommonF + nCommonR;
      if (aLength !== nCommonFR && bLength !== nCommonFR) {
        const nChange = 0;
        const transposed = false;
        const callbacks = [
          {
            foundSubsequence,
            isCommon
          }
        ];
        const aIndexesF = [NOT_YET_SET];
        const aIndexesR = [NOT_YET_SET];
        const division = {
          aCommonFollowing: NOT_YET_SET,
          aCommonPreceding: NOT_YET_SET,
          aEndPreceding: NOT_YET_SET,
          aStartFollowing: NOT_YET_SET,
          bCommonFollowing: NOT_YET_SET,
          bCommonPreceding: NOT_YET_SET,
          bEndPreceding: NOT_YET_SET,
          bStartFollowing: NOT_YET_SET,
          nChangeFollowing: NOT_YET_SET,
          nChangePreceding: NOT_YET_SET,
          nCommonFollowing: NOT_YET_SET,
          nCommonPreceding: NOT_YET_SET
        };
        findSubsequences(
          nChange,
          aStart,
          aEnd,
          bStart,
          bEnd,
          transposed,
          callbacks,
          aIndexesF,
          aIndexesR,
          division
        );
      }
      if (nCommonR !== 0) {
        foundSubsequence(nCommonR, aEnd, bEnd);
      }
    }
  }
  return build;
}
var buildExports = /* @__PURE__ */ requireBuild();
var diffSequences = /* @__PURE__ */ getDefaultExportFromCjs2(buildExports);
function formatTrailingSpaces(line, trailingSpaceFormatter) {
  return line.replace(/\s+$/, (match) => trailingSpaceFormatter(match));
}
function printDiffLine(line, isFirstOrLast, color, indicator, trailingSpaceFormatter, emptyFirstOrLastLinePlaceholder) {
  return line.length !== 0 ? color(`${indicator} ${formatTrailingSpaces(line, trailingSpaceFormatter)}`) : indicator !== " " ? color(indicator) : isFirstOrLast && emptyFirstOrLastLinePlaceholder.length !== 0 ? color(`${indicator} ${emptyFirstOrLastLinePlaceholder}`) : "";
}
function printDeleteLine(line, isFirstOrLast, { aColor, aIndicator, changeLineTrailingSpaceColor, emptyFirstOrLastLinePlaceholder }) {
  return printDiffLine(line, isFirstOrLast, aColor, aIndicator, changeLineTrailingSpaceColor, emptyFirstOrLastLinePlaceholder);
}
function printInsertLine(line, isFirstOrLast, { bColor, bIndicator, changeLineTrailingSpaceColor, emptyFirstOrLastLinePlaceholder }) {
  return printDiffLine(line, isFirstOrLast, bColor, bIndicator, changeLineTrailingSpaceColor, emptyFirstOrLastLinePlaceholder);
}
function printCommonLine(line, isFirstOrLast, { commonColor, commonIndicator, commonLineTrailingSpaceColor, emptyFirstOrLastLinePlaceholder }) {
  return printDiffLine(line, isFirstOrLast, commonColor, commonIndicator, commonLineTrailingSpaceColor, emptyFirstOrLastLinePlaceholder);
}
function createPatchMark(aStart, aEnd, bStart, bEnd, { patchColor }) {
  return patchColor(`@@ -${aStart + 1},${aEnd - aStart} +${bStart + 1},${bEnd - bStart} @@`);
}
function joinAlignedDiffsNoExpand(diffs, options) {
  const iLength = diffs.length;
  const nContextLines = options.contextLines;
  const nContextLines2 = nContextLines + nContextLines;
  let jLength = iLength;
  let hasExcessAtStartOrEnd = false;
  let nExcessesBetweenChanges = 0;
  let i3 = 0;
  while (i3 !== iLength) {
    const iStart = i3;
    while (i3 !== iLength && diffs[i3][0] === DIFF_EQUAL) {
      i3 += 1;
    }
    if (iStart !== i3) {
      if (iStart === 0) {
        if (i3 > nContextLines) {
          jLength -= i3 - nContextLines;
          hasExcessAtStartOrEnd = true;
        }
      } else if (i3 === iLength) {
        const n2 = i3 - iStart;
        if (n2 > nContextLines) {
          jLength -= n2 - nContextLines;
          hasExcessAtStartOrEnd = true;
        }
      } else {
        const n2 = i3 - iStart;
        if (n2 > nContextLines2) {
          jLength -= n2 - nContextLines2;
          nExcessesBetweenChanges += 1;
        }
      }
    }
    while (i3 !== iLength && diffs[i3][0] !== DIFF_EQUAL) {
      i3 += 1;
    }
  }
  const hasPatch = nExcessesBetweenChanges !== 0 || hasExcessAtStartOrEnd;
  if (nExcessesBetweenChanges !== 0) {
    jLength += nExcessesBetweenChanges + 1;
  } else if (hasExcessAtStartOrEnd) {
    jLength += 1;
  }
  const jLast = jLength - 1;
  const lines = [];
  let jPatchMark = 0;
  if (hasPatch) {
    lines.push("");
  }
  let aStart = 0;
  let bStart = 0;
  let aEnd = 0;
  let bEnd = 0;
  const pushCommonLine = (line) => {
    const j2 = lines.length;
    lines.push(printCommonLine(line, j2 === 0 || j2 === jLast, options));
    aEnd += 1;
    bEnd += 1;
  };
  const pushDeleteLine = (line) => {
    const j2 = lines.length;
    lines.push(printDeleteLine(line, j2 === 0 || j2 === jLast, options));
    aEnd += 1;
  };
  const pushInsertLine = (line) => {
    const j2 = lines.length;
    lines.push(printInsertLine(line, j2 === 0 || j2 === jLast, options));
    bEnd += 1;
  };
  i3 = 0;
  while (i3 !== iLength) {
    let iStart = i3;
    while (i3 !== iLength && diffs[i3][0] === DIFF_EQUAL) {
      i3 += 1;
    }
    if (iStart !== i3) {
      if (iStart === 0) {
        if (i3 > nContextLines) {
          iStart = i3 - nContextLines;
          aStart = iStart;
          bStart = iStart;
          aEnd = aStart;
          bEnd = bStart;
        }
        for (let iCommon = iStart; iCommon !== i3; iCommon += 1) {
          pushCommonLine(diffs[iCommon][1]);
        }
      } else if (i3 === iLength) {
        const iEnd = i3 - iStart > nContextLines ? iStart + nContextLines : i3;
        for (let iCommon = iStart; iCommon !== iEnd; iCommon += 1) {
          pushCommonLine(diffs[iCommon][1]);
        }
      } else {
        const nCommon = i3 - iStart;
        if (nCommon > nContextLines2) {
          const iEnd = iStart + nContextLines;
          for (let iCommon = iStart; iCommon !== iEnd; iCommon += 1) {
            pushCommonLine(diffs[iCommon][1]);
          }
          lines[jPatchMark] = createPatchMark(aStart, aEnd, bStart, bEnd, options);
          jPatchMark = lines.length;
          lines.push("");
          const nOmit = nCommon - nContextLines2;
          aStart = aEnd + nOmit;
          bStart = bEnd + nOmit;
          aEnd = aStart;
          bEnd = bStart;
          for (let iCommon = i3 - nContextLines; iCommon !== i3; iCommon += 1) {
            pushCommonLine(diffs[iCommon][1]);
          }
        } else {
          for (let iCommon = iStart; iCommon !== i3; iCommon += 1) {
            pushCommonLine(diffs[iCommon][1]);
          }
        }
      }
    }
    while (i3 !== iLength && diffs[i3][0] === DIFF_DELETE) {
      pushDeleteLine(diffs[i3][1]);
      i3 += 1;
    }
    while (i3 !== iLength && diffs[i3][0] === DIFF_INSERT) {
      pushInsertLine(diffs[i3][1]);
      i3 += 1;
    }
  }
  if (hasPatch) {
    lines[jPatchMark] = createPatchMark(aStart, aEnd, bStart, bEnd, options);
  }
  return lines.join("\n");
}
function joinAlignedDiffsExpand(diffs, options) {
  return diffs.map((diff2, i3, diffs2) => {
    const line = diff2[1];
    const isFirstOrLast = i3 === 0 || i3 === diffs2.length - 1;
    switch (diff2[0]) {
      case DIFF_DELETE:
        return printDeleteLine(line, isFirstOrLast, options);
      case DIFF_INSERT:
        return printInsertLine(line, isFirstOrLast, options);
      default:
        return printCommonLine(line, isFirstOrLast, options);
    }
  }).join("\n");
}
var noColor = (string2) => string2;
var DIFF_CONTEXT_DEFAULT = 5;
var DIFF_TRUNCATE_THRESHOLD_DEFAULT = 0;
function getDefaultOptions() {
  return {
    aAnnotation: "Expected",
    aColor: y.green,
    aIndicator: "-",
    bAnnotation: "Received",
    bColor: y.red,
    bIndicator: "+",
    changeColor: y.inverse,
    changeLineTrailingSpaceColor: noColor,
    commonColor: y.dim,
    commonIndicator: " ",
    commonLineTrailingSpaceColor: noColor,
    compareKeys: void 0,
    contextLines: DIFF_CONTEXT_DEFAULT,
    emptyFirstOrLastLinePlaceholder: "",
    expand: false,
    includeChangeCounts: false,
    omitAnnotationLines: false,
    patchColor: y.yellow,
    printBasicPrototype: false,
    truncateThreshold: DIFF_TRUNCATE_THRESHOLD_DEFAULT,
    truncateAnnotation: "... Diff result is truncated",
    truncateAnnotationColor: noColor
  };
}
function getCompareKeys(compareKeys) {
  return compareKeys && typeof compareKeys === "function" ? compareKeys : void 0;
}
function getContextLines(contextLines) {
  return typeof contextLines === "number" && Number.isSafeInteger(contextLines) && contextLines >= 0 ? contextLines : DIFF_CONTEXT_DEFAULT;
}
function normalizeDiffOptions(options = {}) {
  return {
    ...getDefaultOptions(),
    ...options,
    compareKeys: getCompareKeys(options.compareKeys),
    contextLines: getContextLines(options.contextLines)
  };
}
function isEmptyString(lines) {
  return lines.length === 1 && lines[0].length === 0;
}
function countChanges(diffs) {
  let a2 = 0;
  let b3 = 0;
  diffs.forEach((diff2) => {
    switch (diff2[0]) {
      case DIFF_DELETE:
        a2 += 1;
        break;
      case DIFF_INSERT:
        b3 += 1;
        break;
    }
  });
  return {
    a: a2,
    b: b3
  };
}
function printAnnotation({ aAnnotation, aColor, aIndicator, bAnnotation, bColor, bIndicator, includeChangeCounts, omitAnnotationLines }, changeCounts) {
  if (omitAnnotationLines) {
    return "";
  }
  let aRest = "";
  let bRest = "";
  if (includeChangeCounts) {
    const aCount = String(changeCounts.a);
    const bCount = String(changeCounts.b);
    const baAnnotationLengthDiff = bAnnotation.length - aAnnotation.length;
    const aAnnotationPadding = " ".repeat(Math.max(0, baAnnotationLengthDiff));
    const bAnnotationPadding = " ".repeat(Math.max(0, -baAnnotationLengthDiff));
    const baCountLengthDiff = bCount.length - aCount.length;
    const aCountPadding = " ".repeat(Math.max(0, baCountLengthDiff));
    const bCountPadding = " ".repeat(Math.max(0, -baCountLengthDiff));
    aRest = `${aAnnotationPadding}  ${aIndicator} ${aCountPadding}${aCount}`;
    bRest = `${bAnnotationPadding}  ${bIndicator} ${bCountPadding}${bCount}`;
  }
  const a2 = `${aIndicator} ${aAnnotation}${aRest}`;
  const b3 = `${bIndicator} ${bAnnotation}${bRest}`;
  return `${aColor(a2)}
${bColor(b3)}

`;
}
function printDiffLines(diffs, truncated, options) {
  return printAnnotation(options, countChanges(diffs)) + (options.expand ? joinAlignedDiffsExpand(diffs, options) : joinAlignedDiffsNoExpand(diffs, options)) + (truncated ? options.truncateAnnotationColor(`
${options.truncateAnnotation}`) : "");
}
function diffLinesUnified(aLines, bLines, options) {
  const normalizedOptions = normalizeDiffOptions(options);
  const [diffs, truncated] = diffLinesRaw(isEmptyString(aLines) ? [] : aLines, isEmptyString(bLines) ? [] : bLines, normalizedOptions);
  return printDiffLines(diffs, truncated, normalizedOptions);
}
function diffLinesUnified2(aLinesDisplay, bLinesDisplay, aLinesCompare, bLinesCompare, options) {
  if (isEmptyString(aLinesDisplay) && isEmptyString(aLinesCompare)) {
    aLinesDisplay = [];
    aLinesCompare = [];
  }
  if (isEmptyString(bLinesDisplay) && isEmptyString(bLinesCompare)) {
    bLinesDisplay = [];
    bLinesCompare = [];
  }
  if (aLinesDisplay.length !== aLinesCompare.length || bLinesDisplay.length !== bLinesCompare.length) {
    return diffLinesUnified(aLinesDisplay, bLinesDisplay, options);
  }
  const [diffs, truncated] = diffLinesRaw(aLinesCompare, bLinesCompare, options);
  let aIndex = 0;
  let bIndex = 0;
  diffs.forEach((diff2) => {
    switch (diff2[0]) {
      case DIFF_DELETE:
        diff2[1] = aLinesDisplay[aIndex];
        aIndex += 1;
        break;
      case DIFF_INSERT:
        diff2[1] = bLinesDisplay[bIndex];
        bIndex += 1;
        break;
      default:
        diff2[1] = bLinesDisplay[bIndex];
        aIndex += 1;
        bIndex += 1;
    }
  });
  return printDiffLines(diffs, truncated, normalizeDiffOptions(options));
}
function diffLinesRaw(aLines, bLines, options) {
  const truncate3 = options?.truncateThreshold ?? false;
  const truncateThreshold = Math.max(Math.floor(options?.truncateThreshold ?? 0), 0);
  const aLength = truncate3 ? Math.min(aLines.length, truncateThreshold) : aLines.length;
  const bLength = truncate3 ? Math.min(bLines.length, truncateThreshold) : bLines.length;
  const truncated = aLength !== aLines.length || bLength !== bLines.length;
  const isCommon = (aIndex2, bIndex2) => aLines[aIndex2] === bLines[bIndex2];
  const diffs = [];
  let aIndex = 0;
  let bIndex = 0;
  const foundSubsequence = (nCommon, aCommon, bCommon) => {
    for (; aIndex !== aCommon; aIndex += 1) {
      diffs.push(new Diff(DIFF_DELETE, aLines[aIndex]));
    }
    for (; bIndex !== bCommon; bIndex += 1) {
      diffs.push(new Diff(DIFF_INSERT, bLines[bIndex]));
    }
    for (; nCommon !== 0; nCommon -= 1, aIndex += 1, bIndex += 1) {
      diffs.push(new Diff(DIFF_EQUAL, bLines[bIndex]));
    }
  };
  diffSequences(aLength, bLength, isCommon, foundSubsequence);
  for (; aIndex !== aLength; aIndex += 1) {
    diffs.push(new Diff(DIFF_DELETE, aLines[aIndex]));
  }
  for (; bIndex !== bLength; bIndex += 1) {
    diffs.push(new Diff(DIFF_INSERT, bLines[bIndex]));
  }
  return [diffs, truncated];
}
function getType3(value) {
  if (value === void 0) {
    return "undefined";
  } else if (value === null) {
    return "null";
  } else if (Array.isArray(value)) {
    return "array";
  } else if (typeof value === "boolean") {
    return "boolean";
  } else if (typeof value === "function") {
    return "function";
  } else if (typeof value === "number") {
    return "number";
  } else if (typeof value === "string") {
    return "string";
  } else if (typeof value === "bigint") {
    return "bigint";
  } else if (typeof value === "object") {
    if (value != null) {
      if (value.constructor === RegExp) {
        return "regexp";
      } else if (value.constructor === Map) {
        return "map";
      } else if (value.constructor === Set) {
        return "set";
      } else if (value.constructor === Date) {
        return "date";
      }
    }
    return "object";
  } else if (typeof value === "symbol") {
    return "symbol";
  }
  throw new Error(`value of unknown type: ${value}`);
}
function getNewLineSymbol(string2) {
  return string2.includes("\r\n") ? "\r\n" : "\n";
}
function diffStrings(a2, b3, options) {
  const truncate3 = options?.truncateThreshold ?? false;
  const truncateThreshold = Math.max(Math.floor(options?.truncateThreshold ?? 0), 0);
  let aLength = a2.length;
  let bLength = b3.length;
  if (truncate3) {
    const aMultipleLines = a2.includes("\n");
    const bMultipleLines = b3.includes("\n");
    const aNewLineSymbol = getNewLineSymbol(a2);
    const bNewLineSymbol = getNewLineSymbol(b3);
    const _a = aMultipleLines ? `${a2.split(aNewLineSymbol, truncateThreshold).join(aNewLineSymbol)}
` : a2;
    const _b = bMultipleLines ? `${b3.split(bNewLineSymbol, truncateThreshold).join(bNewLineSymbol)}
` : b3;
    aLength = _a.length;
    bLength = _b.length;
  }
  const truncated = aLength !== a2.length || bLength !== b3.length;
  const isCommon = (aIndex2, bIndex2) => a2[aIndex2] === b3[bIndex2];
  let aIndex = 0;
  let bIndex = 0;
  const diffs = [];
  const foundSubsequence = (nCommon, aCommon, bCommon) => {
    if (aIndex !== aCommon) {
      diffs.push(new Diff(DIFF_DELETE, a2.slice(aIndex, aCommon)));
    }
    if (bIndex !== bCommon) {
      diffs.push(new Diff(DIFF_INSERT, b3.slice(bIndex, bCommon)));
    }
    aIndex = aCommon + nCommon;
    bIndex = bCommon + nCommon;
    diffs.push(new Diff(DIFF_EQUAL, b3.slice(bCommon, bIndex)));
  };
  diffSequences(aLength, bLength, isCommon, foundSubsequence);
  if (aIndex !== aLength) {
    diffs.push(new Diff(DIFF_DELETE, a2.slice(aIndex)));
  }
  if (bIndex !== bLength) {
    diffs.push(new Diff(DIFF_INSERT, b3.slice(bIndex)));
  }
  return [diffs, truncated];
}
function concatenateRelevantDiffs(op, diffs, changeColor) {
  return diffs.reduce((reduced, diff2) => reduced + (diff2[0] === DIFF_EQUAL ? diff2[1] : diff2[0] === op && diff2[1].length !== 0 ? changeColor(diff2[1]) : ""), "");
}
var ChangeBuffer = class {
  op;
  line;
  lines;
  changeColor;
  constructor(op, changeColor) {
    this.op = op;
    this.line = [];
    this.lines = [];
    this.changeColor = changeColor;
  }
  pushSubstring(substring) {
    this.pushDiff(new Diff(this.op, substring));
  }
  pushLine() {
    this.lines.push(this.line.length !== 1 ? new Diff(this.op, concatenateRelevantDiffs(this.op, this.line, this.changeColor)) : this.line[0][0] === this.op ? this.line[0] : new Diff(this.op, this.line[0][1]));
    this.line.length = 0;
  }
  isLineEmpty() {
    return this.line.length === 0;
  }
  // Minor input to buffer.
  pushDiff(diff2) {
    this.line.push(diff2);
  }
  // Main input to buffer.
  align(diff2) {
    const string2 = diff2[1];
    if (string2.includes("\n")) {
      const substrings = string2.split("\n");
      const iLast = substrings.length - 1;
      substrings.forEach((substring, i3) => {
        if (i3 < iLast) {
          this.pushSubstring(substring);
          this.pushLine();
        } else if (substring.length !== 0) {
          this.pushSubstring(substring);
        }
      });
    } else {
      this.pushDiff(diff2);
    }
  }
  // Output from buffer.
  moveLinesTo(lines) {
    if (!this.isLineEmpty()) {
      this.pushLine();
    }
    lines.push(...this.lines);
    this.lines.length = 0;
  }
};
var CommonBuffer = class {
  deleteBuffer;
  insertBuffer;
  lines;
  constructor(deleteBuffer, insertBuffer) {
    this.deleteBuffer = deleteBuffer;
    this.insertBuffer = insertBuffer;
    this.lines = [];
  }
  pushDiffCommonLine(diff2) {
    this.lines.push(diff2);
  }
  pushDiffChangeLines(diff2) {
    const isDiffEmpty = diff2[1].length === 0;
    if (!isDiffEmpty || this.deleteBuffer.isLineEmpty()) {
      this.deleteBuffer.pushDiff(diff2);
    }
    if (!isDiffEmpty || this.insertBuffer.isLineEmpty()) {
      this.insertBuffer.pushDiff(diff2);
    }
  }
  flushChangeLines() {
    this.deleteBuffer.moveLinesTo(this.lines);
    this.insertBuffer.moveLinesTo(this.lines);
  }
  // Input to buffer.
  align(diff2) {
    const op = diff2[0];
    const string2 = diff2[1];
    if (string2.includes("\n")) {
      const substrings = string2.split("\n");
      const iLast = substrings.length - 1;
      substrings.forEach((substring, i3) => {
        if (i3 === 0) {
          const subdiff = new Diff(op, substring);
          if (this.deleteBuffer.isLineEmpty() && this.insertBuffer.isLineEmpty()) {
            this.flushChangeLines();
            this.pushDiffCommonLine(subdiff);
          } else {
            this.pushDiffChangeLines(subdiff);
            this.flushChangeLines();
          }
        } else if (i3 < iLast) {
          this.pushDiffCommonLine(new Diff(op, substring));
        } else if (substring.length !== 0) {
          this.pushDiffChangeLines(new Diff(op, substring));
        }
      });
    } else {
      this.pushDiffChangeLines(diff2);
    }
  }
  // Output from buffer.
  getLines() {
    this.flushChangeLines();
    return this.lines;
  }
};
function getAlignedDiffs(diffs, changeColor) {
  const deleteBuffer = new ChangeBuffer(DIFF_DELETE, changeColor);
  const insertBuffer = new ChangeBuffer(DIFF_INSERT, changeColor);
  const commonBuffer = new CommonBuffer(deleteBuffer, insertBuffer);
  diffs.forEach((diff2) => {
    switch (diff2[0]) {
      case DIFF_DELETE:
        deleteBuffer.align(diff2);
        break;
      case DIFF_INSERT:
        insertBuffer.align(diff2);
        break;
      default:
        commonBuffer.align(diff2);
    }
  });
  return commonBuffer.getLines();
}
function hasCommonDiff(diffs, isMultiline) {
  if (isMultiline) {
    const iLast = diffs.length - 1;
    return diffs.some((diff2, i3) => diff2[0] === DIFF_EQUAL && (i3 !== iLast || diff2[1] !== "\n"));
  }
  return diffs.some((diff2) => diff2[0] === DIFF_EQUAL);
}
function diffStringsUnified(a2, b3, options) {
  if (a2 !== b3 && a2.length !== 0 && b3.length !== 0) {
    const isMultiline = a2.includes("\n") || b3.includes("\n");
    const [diffs, truncated] = diffStringsRaw(isMultiline ? `${a2}
` : a2, isMultiline ? `${b3}
` : b3, true, options);
    if (hasCommonDiff(diffs, isMultiline)) {
      const optionsNormalized = normalizeDiffOptions(options);
      const lines = getAlignedDiffs(diffs, optionsNormalized.changeColor);
      return printDiffLines(lines, truncated, optionsNormalized);
    }
  }
  return diffLinesUnified(a2.split("\n"), b3.split("\n"), options);
}
function diffStringsRaw(a2, b3, cleanup, options) {
  const [diffs, truncated] = diffStrings(a2, b3, options);
  if (cleanup) {
    diff_cleanupSemantic(diffs);
  }
  return [diffs, truncated];
}
function getCommonMessage(message, options) {
  const { commonColor } = normalizeDiffOptions(options);
  return commonColor(message);
}
var { AsymmetricMatcher: AsymmetricMatcher2, DOMCollection: DOMCollection2, DOMElement: DOMElement2, Immutable: Immutable2, ReactElement: ReactElement2, ReactTestComponent: ReactTestComponent2 } = plugins;
var PLUGINS2 = [
  ReactTestComponent2,
  ReactElement2,
  DOMElement2,
  DOMCollection2,
  Immutable2,
  AsymmetricMatcher2,
  plugins.Error
];
var FORMAT_OPTIONS = {
  maxDepth: 20,
  plugins: PLUGINS2
};
var FALLBACK_FORMAT_OPTIONS = {
  callToJSON: false,
  maxDepth: 8,
  plugins: PLUGINS2
};
function diff(a2, b3, options) {
  if (Object.is(a2, b3)) {
    return "";
  }
  const aType = getType3(a2);
  let expectedType = aType;
  let omitDifference = false;
  if (aType === "object" && typeof a2.asymmetricMatch === "function") {
    if (a2.$$typeof !== /* @__PURE__ */ Symbol.for("jest.asymmetricMatcher")) {
      return void 0;
    }
    if (typeof a2.getExpectedType !== "function") {
      return void 0;
    }
    expectedType = a2.getExpectedType();
    omitDifference = expectedType === "string";
  }
  if (expectedType !== getType3(b3)) {
    let truncate4 = function(s2) {
      return s2.length <= MAX_LENGTH ? s2 : `${s2.slice(0, MAX_LENGTH)}...`;
    };
    var truncate3 = truncate4;
    const { aAnnotation, aColor, aIndicator, bAnnotation, bColor, bIndicator } = normalizeDiffOptions(options);
    const formatOptions = getFormatOptions(FALLBACK_FORMAT_OPTIONS, options);
    let aDisplay = format(a2, formatOptions);
    let bDisplay = format(b3, formatOptions);
    const MAX_LENGTH = 1e5;
    aDisplay = truncate4(aDisplay);
    bDisplay = truncate4(bDisplay);
    const aDiff = `${aColor(`${aIndicator} ${aAnnotation}:`)}
${aDisplay}`;
    const bDiff = `${bColor(`${bIndicator} ${bAnnotation}:`)}
${bDisplay}`;
    return `${aDiff}

${bDiff}`;
  }
  if (omitDifference) {
    return void 0;
  }
  switch (aType) {
    case "string":
      return diffLinesUnified(a2.split("\n"), b3.split("\n"), options);
    case "boolean":
    case "number":
      return comparePrimitive(a2, b3, options);
    case "map":
      return compareObjects(sortMap(a2), sortMap(b3), options);
    case "set":
      return compareObjects(sortSet(a2), sortSet(b3), options);
    default:
      return compareObjects(a2, b3, options);
  }
}
function comparePrimitive(a2, b3, options) {
  const aFormat = format(a2, FORMAT_OPTIONS);
  const bFormat = format(b3, FORMAT_OPTIONS);
  return aFormat === bFormat ? "" : diffLinesUnified(aFormat.split("\n"), bFormat.split("\n"), options);
}
function sortMap(map2) {
  return new Map(Array.from(map2.entries()).sort());
}
function sortSet(set3) {
  return new Set(Array.from(set3.values()).sort());
}
function compareObjects(a2, b3, options) {
  let difference;
  let hasThrown = false;
  try {
    const formatOptions = getFormatOptions(FORMAT_OPTIONS, options);
    difference = getObjectsDifference(a2, b3, formatOptions, options);
  } catch {
    hasThrown = true;
  }
  const noDiffMessage = getCommonMessage(NO_DIFF_MESSAGE, options);
  if (difference === void 0 || difference === noDiffMessage) {
    const formatOptions = getFormatOptions(FALLBACK_FORMAT_OPTIONS, options);
    difference = getObjectsDifference(a2, b3, formatOptions, options);
    if (difference !== noDiffMessage && !hasThrown) {
      difference = `${getCommonMessage(SIMILAR_MESSAGE, options)}

${difference}`;
    }
  }
  return difference;
}
function getFormatOptions(formatOptions, options) {
  const { compareKeys, printBasicPrototype, maxDepth } = normalizeDiffOptions(options);
  return {
    ...formatOptions,
    compareKeys,
    printBasicPrototype,
    maxDepth: maxDepth ?? formatOptions.maxDepth
  };
}
function getObjectsDifference(a2, b3, formatOptions, options) {
  const formatOptionsZeroIndent = {
    ...formatOptions,
    indent: 0
  };
  const aCompare = format(a2, formatOptionsZeroIndent);
  const bCompare = format(b3, formatOptionsZeroIndent);
  if (aCompare === bCompare) {
    return getCommonMessage(NO_DIFF_MESSAGE, options);
  } else {
    const aDisplay = format(a2, formatOptions);
    const bDisplay = format(b3, formatOptions);
    return diffLinesUnified2(aDisplay.split("\n"), bDisplay.split("\n"), aCompare.split("\n"), bCompare.split("\n"), options);
  }
}
var MAX_DIFF_STRING_LENGTH = 2e4;
function isAsymmetricMatcher(data) {
  const type3 = getType2(data);
  return type3 === "Object" && typeof data.asymmetricMatch === "function";
}
function isReplaceable(obj1, obj2) {
  const obj1Type = getType2(obj1);
  const obj2Type = getType2(obj2);
  return obj1Type === obj2Type && (obj1Type === "Object" || obj1Type === "Array");
}
function printDiffOrStringify(received, expected, options) {
  const { aAnnotation, bAnnotation } = normalizeDiffOptions(options);
  if (typeof expected === "string" && typeof received === "string" && expected.length > 0 && received.length > 0 && expected.length <= MAX_DIFF_STRING_LENGTH && received.length <= MAX_DIFF_STRING_LENGTH && expected !== received) {
    if (expected.includes("\n") || received.includes("\n")) {
      return diffStringsUnified(expected, received, options);
    }
    const [diffs] = diffStringsRaw(expected, received, true);
    const hasCommonDiff2 = diffs.some((diff2) => diff2[0] === DIFF_EQUAL);
    const printLabel = getLabelPrinter(aAnnotation, bAnnotation);
    const expectedLine = printLabel(aAnnotation) + printExpected(getCommonAndChangedSubstrings(diffs, DIFF_DELETE, hasCommonDiff2));
    const receivedLine = printLabel(bAnnotation) + printReceived(getCommonAndChangedSubstrings(diffs, DIFF_INSERT, hasCommonDiff2));
    return `${expectedLine}
${receivedLine}`;
  }
  const clonedExpected = deepClone(expected, { forceWritable: true });
  const clonedReceived = deepClone(received, { forceWritable: true });
  const { replacedExpected, replacedActual } = replaceAsymmetricMatcher(clonedReceived, clonedExpected);
  const difference = diff(replacedExpected, replacedActual, options);
  return difference;
}
function replaceAsymmetricMatcher(actual, expected, actualReplaced = /* @__PURE__ */ new WeakSet(), expectedReplaced = /* @__PURE__ */ new WeakSet()) {
  if (actual instanceof Error && expected instanceof Error && typeof actual.cause !== "undefined" && typeof expected.cause === "undefined") {
    delete actual.cause;
    return {
      replacedActual: actual,
      replacedExpected: expected
    };
  }
  if (!isReplaceable(actual, expected)) {
    return {
      replacedActual: actual,
      replacedExpected: expected
    };
  }
  if (actualReplaced.has(actual) || expectedReplaced.has(expected)) {
    return {
      replacedActual: actual,
      replacedExpected: expected
    };
  }
  actualReplaced.add(actual);
  expectedReplaced.add(expected);
  getOwnProperties(expected).forEach((key) => {
    const expectedValue = expected[key];
    const actualValue = actual[key];
    if (isAsymmetricMatcher(expectedValue)) {
      if (expectedValue.asymmetricMatch(actualValue)) {
        expected[key] = actualValue;
      } else if ("sample" in expectedValue && expectedValue.sample !== void 0 && isReplaceable(actualValue, expectedValue.sample)) {
        const replaced = replaceAsymmetricMatcher(actualValue, expectedValue.sample, actualReplaced, expectedReplaced);
        actual[key] = replaced.replacedActual;
        expected[key] = replaced.replacedExpected;
      }
    } else if (isAsymmetricMatcher(actualValue)) {
      if (actualValue.asymmetricMatch(expectedValue)) {
        actual[key] = expectedValue;
      } else if ("sample" in actualValue && actualValue.sample !== void 0 && isReplaceable(actualValue.sample, expectedValue)) {
        const replaced = replaceAsymmetricMatcher(actualValue.sample, expectedValue, actualReplaced, expectedReplaced);
        actual[key] = replaced.replacedActual;
        expected[key] = replaced.replacedExpected;
      }
    } else if (isReplaceable(actualValue, expectedValue)) {
      const replaced = replaceAsymmetricMatcher(actualValue, expectedValue, actualReplaced, expectedReplaced);
      actual[key] = replaced.replacedActual;
      expected[key] = replaced.replacedExpected;
    }
  });
  return {
    replacedActual: actual,
    replacedExpected: expected
  };
}
function getLabelPrinter(...strings) {
  const maxLength = strings.reduce((max, string2) => string2.length > max ? string2.length : max, 0);
  return (string2) => `${string2}: ${" ".repeat(maxLength - string2.length)}`;
}
var SPACE_SYMBOL = "\xB7";
function replaceTrailingSpaces(text) {
  return text.replace(/\s+$/gm, (spaces) => SPACE_SYMBOL.repeat(spaces.length));
}
function printReceived(object2) {
  return y.red(replaceTrailingSpaces(stringify2(object2)));
}
function printExpected(value) {
  return y.green(replaceTrailingSpaces(stringify2(value)));
}
function getCommonAndChangedSubstrings(diffs, op, hasCommonDiff2) {
  return diffs.reduce((reduced, diff2) => reduced + (diff2[0] === DIFF_EQUAL ? diff2[1] : diff2[0] === op ? hasCommonDiff2 ? y.inverse(diff2[1]) : diff2[1] : ""), "");
}

// ../../node_modules/.pnpm/@vitest+utils@4.1.2/node_modules/@vitest/utils/dist/serialize.js
var IS_RECORD_SYMBOL = "@@__IMMUTABLE_RECORD__@@";
var IS_COLLECTION_SYMBOL = "@@__IMMUTABLE_ITERABLE__@@";
function isImmutable(v2) {
  return v2 && (v2[IS_COLLECTION_SYMBOL] || v2[IS_RECORD_SYMBOL]);
}
var OBJECT_PROTO = Object.getPrototypeOf({});
function getUnserializableMessage(err) {
  if (err instanceof Error) {
    return `<unserializable>: ${err.message}`;
  }
  if (typeof err === "string") {
    return `<unserializable>: ${err}`;
  }
  return "<unserializable>";
}
function serializeValue(val, seen = /* @__PURE__ */ new WeakMap()) {
  if (!val || typeof val === "string") {
    return val;
  }
  if (val instanceof Error && "toJSON" in val && typeof val.toJSON === "function") {
    const jsonValue = val.toJSON();
    if (jsonValue && jsonValue !== val && typeof jsonValue === "object") {
      if (typeof val.message === "string") {
        safe(() => jsonValue.message ??= normalizeErrorMessage(val.message));
      }
      if (typeof val.stack === "string") {
        safe(() => jsonValue.stack ??= val.stack);
      }
      if (typeof val.name === "string") {
        safe(() => jsonValue.name ??= val.name);
      }
      if (val.cause != null) {
        safe(() => jsonValue.cause ??= serializeValue(val.cause, seen));
      }
    }
    return serializeValue(jsonValue, seen);
  }
  if (typeof val === "function") {
    return `Function<${val.name || "anonymous"}>`;
  }
  if (typeof val === "symbol") {
    return val.toString();
  }
  if (typeof val !== "object") {
    return val;
  }
  if (typeof Buffer !== "undefined" && val instanceof Buffer) {
    return `<Buffer(${val.length}) ...>`;
  }
  if (typeof Uint8Array !== "undefined" && val instanceof Uint8Array) {
    return `<Uint8Array(${val.length}) ...>`;
  }
  if (isImmutable(val)) {
    return serializeValue(val.toJSON(), seen);
  }
  if (val instanceof Promise || val.constructor && val.constructor.prototype === "AsyncFunction") {
    return "Promise";
  }
  if (typeof Element !== "undefined" && val instanceof Element) {
    return val.tagName;
  }
  if (typeof val.toJSON === "function") {
    return serializeValue(val.toJSON(), seen);
  }
  if (seen.has(val)) {
    return seen.get(val);
  }
  if (Array.isArray(val)) {
    const clone2 = new Array(val.length);
    seen.set(val, clone2);
    val.forEach((e3, i3) => {
      try {
        clone2[i3] = serializeValue(e3, seen);
      } catch (err) {
        clone2[i3] = getUnserializableMessage(err);
      }
    });
    return clone2;
  } else {
    const clone2 = /* @__PURE__ */ Object.create(null);
    seen.set(val, clone2);
    let obj = val;
    while (obj && obj !== OBJECT_PROTO) {
      Object.getOwnPropertyNames(obj).forEach((key) => {
        if (key in clone2) {
          return;
        }
        try {
          clone2[key] = serializeValue(val[key], seen);
        } catch (err) {
          delete clone2[key];
          clone2[key] = getUnserializableMessage(err);
        }
      });
      obj = Object.getPrototypeOf(obj);
    }
    if (val instanceof Error) {
      safe(() => clone2.message = normalizeErrorMessage(val.message));
    }
    return clone2;
  }
}
function safe(fn2) {
  try {
    return fn2();
  } catch {
  }
}
function normalizeErrorMessage(message) {
  return message.replace(/\(0\s?,\s?__vite_ssr_import_\d+__.(\w+)\)/g, "$1").replace(/__(vite_ssr_import|vi_import)_\d+__\./g, "").replace(/getByTestId('__vitest_\d+__')/g, "page");
}

// ../../node_modules/.pnpm/@vitest+utils@4.1.2/node_modules/@vitest/utils/dist/error.js
function processError(_err, diffOptions, seen = /* @__PURE__ */ new WeakSet()) {
  if (!_err || typeof _err !== "object") {
    return { message: String(_err) };
  }
  const err = _err;
  if (err.showDiff || err.showDiff === void 0 && err.expected !== void 0 && err.actual !== void 0) {
    err.diff = printDiffOrStringify(err.actual, err.expected, {
      ...diffOptions,
      ...err.diffOptions
    });
  }
  if ("expected" in err && typeof err.expected !== "string") {
    err.expected = stringify2(err.expected, 10);
  }
  if ("actual" in err && typeof err.actual !== "string") {
    err.actual = stringify2(err.actual, 10);
  }
  try {
    if (!seen.has(err) && typeof err.cause === "object") {
      seen.add(err);
      err.cause = processError(err.cause, diffOptions, seen);
    }
  } catch {
  }
  try {
    return serializeValue(err);
  } catch (e3) {
    return serializeValue(new Error(`Failed to fully serialize error: ${e3?.message}
Inner error message: ${err?.message}`));
  }
}

// ../../node_modules/.pnpm/@vitest+utils@4.1.2/node_modules/@vitest/utils/dist/timers.js
var SAFE_TIMERS_SYMBOL = /* @__PURE__ */ Symbol("vitest:SAFE_TIMERS");
function getSafeTimers() {
  const { setTimeout: safeSetTimeout, setInterval: safeSetInterval, clearInterval: safeClearInterval, clearTimeout: safeClearTimeout, setImmediate: safeSetImmediate, clearImmediate: safeClearImmediate, queueMicrotask: safeQueueMicrotask } = globalThis[SAFE_TIMERS_SYMBOL] || globalThis;
  const { nextTick: safeNextTick } = globalThis[SAFE_TIMERS_SYMBOL] || globalThis.process || {};
  return {
    nextTick: safeNextTick,
    setTimeout: safeSetTimeout,
    setInterval: safeSetInterval,
    clearInterval: safeClearInterval,
    clearTimeout: safeClearTimeout,
    setImmediate: safeSetImmediate,
    clearImmediate: safeClearImmediate,
    queueMicrotask: safeQueueMicrotask
  };
}
function delay(timeout, scheduler = setTimeout) {
  return new Promise((resolve2) => scheduler(resolve2, timeout));
}

// ../../node_modules/.pnpm/@vitest+utils@4.1.2/node_modules/@vitest/utils/dist/chunk-pathe.M-eThtNZ.js
var _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r2) => r2.toUpperCase());
}
var _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
var resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index2 = arguments_.length - 1; index2 >= -1 && !resolvedAbsolute; index2--) {
    const path = index2 >= 0 ? arguments_[index2] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index2 = 0; index2 <= path.length; ++index2) {
    if (index2 < path.length) {
      char = path[index2];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index2 - 1 || dots === 1) ;
      else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index2;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index2;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index2)}`;
        } else {
          res = path.slice(lastSlash + 1, index2);
        }
        lastSegmentLength = index2 - lastSlash - 1;
      }
      lastSlash = index2;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
var isAbsolute = function(p2) {
  return _IS_ABSOLUTE_RE.test(p2);
};

// ../../node_modules/.pnpm/@vitest+utils@4.1.2/node_modules/@vitest/utils/dist/source-map.js
var comma = ",".charCodeAt(0);
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var intToChar = new Uint8Array(64);
var charToInt = new Uint8Array(128);
for (let i3 = 0; i3 < chars.length; i3++) {
  const c2 = chars.charCodeAt(i3);
  intToChar[i3] = c2;
  charToInt[c2] = i3;
}
function decodeInteger(reader, relative) {
  let value = 0;
  let shift = 0;
  let integer = 0;
  do {
    const c2 = reader.next();
    integer = charToInt[c2];
    value |= (integer & 31) << shift;
    shift += 5;
  } while (integer & 32);
  const shouldNegate = value & 1;
  value >>>= 1;
  if (shouldNegate) {
    value = -2147483648 | -value;
  }
  return relative + value;
}
function hasMoreVlq(reader, max) {
  if (reader.pos >= max) return false;
  return reader.peek() !== comma;
}
var StringReader = class {
  constructor(buffer) {
    this.pos = 0;
    this.buffer = buffer;
  }
  next() {
    return this.buffer.charCodeAt(this.pos++);
  }
  peek() {
    return this.buffer.charCodeAt(this.pos);
  }
  indexOf(char) {
    const { buffer, pos } = this;
    const idx = buffer.indexOf(char, pos);
    return idx === -1 ? buffer.length : idx;
  }
};
function decode(mappings) {
  const { length } = mappings;
  const reader = new StringReader(mappings);
  const decoded = [];
  let genColumn = 0;
  let sourcesIndex = 0;
  let sourceLine = 0;
  let sourceColumn = 0;
  let namesIndex = 0;
  do {
    const semi = reader.indexOf(";");
    const line = [];
    let sorted = true;
    let lastCol = 0;
    genColumn = 0;
    while (reader.pos < semi) {
      let seg;
      genColumn = decodeInteger(reader, genColumn);
      if (genColumn < lastCol) sorted = false;
      lastCol = genColumn;
      if (hasMoreVlq(reader, semi)) {
        sourcesIndex = decodeInteger(reader, sourcesIndex);
        sourceLine = decodeInteger(reader, sourceLine);
        sourceColumn = decodeInteger(reader, sourceColumn);
        if (hasMoreVlq(reader, semi)) {
          namesIndex = decodeInteger(reader, namesIndex);
          seg = [genColumn, sourcesIndex, sourceLine, sourceColumn, namesIndex];
        } else {
          seg = [genColumn, sourcesIndex, sourceLine, sourceColumn];
        }
      } else {
        seg = [genColumn];
      }
      line.push(seg);
      reader.pos++;
    }
    if (!sorted) sort(line);
    decoded.push(line);
    reader.pos = semi + 1;
  } while (reader.pos <= length);
  return decoded;
}
function sort(line) {
  line.sort(sortComparator);
}
function sortComparator(a2, b3) {
  return a2[0] - b3[0];
}
var COLUMN = 0;
var SOURCES_INDEX = 1;
var SOURCE_LINE = 2;
var SOURCE_COLUMN = 3;
var NAMES_INDEX = 4;
var found = false;
function binarySearch(haystack, needle, low, high) {
  while (low <= high) {
    const mid = low + (high - low >> 1);
    const cmp = haystack[mid][COLUMN] - needle;
    if (cmp === 0) {
      found = true;
      return mid;
    }
    if (cmp < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  found = false;
  return low - 1;
}
function upperBound(haystack, needle, index2) {
  for (let i3 = index2 + 1; i3 < haystack.length; index2 = i3++) {
    if (haystack[i3][COLUMN] !== needle) break;
  }
  return index2;
}
function lowerBound(haystack, needle, index2) {
  for (let i3 = index2 - 1; i3 >= 0; index2 = i3--) {
    if (haystack[i3][COLUMN] !== needle) break;
  }
  return index2;
}
function memoizedBinarySearch(haystack, needle, state, key) {
  const { lastKey, lastNeedle, lastIndex } = state;
  let low = 0;
  let high = haystack.length - 1;
  if (key === lastKey) {
    if (needle === lastNeedle) {
      found = lastIndex !== -1 && haystack[lastIndex][COLUMN] === needle;
      return lastIndex;
    }
    if (needle >= lastNeedle) {
      low = lastIndex === -1 ? 0 : lastIndex;
    } else {
      high = lastIndex;
    }
  }
  state.lastKey = key;
  state.lastNeedle = needle;
  return state.lastIndex = binarySearch(haystack, needle, low, high);
}
var LINE_GTR_ZERO = "`line` must be greater than 0 (lines start at line 1)";
var COL_GTR_EQ_ZERO = "`column` must be greater than or equal to 0 (columns start at column 0)";
var LEAST_UPPER_BOUND = -1;
var GREATEST_LOWER_BOUND = 1;
function cast(map2) {
  return map2;
}
function decodedMappings(map2) {
  var _a;
  return (_a = cast(map2))._decoded || (_a._decoded = decode(cast(map2)._encoded));
}
function originalPositionFor(map2, needle) {
  let { line, column, bias } = needle;
  line--;
  if (line < 0) throw new Error(LINE_GTR_ZERO);
  if (column < 0) throw new Error(COL_GTR_EQ_ZERO);
  const decoded = decodedMappings(map2);
  if (line >= decoded.length) return OMapping(null, null, null, null);
  const segments = decoded[line];
  const index2 = traceSegmentInternal(
    segments,
    cast(map2)._decodedMemo,
    line,
    column,
    bias || GREATEST_LOWER_BOUND
  );
  if (index2 === -1) return OMapping(null, null, null, null);
  const segment = segments[index2];
  if (segment.length === 1) return OMapping(null, null, null, null);
  const { names, resolvedSources } = map2;
  return OMapping(
    resolvedSources[segment[SOURCES_INDEX]],
    segment[SOURCE_LINE] + 1,
    segment[SOURCE_COLUMN],
    segment.length === 5 ? names[segment[NAMES_INDEX]] : null
  );
}
function OMapping(source, line, column, name) {
  return { source, line, column, name };
}
function traceSegmentInternal(segments, memo, line, column, bias) {
  let index2 = memoizedBinarySearch(segments, column, memo, line);
  if (found) {
    index2 = (bias === LEAST_UPPER_BOUND ? upperBound : lowerBound)(segments, column, index2);
  } else if (bias === LEAST_UPPER_BOUND) index2++;
  if (index2 === -1 || index2 === segments.length) return -1;
  return index2;
}
var CHROME_IE_STACK_REGEXP = /^\s*at .*(?:\S:\d+|\(native\))/m;
var SAFARI_NATIVE_CODE_REGEXP = /^(?:eval@)?(?:\[native code\])?$/;
var stackIgnorePatterns = [
  "node:internal",
  /\/packages\/\w+\/dist\//,
  /\/@vitest\/\w+\/dist\//,
  "/vitest/dist/",
  "/vitest/src/",
  "/node_modules/chai/",
  "/node_modules/tinyspy/",
  "/vite/dist/node/module-runner",
  "/rolldown-vite/dist/node/module-runner",
  "/deps/chunk-",
  "/deps/@vitest",
  "/deps/loupe",
  "/deps/chai",
  "/browser-playwright/dist/locators.js",
  "/browser-webdriverio/dist/locators.js",
  "/browser-preview/dist/locators.js",
  /node:\w+/,
  /__vitest_test__/,
  /__vitest_browser__/,
  "/@id/__x00__vitest/browser",
  /\/deps\/vitest_/
];
var NOW_LENGTH = Date.now().toString().length;
var REGEXP_VITEST = new RegExp(`vitest=\\d{${NOW_LENGTH}}`);
function extractLocation(urlLike) {
  if (!urlLike.includes(":")) {
    return [urlLike];
  }
  const regExp = /(.+?)(?::(\d+))?(?::(\d+))?$/;
  const parts = regExp.exec(urlLike.replace(/^\(|\)$/g, ""));
  if (!parts) {
    return [urlLike];
  }
  let url = parts[1];
  if (url.startsWith("async ")) {
    url = url.slice(6);
  }
  if (url.startsWith("http:") || url.startsWith("https:")) {
    const urlObj = new URL(url);
    urlObj.searchParams.delete("import");
    urlObj.searchParams.delete("browserv");
    url = urlObj.pathname + urlObj.hash + urlObj.search;
  }
  if (url.startsWith("/@fs/")) {
    const isWindows2 = /^\/@fs\/[a-zA-Z]:\//.test(url);
    url = url.slice(isWindows2 ? 5 : 4);
  }
  if (url.includes("vitest=")) {
    url = url.replace(REGEXP_VITEST, "").replace(/[?&]$/, "");
  }
  return [
    url,
    parts[2] || void 0,
    parts[3] || void 0
  ];
}
function parseSingleFFOrSafariStack(raw) {
  let line = raw.trim();
  if (SAFARI_NATIVE_CODE_REGEXP.test(line)) {
    return null;
  }
  if (line.includes(" > eval")) {
    line = line.replace(/ line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g, ":$1");
  }
  if (!line.includes("@")) {
    return null;
  }
  let atIndex = -1;
  let locationPart = "";
  let functionName2;
  for (let i3 = 0; i3 < line.length; i3++) {
    if (line[i3] === "@") {
      const candidateLocation = line.slice(i3 + 1);
      if (candidateLocation.includes(":") && candidateLocation.length >= 3) {
        atIndex = i3;
        locationPart = candidateLocation;
        functionName2 = i3 > 0 ? line.slice(0, i3) : void 0;
        break;
      }
    }
  }
  if (atIndex === -1 || !locationPart.includes(":") || locationPart.length < 3) {
    return null;
  }
  const [url, lineNumber, columnNumber] = extractLocation(locationPart);
  if (!url || !lineNumber || !columnNumber) {
    return null;
  }
  return {
    file: url,
    method: functionName2 || "",
    line: Number.parseInt(lineNumber),
    column: Number.parseInt(columnNumber)
  };
}
function parseSingleStack(raw) {
  const line = raw.trim();
  if (!CHROME_IE_STACK_REGEXP.test(line)) {
    return parseSingleFFOrSafariStack(line);
  }
  return parseSingleV8Stack(line);
}
function parseSingleV8Stack(raw) {
  let line = raw.trim();
  if (!CHROME_IE_STACK_REGEXP.test(line)) {
    return null;
  }
  if (line.includes("(eval ")) {
    line = line.replace(/eval code/g, "eval").replace(/(\(eval at [^()]*)|(,.*$)/g, "");
  }
  let sanitizedLine = line.replace(/^\s+/, "").replace(/\(eval code/g, "(").replace(/^.*?\s+/, "");
  const location = sanitizedLine.match(/ (\(.+\)$)/);
  sanitizedLine = location ? sanitizedLine.replace(location[0], "") : sanitizedLine;
  const [url, lineNumber, columnNumber] = extractLocation(location ? location[1] : sanitizedLine);
  let method = location && sanitizedLine || "";
  let file = url && ["eval", "<anonymous>"].includes(url) ? void 0 : url;
  if (!file || !lineNumber || !columnNumber) {
    return null;
  }
  if (method.startsWith("async ")) {
    method = method.slice(6);
  }
  if (file.startsWith("file://")) {
    file = file.slice(7);
  }
  file = file.startsWith("node:") || file.startsWith("internal:") ? file : resolve(file);
  if (method) {
    method = method.replace(/\(0\s?,\s?__vite_ssr_import_\d+__.(\w+)\)/g, "$1").replace(/__(vite_ssr_import|vi_import)_\d+__\./g, "").replace(/(Object\.)?__vite_ssr_export_default__\s?/g, "");
  }
  return {
    method,
    file,
    line: Number.parseInt(lineNumber),
    column: Number.parseInt(columnNumber)
  };
}
function parseStacktrace(stack, options = {}) {
  const { ignoreStackEntries = stackIgnorePatterns } = options;
  let stacks = !CHROME_IE_STACK_REGEXP.test(stack) ? parseFFOrSafariStackTrace(stack) : parseV8Stacktrace(stack);
  const helperIndex = stacks.findLastIndex((s2) => s2.method === "__VITEST_HELPER__" || s2.method === "async*__VITEST_HELPER__");
  if (helperIndex >= 0) {
    stacks = stacks.slice(helperIndex + 1);
  }
  return stacks.map((stack2) => {
    if (options.getUrlId) {
      stack2.file = options.getUrlId(stack2.file);
    }
    const map2 = options.getSourceMap?.(stack2.file);
    if (!map2 || typeof map2 !== "object" || !map2.version) {
      return shouldFilter(ignoreStackEntries, stack2.file) ? null : stack2;
    }
    const traceMap = new DecodedMap(map2, stack2.file);
    const position = getOriginalPosition(traceMap, stack2);
    if (!position) {
      return stack2;
    }
    const { line, column, source, name } = position;
    let file = source || stack2.file;
    if (file.match(/\/\w:\//)) {
      file = file.slice(1);
    }
    if (shouldFilter(ignoreStackEntries, file)) {
      return null;
    }
    if (line != null && column != null) {
      return {
        line,
        column,
        file,
        method: name || stack2.method
      };
    }
    return stack2;
  }).filter((s2) => s2 != null);
}
function shouldFilter(ignoreStackEntries, file) {
  return ignoreStackEntries.some((p2) => file.match(p2));
}
function parseFFOrSafariStackTrace(stack) {
  return stack.split("\n").map((line) => parseSingleFFOrSafariStack(line)).filter(notNullish);
}
function parseV8Stacktrace(stack) {
  return stack.split("\n").map((line) => parseSingleV8Stack(line)).filter(notNullish);
}
function parseErrorStacktrace(e3, options = {}) {
  if (!e3 || isPrimitive(e3)) {
    return [];
  }
  if ("stacks" in e3 && e3.stacks) {
    return e3.stacks;
  }
  const stackStr = e3.stack || "";
  let stackFrames = typeof stackStr === "string" ? parseStacktrace(stackStr, options) : [];
  if (!stackFrames.length) {
    const e_ = e3;
    if (e_.fileName != null && e_.lineNumber != null && e_.columnNumber != null) {
      stackFrames = parseStacktrace(`${e_.fileName}:${e_.lineNumber}:${e_.columnNumber}`, options);
    }
    if (e_.sourceURL != null && e_.line != null && e_._column != null) {
      stackFrames = parseStacktrace(`${e_.sourceURL}:${e_.line}:${e_.column}`, options);
    }
  }
  if (options.frameFilter) {
    stackFrames = stackFrames.filter((f2) => options.frameFilter(e3, f2) !== false);
  }
  e3.stacks = stackFrames;
  return stackFrames;
}
var DecodedMap = class {
  _encoded;
  _decoded;
  _decodedMemo;
  url;
  version;
  names = [];
  resolvedSources;
  constructor(map2, from) {
    this.map = map2;
    const { mappings, names, sources } = map2;
    this.version = map2.version;
    this.names = names || [];
    this._encoded = mappings || "";
    this._decodedMemo = memoizedState();
    this.url = from;
    this.resolvedSources = (sources || []).map((s2) => resolve(from, "..", s2 || ""));
  }
};
function memoizedState() {
  return {
    lastKey: -1,
    lastNeedle: -1,
    lastIndex: -1
  };
}
function getOriginalPosition(map2, needle) {
  const result = originalPositionFor(map2, needle);
  if (result.column == null) {
    return null;
  }
  return result;
}

// ../../node_modules/.pnpm/@vitest+runner@4.1.2/node_modules/@vitest/runner/dist/chunk-artifact.js
var PendingError = class extends Error {
  code = "VITEST_PENDING";
  taskId;
  constructor(message, task, note) {
    super(message);
    this.message = message;
    this.note = note;
    this.taskId = task.id;
  }
};
var FixtureDependencyError = class extends Error {
  name = "FixtureDependencyError";
};
var FixtureAccessError = class extends Error {
  name = "FixtureAccessError";
};
var FixtureParseError = class extends Error {
  name = "FixtureParseError";
};
var fnMap = /* @__PURE__ */ new WeakMap();
var testFixtureMap = /* @__PURE__ */ new WeakMap();
var hooksMap = /* @__PURE__ */ new WeakMap();
function setFn(key, fn2) {
  fnMap.set(key, fn2);
}
function setTestFixture(key, fixture) {
  testFixtureMap.set(key, fixture);
}
function getTestFixtures(key) {
  return testFixtureMap.get(key);
}
function setHooks(key, hooks) {
  hooksMap.set(key, hooks);
}
function getHooks(key) {
  return hooksMap.get(key);
}
var FIXTURE_STACK_TRACE_KEY = /* @__PURE__ */ Symbol.for("VITEST_FIXTURE_STACK_TRACE");
var TestFixtures = class _TestFixtures {
  _suiteContexts;
  _overrides = /* @__PURE__ */ new WeakMap();
  _registrations;
  static _definitions = [];
  static _builtinFixtures = [
    "task",
    "signal",
    "onTestFailed",
    "onTestFinished",
    "skip",
    "annotate"
  ];
  static _fixtureOptionKeys = [
    "auto",
    "injected",
    "scope"
  ];
  static _fixtureScopes = [
    "test",
    "file",
    "worker"
  ];
  static _workerContextSuite = { type: "worker" };
  static clearDefinitions() {
    _TestFixtures._definitions.length = 0;
  }
  static getWorkerContexts() {
    return _TestFixtures._definitions.map((f2) => f2.getWorkerContext());
  }
  static getFileContexts(file) {
    return _TestFixtures._definitions.map((f2) => f2.getFileContext(file));
  }
  static isFixtureOptions(obj) {
    return isObject(obj) && Object.keys(obj).some((key) => _TestFixtures._fixtureOptionKeys.includes(key));
  }
  constructor(registrations) {
    this._registrations = registrations ?? /* @__PURE__ */ new Map();
    this._suiteContexts = /* @__PURE__ */ new WeakMap();
    _TestFixtures._definitions.push(this);
  }
  extend(runner2, userFixtures) {
    const { suite: suite2 } = getCurrentSuite();
    const isTopLevel = !suite2 || suite2.file === suite2;
    const registrations = this.parseUserFixtures(runner2, userFixtures, isTopLevel);
    return new _TestFixtures(registrations);
  }
  get(suite2) {
    let currentSuite = suite2;
    while (currentSuite) {
      const overrides = this._overrides.get(currentSuite);
      if (overrides) {
        return overrides;
      }
      if (currentSuite === currentSuite.file) {
        break;
      }
      currentSuite = currentSuite.suite || currentSuite.file;
    }
    return this._registrations;
  }
  override(runner2, userFixtures) {
    const { suite: currentSuite, file } = getCurrentSuite();
    const suite2 = currentSuite || file;
    const isTopLevel = !currentSuite || currentSuite.file === currentSuite;
    const suiteRegistrations = new Map(this.get(suite2));
    const registrations = this.parseUserFixtures(runner2, userFixtures, isTopLevel, suiteRegistrations);
    if (isTopLevel) {
      this._registrations = registrations;
    } else {
      this._overrides.set(suite2, registrations);
    }
  }
  getFileContext(file) {
    if (!this._suiteContexts.has(file)) {
      this._suiteContexts.set(file, /* @__PURE__ */ Object.create(null));
    }
    return this._suiteContexts.get(file);
  }
  getWorkerContext() {
    if (!this._suiteContexts.has(_TestFixtures._workerContextSuite)) {
      this._suiteContexts.set(_TestFixtures._workerContextSuite, /* @__PURE__ */ Object.create(null));
    }
    return this._suiteContexts.get(_TestFixtures._workerContextSuite);
  }
  parseUserFixtures(runner2, userFixtures, supportNonTest, registrations = new Map(this._registrations)) {
    const errors = [];
    Object.entries(userFixtures).forEach(([name, fn2]) => {
      let options;
      let value;
      let _options;
      if (Array.isArray(fn2) && fn2.length >= 2 && _TestFixtures.isFixtureOptions(fn2[1])) {
        _options = fn2[1];
        options = {
          auto: _options.auto ?? false,
          scope: _options.scope ?? "test",
          injected: _options.injected ?? false
        };
        value = options.injected ? runner2.injectValue?.(name) ?? fn2[0] : fn2[0];
      } else {
        value = fn2;
      }
      const parent = registrations.get(name);
      if (parent && options) {
        if (parent.scope !== options.scope) {
          errors.push(new FixtureDependencyError(`The "${name}" fixture was already registered with a "${options.scope}" scope.`));
        }
        if (parent.auto !== options.auto) {
          errors.push(new FixtureDependencyError(`The "${name}" fixture was already registered as { auto: ${options.auto} }.`));
        }
      } else if (parent) {
        options = {
          auto: parent.auto,
          scope: parent.scope,
          injected: parent.injected
        };
      } else if (!options) {
        options = {
          auto: false,
          injected: false,
          scope: "test"
        };
      }
      if (options.scope && !_TestFixtures._fixtureScopes.includes(options.scope)) {
        errors.push(new FixtureDependencyError(`The "${name}" fixture has unknown scope "${options.scope}".`));
      }
      if (!supportNonTest && options.scope !== "test") {
        errors.push(new FixtureDependencyError(`The "${name}" fixture cannot be defined with a ${options.scope} scope${!_options?.scope && parent?.scope ? " (inherited from the base fixture)" : ""} inside the describe block. Define it at the top level of the file instead.`));
      }
      const deps = isFixtureFunction(value) ? getUsedProps(value) : /* @__PURE__ */ new Set();
      const item = {
        name,
        value,
        auto: options.auto ?? false,
        injected: options.injected ?? false,
        scope: options.scope ?? "test",
        deps,
        parent
      };
      if (isFixtureFunction(value)) {
        Object.assign(value, { [FIXTURE_STACK_TRACE_KEY]: new Error("STACK_TRACE_ERROR") });
      }
      registrations.set(name, item);
      if (item.scope === "worker" && (runner2.pool === "vmThreads" || runner2.pool === "vmForks")) {
        item.scope = "file";
      }
    });
    for (const fixture of registrations.values()) {
      for (const depName of fixture.deps) {
        if (_TestFixtures._builtinFixtures.includes(depName)) {
          continue;
        }
        const dep = registrations.get(depName);
        if (!dep) {
          errors.push(new FixtureDependencyError(`The "${fixture.name}" fixture depends on unknown fixture "${depName}".`));
          continue;
        }
        if (depName === fixture.name && !fixture.parent) {
          errors.push(new FixtureDependencyError(`The "${fixture.name}" fixture depends on itself, but does not have a base implementation.`));
          continue;
        }
        if (_TestFixtures._fixtureScopes.indexOf(fixture.scope) > _TestFixtures._fixtureScopes.indexOf(dep.scope)) {
          errors.push(new FixtureDependencyError(`The ${fixture.scope} "${fixture.name}" fixture cannot depend on a ${dep.scope} fixture "${dep.name}".`));
          continue;
        }
      }
    }
    if (errors.length === 1) {
      throw errors[0];
    } else if (errors.length > 1) {
      throw new AggregateError(errors, "Cannot resolve user fixtures. See errors for more information.");
    }
    return registrations;
  }
};
var cleanupFnArrayMap = /* @__PURE__ */ new WeakMap();
var contextHasFixturesCache = /* @__PURE__ */ new WeakMap();
function withFixtures(fn2, options) {
  const collector = getCurrentSuite();
  const suite2 = options?.suite || collector.suite || collector.file;
  return async (hookContext) => {
    const context = hookContext || options?.context;
    if (!context) {
      if (options?.suiteHook) {
        validateSuiteHook(fn2, options.suiteHook, options.stackTraceError);
      }
      return fn2({});
    }
    const fixtures = options?.fixtures || getTestFixtures(context);
    if (!fixtures) {
      return fn2(context);
    }
    const registrations = fixtures.get(suite2);
    if (!registrations.size) {
      return fn2(context);
    }
    const usedFixtures = [];
    const usedProps = getUsedProps(fn2);
    for (const fixture of registrations.values()) {
      if (fixture.auto || usedProps.has(fixture.name)) {
        usedFixtures.push(fixture);
      }
    }
    if (!usedFixtures.length) {
      return fn2(context);
    }
    if (!cleanupFnArrayMap.has(context)) {
      cleanupFnArrayMap.set(context, []);
    }
    const cleanupFnArray = cleanupFnArrayMap.get(context);
    const pendingFixtures = resolveDeps(usedFixtures, registrations);
    if (!pendingFixtures.length) {
      return fn2(context);
    }
    if (options?.suiteHook) {
      const testScopedFixtures = pendingFixtures.filter((f2) => f2.scope === "test");
      if (testScopedFixtures.length > 0) {
        const fixtureNames = testScopedFixtures.map((f2) => `"${f2.name}"`).join(", ");
        const alternativeHook = {
          aroundAll: "aroundEach",
          beforeAll: "beforeEach",
          afterAll: "afterEach"
        };
        const error = new FixtureDependencyError(`Test-scoped fixtures cannot be used inside ${options.suiteHook} hook. The following fixtures are test-scoped: ${fixtureNames}. Use { scope: 'file' } or { scope: 'worker' } fixtures instead, or move the logic to ${alternativeHook[options.suiteHook]} hook.`);
        if (options.stackTraceError?.stack) {
          error.stack = error.message + options.stackTraceError.stack.replace(options.stackTraceError.message, "");
        }
        throw error;
      }
    }
    if (!contextHasFixturesCache.has(context)) {
      contextHasFixturesCache.set(context, /* @__PURE__ */ new WeakSet());
    }
    const cachedFixtures = contextHasFixturesCache.get(context);
    for (const fixture of pendingFixtures) {
      if (fixture.scope === "test") {
        if (cachedFixtures.has(fixture)) {
          continue;
        }
        cachedFixtures.add(fixture);
        const resolvedValue = await resolveTestFixtureValue(fixture, context, cleanupFnArray);
        context[fixture.name] = resolvedValue;
        cleanupFnArray.push(() => {
          cachedFixtures.delete(fixture);
        });
      } else {
        const resolvedValue = await resolveScopeFixtureValue(fixtures, suite2, fixture);
        context[fixture.name] = resolvedValue;
      }
    }
    return fn2(context);
  };
}
function isFixtureFunction(value) {
  return typeof value === "function";
}
function resolveTestFixtureValue(fixture, context, cleanupFnArray) {
  if (!isFixtureFunction(fixture.value)) {
    return fixture.value;
  }
  return resolveFixtureFunction(fixture.value, fixture.name, context, cleanupFnArray);
}
var scopedFixturePromiseCache = /* @__PURE__ */ new WeakMap();
async function resolveScopeFixtureValue(fixtures, suite2, fixture) {
  const workerContext = fixtures.getWorkerContext();
  const fileContext = fixtures.getFileContext(suite2.file);
  const fixtureContext = fixture.scope === "worker" ? workerContext : fileContext;
  if (!isFixtureFunction(fixture.value)) {
    fixtureContext[fixture.name] = fixture.value;
    return fixture.value;
  }
  if (fixture.name in fixtureContext) {
    return fixtureContext[fixture.name];
  }
  if (scopedFixturePromiseCache.has(fixture)) {
    return scopedFixturePromiseCache.get(fixture);
  }
  if (!cleanupFnArrayMap.has(fixtureContext)) {
    cleanupFnArrayMap.set(fixtureContext, []);
  }
  const cleanupFnFileArray = cleanupFnArrayMap.get(fixtureContext);
  const promise = resolveFixtureFunction(fixture.value, fixture.name, fixture.scope === "file" ? {
    ...workerContext,
    ...fileContext
  } : fixtureContext, cleanupFnFileArray).then((value) => {
    fixtureContext[fixture.name] = value;
    scopedFixturePromiseCache.delete(fixture);
    return value;
  });
  scopedFixturePromiseCache.set(fixture, promise);
  return promise;
}
async function resolveFixtureFunction(fixtureFn, fixtureName, context, cleanupFnArray) {
  const useFnArgPromise = createDefer();
  const stackTraceError = FIXTURE_STACK_TRACE_KEY in fixtureFn && fixtureFn[FIXTURE_STACK_TRACE_KEY] instanceof Error ? fixtureFn[FIXTURE_STACK_TRACE_KEY] : void 0;
  let isUseFnArgResolved = false;
  const fixtureReturn = fixtureFn(context, async (useFnArg) => {
    isUseFnArgResolved = true;
    useFnArgPromise.resolve(useFnArg);
    const useReturnPromise = createDefer();
    cleanupFnArray.push(async () => {
      useReturnPromise.resolve();
      await fixtureReturn;
    });
    await useReturnPromise;
  }).then(() => {
    if (!isUseFnArgResolved) {
      const error = new Error(`Fixture "${fixtureName}" returned without calling "use". Make sure to call "use" in every code path of the fixture function.`);
      if (stackTraceError?.stack) {
        error.stack = error.message + stackTraceError.stack.replace(stackTraceError.message, "");
      }
      useFnArgPromise.reject(error);
    }
  }).catch((e3) => {
    if (!isUseFnArgResolved) {
      useFnArgPromise.reject(e3);
      return;
    }
    throw e3;
  });
  return useFnArgPromise;
}
function resolveDeps(usedFixtures, registrations, depSet = /* @__PURE__ */ new Set(), pendingFixtures = []) {
  usedFixtures.forEach((fixture) => {
    if (pendingFixtures.includes(fixture)) {
      return;
    }
    if (!isFixtureFunction(fixture.value) || !fixture.deps) {
      pendingFixtures.push(fixture);
      return;
    }
    if (depSet.has(fixture)) {
      if (fixture.parent) {
        fixture = fixture.parent;
      } else {
        throw new Error(`Circular fixture dependency detected: ${fixture.name} <- ${[...depSet].reverse().map((d3) => d3.name).join(" <- ")}`);
      }
    }
    depSet.add(fixture);
    resolveDeps([...fixture.deps].map((n2) => n2 === fixture.name ? fixture.parent : registrations.get(n2)).filter((n2) => !!n2), registrations, depSet, pendingFixtures);
    pendingFixtures.push(fixture);
    depSet.clear();
  });
  return pendingFixtures;
}
function validateSuiteHook(fn2, hook, suiteError) {
  const usedProps = getUsedProps(fn2, {
    sourceError: suiteError,
    suiteHook: hook
  });
  if (usedProps.size) {
    const error = new FixtureAccessError(`The ${hook} hook uses fixtures "${[...usedProps].join('", "')}", but has no access to context. Did you forget to call it as "test.${hook}()" instead of "${hook}()"?
If you used internal "suite" task as the first argument previously, access it in the second argument instead. See https://vitest.dev/guide/test-context#suite-level-hooks`);
    if (suiteError) {
      error.stack = suiteError.stack?.replace(suiteError.message, error.message);
    }
    throw error;
  }
}
var kPropsSymbol = /* @__PURE__ */ Symbol("$vitest:fixture-props");
var kPropNamesSymbol = /* @__PURE__ */ Symbol("$vitest:fixture-prop-names");
function configureProps(fn2, options) {
  Object.defineProperty(fn2, kPropsSymbol, {
    value: options,
    enumerable: false
  });
}
function memoProps(fn2, props) {
  fn2[kPropNamesSymbol] = props;
  return props;
}
function getUsedProps(fn2, { sourceError, suiteHook } = {}) {
  if (kPropNamesSymbol in fn2) {
    return fn2[kPropNamesSymbol];
  }
  const { index: fixturesIndex = 0, original: implementation = fn2 } = kPropsSymbol in fn2 ? fn2[kPropsSymbol] : {};
  let fnString = filterOutComments(implementation.toString());
  if (/__async\((?:this|null), (?:null|arguments|\[[_0-9, ]*\]), function\*/.test(fnString)) {
    fnString = fnString.split(/__async\((?:this|null),/)[1];
  }
  const match = fnString.match(/[^(]*\(([^)]*)/);
  if (!match) {
    return memoProps(fn2, /* @__PURE__ */ new Set());
  }
  const args = splitByComma(match[1]);
  if (!args.length) {
    return memoProps(fn2, /* @__PURE__ */ new Set());
  }
  const fixturesArgument = args[fixturesIndex];
  if (!fixturesArgument) {
    return memoProps(fn2, /* @__PURE__ */ new Set());
  }
  if (!(fixturesArgument[0] === "{" && fixturesArgument.endsWith("}"))) {
    const ordinalArgument = ordinal(fixturesIndex + 1);
    const error = new FixtureParseError(`The ${ordinalArgument} argument inside a fixture must use object destructuring pattern, e.g. ({ task } => {}). Instead, received "${fixturesArgument}".${suiteHook ? ` If you used internal "suite" task as the ${ordinalArgument} argument previously, access it in the ${ordinal(fixturesIndex + 2)} argument instead.` : ""}`);
    if (sourceError) {
      error.stack = sourceError.stack?.replace(sourceError.message, error.message);
    }
    throw error;
  }
  const _first = fixturesArgument.slice(1, -1).replace(/\s/g, "");
  const props = splitByComma(_first).map((prop) => {
    return prop.replace(/:.*|=.*/g, "");
  });
  const last = props.at(-1);
  if (last && last.startsWith("...")) {
    const error = new FixtureParseError(`Rest parameters are not supported in fixtures, received "${last}".`);
    if (sourceError) {
      error.stack = sourceError.stack?.replace(sourceError.message, error.message);
    }
    throw error;
  }
  return memoProps(fn2, new Set(props));
}
function splitByComma(s2) {
  const result = [];
  const stack = [];
  let start = 0;
  for (let i3 = 0; i3 < s2.length; i3++) {
    if (s2[i3] === "{" || s2[i3] === "[") {
      stack.push(s2[i3] === "{" ? "}" : "]");
    } else if (s2[i3] === stack.at(-1)) {
      stack.pop();
    } else if (!stack.length && s2[i3] === ",") {
      const token = s2.substring(start, i3).trim();
      if (token) {
        result.push(token);
      }
      start = i3 + 1;
    }
  }
  const lastToken = s2.substring(start).trim();
  if (lastToken) {
    result.push(lastToken);
  }
  return result;
}
var _test;
function getCurrentTest() {
  return _test;
}
var kChainableContext = /* @__PURE__ */ Symbol("kChainableContext");
function getChainableContext(chainable) {
  return chainable?.[kChainableContext];
}
function createChainable(keys2, fn2, context) {
  function create(context2) {
    const chain2 = function(...args) {
      return fn2.apply(context2, args);
    };
    Object.assign(chain2, fn2);
    Object.defineProperty(chain2, kChainableContext, {
      value: {
        withContext: () => chain2.bind(context2),
        getFixtures: () => context2.fixtures,
        setContext: (key, value) => {
          context2[key] = value;
        },
        mergeContext: (ctx) => {
          Object.assign(context2, ctx);
        }
      },
      enumerable: false
    });
    for (const key of keys2) {
      Object.defineProperty(chain2, key, { get() {
        return create({
          ...context2,
          [key]: true
        });
      } });
    }
    return chain2;
  }
  const chain = create(context ?? {});
  Object.defineProperty(chain, "fn", {
    value: fn2,
    enumerable: false
  });
  return chain;
}
function getDefaultHookTimeout() {
  return getRunner().config.hookTimeout;
}
var CLEANUP_TIMEOUT_KEY = /* @__PURE__ */ Symbol.for("VITEST_CLEANUP_TIMEOUT");
var CLEANUP_STACK_TRACE_KEY = /* @__PURE__ */ Symbol.for("VITEST_CLEANUP_STACK_TRACE");
var AROUND_TIMEOUT_KEY = /* @__PURE__ */ Symbol.for("VITEST_AROUND_TIMEOUT");
var AROUND_STACK_TRACE_KEY = /* @__PURE__ */ Symbol.for("VITEST_AROUND_STACK_TRACE");
function beforeAll(fn2, timeout = getDefaultHookTimeout()) {
  assertTypes(fn2, '"beforeAll" callback', ["function"]);
  const stackTraceError = new Error("STACK_TRACE_ERROR");
  const context = getChainableContext(this);
  return getCurrentSuite().on("beforeAll", Object.assign(withTimeout(withSuiteFixtures("beforeAll", fn2, context, stackTraceError), timeout, true, stackTraceError), {
    [CLEANUP_TIMEOUT_KEY]: timeout,
    [CLEANUP_STACK_TRACE_KEY]: stackTraceError
  }));
}
function afterAll(fn2, timeout) {
  assertTypes(fn2, '"afterAll" callback', ["function"]);
  const context = getChainableContext(this);
  const stackTraceError = new Error("STACK_TRACE_ERROR");
  return getCurrentSuite().on("afterAll", withTimeout(withSuiteFixtures("afterAll", fn2, context, stackTraceError), timeout ?? getDefaultHookTimeout(), true, stackTraceError));
}
function beforeEach2(fn2, timeout = getDefaultHookTimeout()) {
  assertTypes(fn2, '"beforeEach" callback', ["function"]);
  const stackTraceError = new Error("STACK_TRACE_ERROR");
  const wrapper = (context, suite2) => {
    const fixtureResolver = withFixtures(fn2, { suite: suite2 });
    return fixtureResolver(context);
  };
  return getCurrentSuite().on("beforeEach", Object.assign(withTimeout(wrapper, timeout ?? getDefaultHookTimeout(), true, stackTraceError, abortIfTimeout), {
    [CLEANUP_TIMEOUT_KEY]: timeout,
    [CLEANUP_STACK_TRACE_KEY]: stackTraceError
  }));
}
function afterEach(fn2, timeout) {
  assertTypes(fn2, '"afterEach" callback', ["function"]);
  const wrapper = (context, suite2) => {
    const fixtureResolver = withFixtures(fn2, { suite: suite2 });
    return fixtureResolver(context);
  };
  return getCurrentSuite().on("afterEach", withTimeout(wrapper, timeout ?? getDefaultHookTimeout(), true, new Error("STACK_TRACE_ERROR"), abortIfTimeout));
}
var onTestFailed = createTestHook("onTestFailed", (test5, handler, timeout) => {
  test5.onFailed ||= [];
  test5.onFailed.push(withTimeout(handler, timeout ?? getDefaultHookTimeout(), true, new Error("STACK_TRACE_ERROR"), abortIfTimeout));
});
var onTestFinished = createTestHook("onTestFinished", (test5, handler, timeout) => {
  test5.onFinished ||= [];
  test5.onFinished.push(withTimeout(handler, timeout ?? getDefaultHookTimeout(), true, new Error("STACK_TRACE_ERROR"), abortIfTimeout));
});
function aroundAll(fn2, timeout) {
  assertTypes(fn2, '"aroundAll" callback', ["function"]);
  const stackTraceError = new Error("STACK_TRACE_ERROR");
  const resolvedTimeout = timeout ?? getDefaultHookTimeout();
  const context = getChainableContext(this);
  return getCurrentSuite().on("aroundAll", Object.assign(withSuiteFixtures("aroundAll", fn2, context, stackTraceError, 1), {
    [AROUND_TIMEOUT_KEY]: resolvedTimeout,
    [AROUND_STACK_TRACE_KEY]: stackTraceError
  }));
}
function aroundEach(fn2, timeout) {
  assertTypes(fn2, '"aroundEach" callback', ["function"]);
  const stackTraceError = new Error("STACK_TRACE_ERROR");
  const resolvedTimeout = timeout ?? getDefaultHookTimeout();
  const wrapper = (runTest, context, suite2) => {
    const innerFn = (ctx) => fn2(runTest, ctx, suite2);
    configureProps(innerFn, {
      index: 1,
      original: fn2
    });
    const fixtureResolver = withFixtures(innerFn, { suite: suite2 });
    return fixtureResolver(context);
  };
  return getCurrentSuite().on("aroundEach", Object.assign(wrapper, {
    [AROUND_TIMEOUT_KEY]: resolvedTimeout,
    [AROUND_STACK_TRACE_KEY]: stackTraceError
  }));
}
function withSuiteFixtures(suiteHook, fn2, context, stackTraceError, contextIndex = 0) {
  return (...args) => {
    const suite2 = args.at(-1);
    const prefix = args.slice(0, -1);
    const wrapper = (ctx) => fn2(...prefix, ctx, suite2);
    configureProps(wrapper, {
      index: contextIndex,
      original: fn2
    });
    const fixtures = context?.getFixtures();
    const fileContext = fixtures?.getFileContext(suite2.file);
    const fixtured = withFixtures(wrapper, {
      suiteHook,
      fixtures,
      context: fileContext,
      stackTraceError
    });
    return fixtured();
  };
}
function createTestHook(name, handler) {
  return (fn2, timeout) => {
    assertTypes(fn2, `"${name}" callback`, ["function"]);
    const current = getCurrentTest();
    if (!current) {
      throw new Error(`Hook ${name}() can only be called inside a test`);
    }
    return handler(current, fn2, timeout);
  };
}
function findTestFileStackTrace(testFilePath, error) {
  const lines = error.split("\n").slice(1);
  for (const line of lines) {
    const stack = parseSingleStack(line);
    if (stack && stack.file === testFilePath) {
      return stack;
    }
  }
}
function validateTags(config2, tags) {
  if (!config2.strictTags) {
    return;
  }
  const availableTags = new Set(config2.tags.map((tag) => tag.name));
  for (const tag of tags) {
    if (!availableTags.has(tag)) {
      throw createNoTagsError(config2.tags, tag);
    }
  }
}
function createNoTagsError(availableTags, tag, prefix = "tag") {
  if (!availableTags.length) {
    throw new Error(`The Vitest config does't define any "tags", cannot apply "${tag}" ${prefix} for this test. See: https://vitest.dev/guide/test-tags`);
  }
  throw new Error(`The ${prefix} "${tag}" is not defined in the configuration. Available tags are:
${availableTags.map((t) => `- ${t.name}${t.description ? `: ${t.description}` : ""}`).join("\n")}`);
}
function getNames(task) {
  const names = [task.name];
  let current = task;
  while (current?.suite) {
    current = current.suite;
    if (current?.name) {
      names.unshift(current.name);
    }
  }
  if (current !== task.file) {
    names.unshift(task.file.name);
  }
  return names;
}
function createTaskName(names, separator = " > ") {
  return names.filter((name) => name !== void 0).join(separator);
}
var suite = createSuite();
var test2 = createTest(function(name, optionsOrFn, optionsOrTest) {
  if (getCurrentTest()) {
    throw new Error('Calling the test function inside another test function is not allowed. Please put it inside "describe" or "suite" so it can be properly collected.');
  }
  getCurrentSuite().test.fn.call(this, formatName(name), optionsOrFn, optionsOrTest);
});
var runner;
var defaultSuite;
var currentTestFilepath;
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Vitest failed to find ${message}. One of the following is possible:
- "vitest" is imported directly without running "vitest" command
- "vitest" is imported inside "globalSetup" (to fix this, use "setupFiles" instead, because "globalSetup" runs in a different context)
- "vitest" is imported inside Vite / Vitest config file
- Otherwise, it might be a Vitest bug. Please report it to https://github.com/vitest-dev/vitest/issues
`);
  }
}
function getRunner() {
  assert(runner, "the runner");
  return runner;
}
function getCurrentSuite() {
  const currentSuite = collectorContext.currentSuite || defaultSuite;
  assert(currentSuite, "the current suite");
  return currentSuite;
}
function createSuiteHooks() {
  return {
    beforeAll: [],
    afterAll: [],
    beforeEach: [],
    afterEach: [],
    aroundEach: [],
    aroundAll: []
  };
}
var POSITIVE_INFINITY = Number.POSITIVE_INFINITY;
function parseArguments(optionsOrFn, timeoutOrTest) {
  if (timeoutOrTest != null && typeof timeoutOrTest === "object") {
    throw new TypeError(`Signature "test(name, fn, { ... })" was deprecated in Vitest 3 and removed in Vitest 4. Please, provide options as a second argument instead.`);
  }
  let options = {};
  let fn2;
  if (typeof timeoutOrTest === "number") {
    options = { timeout: timeoutOrTest };
  } else if (typeof optionsOrFn === "object") {
    options = optionsOrFn;
  }
  if (typeof optionsOrFn === "function") {
    if (typeof timeoutOrTest === "function") {
      throw new TypeError("Cannot use two functions as arguments. Please use the second argument for options.");
    }
    fn2 = optionsOrFn;
  } else if (typeof timeoutOrTest === "function") {
    fn2 = timeoutOrTest;
  }
  return {
    options,
    handler: fn2
  };
}
function createSuiteCollector(name, factory = () => {
}, mode, each, suiteOptions) {
  const tasks = [];
  let suite2;
  initSuite(true);
  const task = function(name2 = "", options = {}) {
    const currentSuite = collectorContext.currentSuite?.suite;
    const parentTask = currentSuite ?? collectorContext.currentSuite?.file;
    const parentTags = parentTask?.tags || [];
    const testTags = unique([...parentTags, ...toArray(options.tags)]);
    const tagsOptions = testTags.map((tag) => {
      const tagDefinition = runner.config.tags?.find((t) => t.name === tag);
      if (!tagDefinition && runner.config.strictTags) {
        throw createNoTagsError(runner.config.tags, tag);
      }
      return tagDefinition;
    }).filter((r2) => r2 != null).sort((tag1, tag2) => (tag2.priority ?? POSITIVE_INFINITY) - (tag1.priority ?? POSITIVE_INFINITY)).reduce((acc, tag) => {
      const { name: name3, description, priority, meta, ...options2 } = tag;
      Object.assign(acc, options2);
      if (meta) {
        acc.meta = Object.assign(acc.meta ?? /* @__PURE__ */ Object.create(null), meta);
      }
      return acc;
    }, {});
    const testOwnMeta = options.meta;
    options = {
      ...tagsOptions,
      ...options
    };
    const timeout = options.timeout ?? runner.config.testTimeout;
    const parentMeta = currentSuite?.meta;
    const tagMeta = tagsOptions.meta;
    const testMeta = /* @__PURE__ */ Object.create(null);
    if (tagMeta) {
      Object.assign(testMeta, tagMeta);
    }
    if (parentMeta) {
      Object.assign(testMeta, parentMeta);
    }
    if (testOwnMeta) {
      Object.assign(testMeta, testOwnMeta);
    }
    const task2 = {
      id: "",
      name: name2,
      fullName: createTaskName([currentSuite?.fullName ?? collectorContext.currentSuite?.file?.fullName, name2]),
      fullTestName: createTaskName([currentSuite?.fullTestName, name2]),
      suite: currentSuite,
      each: options.each,
      fails: options.fails,
      context: void 0,
      type: "test",
      file: currentSuite?.file ?? collectorContext.currentSuite?.file,
      timeout,
      retry: options.retry ?? runner.config.retry,
      repeats: options.repeats,
      mode: options.only ? "only" : options.skip ? "skip" : options.todo ? "todo" : "run",
      meta: testMeta,
      annotations: [],
      artifacts: [],
      tags: testTags
    };
    const handler = options.handler;
    if (task2.mode === "run" && !handler) {
      task2.mode = "todo";
    }
    if (options.concurrent || !options.sequential && runner.config.sequence.concurrent) {
      task2.concurrent = true;
    }
    task2.shuffle = suiteOptions?.shuffle;
    const context = createTestContext(task2, runner);
    Object.defineProperty(task2, "context", {
      value: context,
      enumerable: false
    });
    setTestFixture(context, options.fixtures ?? new TestFixtures());
    const limit = Error.stackTraceLimit;
    Error.stackTraceLimit = 10;
    const stackTraceError = new Error("STACK_TRACE_ERROR");
    Error.stackTraceLimit = limit;
    if (handler) {
      setFn(task2, withTimeout(withCancel(withAwaitAsyncAssertions(withFixtures(handler, { context }), task2), task2.context.signal), timeout, false, stackTraceError, (_2, error) => abortIfTimeout([context], error)));
    }
    if (runner.config.includeTaskLocation) {
      const error = stackTraceError.stack;
      const stack = findTestFileStackTrace(currentTestFilepath, error);
      if (stack) {
        task2.location = {
          line: stack.line,
          column: stack.column
        };
      }
    }
    tasks.push(task2);
    return task2;
  };
  const test5 = createTest(function(name2, optionsOrFn, timeoutOrTest) {
    let { options, handler } = parseArguments(optionsOrFn, timeoutOrTest);
    if (typeof suiteOptions === "object") {
      options = Object.assign({}, suiteOptions, options);
    }
    const concurrent = this.concurrent ?? (!this.sequential && options?.concurrent);
    if (options.concurrent != null && concurrent != null) {
      options.concurrent = concurrent;
    }
    const sequential = this.sequential ?? (!this.concurrent && options?.sequential);
    if (options.sequential != null && sequential != null) {
      options.sequential = sequential;
    }
    const test6 = task(formatName(name2), {
      ...this,
      ...options,
      handler
    });
    test6.type = "test";
  });
  const collector = {
    type: "collector",
    name,
    mode,
    suite: suite2,
    options: suiteOptions,
    test: test5,
    file: suite2.file,
    tasks,
    collect,
    task,
    clear,
    on: addHook
  };
  function addHook(name2, ...fn2) {
    getHooks(suite2)[name2].push(...fn2);
  }
  function initSuite(includeLocation) {
    if (typeof suiteOptions === "number") {
      suiteOptions = { timeout: suiteOptions };
    }
    const currentSuite = collectorContext.currentSuite?.suite;
    const parentTask = currentSuite ?? collectorContext.currentSuite?.file;
    const suiteTags = toArray(suiteOptions?.tags);
    validateTags(runner.config, suiteTags);
    suite2 = {
      id: "",
      type: "suite",
      name,
      fullName: createTaskName([currentSuite?.fullName ?? collectorContext.currentSuite?.file?.fullName, name]),
      fullTestName: createTaskName([currentSuite?.fullTestName, name]),
      suite: currentSuite,
      mode,
      each,
      file: currentSuite?.file ?? collectorContext.currentSuite?.file,
      shuffle: suiteOptions?.shuffle,
      tasks: [],
      meta: suiteOptions?.meta ?? /* @__PURE__ */ Object.create(null),
      concurrent: suiteOptions?.concurrent,
      tags: unique([...parentTask?.tags || [], ...suiteTags])
    };
    if (runner && includeLocation && runner.config.includeTaskLocation) {
      const limit = Error.stackTraceLimit;
      Error.stackTraceLimit = 15;
      const error = new Error("stacktrace").stack;
      Error.stackTraceLimit = limit;
      const stack = findTestFileStackTrace(currentTestFilepath, error);
      if (stack) {
        suite2.location = {
          line: stack.line,
          column: stack.column
        };
      }
    }
    setHooks(suite2, createSuiteHooks());
  }
  function clear() {
    tasks.length = 0;
    initSuite(false);
  }
  async function collect(file) {
    if (!file) {
      throw new TypeError("File is required to collect tasks.");
    }
    if (factory) {
      await runWithSuite(collector, () => factory(test5));
    }
    const allChildren = [];
    for (const i3 of tasks) {
      allChildren.push(i3.type === "collector" ? await i3.collect(file) : i3);
    }
    suite2.tasks = allChildren;
    return suite2;
  }
  collectTask(collector);
  return collector;
}
function withAwaitAsyncAssertions(fn2, task) {
  return (async (...args) => {
    const fnResult = await fn2(...args);
    if (task.promises) {
      const result = await Promise.allSettled(task.promises);
      const errors = result.map((r2) => r2.status === "rejected" ? r2.reason : void 0).filter(Boolean);
      if (errors.length) {
        throw errors;
      }
    }
    return fnResult;
  });
}
function createSuite() {
  function suiteFn(name, factoryOrOptions, optionsOrFactory) {
    if (getCurrentTest()) {
      throw new Error("Calling the suite function inside test function is not allowed. It can be only called at the top level or inside another suite function.");
    }
    const currentSuite = collectorContext.currentSuite || defaultSuite;
    let { options, handler: factory } = parseArguments(factoryOrOptions, optionsOrFactory);
    const isConcurrentSpecified = options.concurrent || this.concurrent || options.sequential === false;
    const isSequentialSpecified = options.sequential || this.sequential || options.concurrent === false;
    const { meta: parentMeta, ...parentOptions } = currentSuite?.options || {};
    options = {
      ...parentOptions,
      ...options
    };
    const shuffle2 = this.shuffle ?? options.shuffle ?? currentSuite?.options?.shuffle ?? runner?.config.sequence.shuffle;
    if (shuffle2 != null) {
      options.shuffle = shuffle2;
    }
    let mode = this.only ?? options.only ? "only" : this.skip ?? options.skip ? "skip" : this.todo ?? options.todo ? "todo" : "run";
    if (mode === "run" && !factory) {
      mode = "todo";
    }
    const isConcurrent = isConcurrentSpecified || options.concurrent && !isSequentialSpecified;
    const isSequential = isSequentialSpecified || options.sequential && !isConcurrentSpecified;
    if (isConcurrent != null) {
      options.concurrent = isConcurrent && !isSequential;
    }
    if (isSequential != null) {
      options.sequential = isSequential && !isConcurrent;
    }
    if (parentMeta) {
      options.meta = Object.assign(/* @__PURE__ */ Object.create(null), parentMeta, options.meta);
    }
    return createSuiteCollector(formatName(name), factory, mode, this.each, options);
  }
  suiteFn.each = function(cases, ...args) {
    const context = getChainableContext(this);
    const suite2 = context.withContext();
    context.setContext("each", true);
    if (Array.isArray(cases) && args.length) {
      cases = formatTemplateString(cases, args);
    }
    return (name, optionsOrFn, fnOrOptions) => {
      const _name = formatName(name);
      const arrayOnlyCases = cases.every(Array.isArray);
      const { options, handler } = parseArguments(optionsOrFn, fnOrOptions);
      const fnFirst = typeof optionsOrFn === "function";
      cases.forEach((i3, idx) => {
        const items = Array.isArray(i3) ? i3 : [i3];
        if (fnFirst) {
          if (arrayOnlyCases) {
            suite2(formatTitle(_name, items, idx), handler ? () => handler(...items) : void 0, options.timeout);
          } else {
            suite2(formatTitle(_name, items, idx), handler ? () => handler(i3) : void 0, options.timeout);
          }
        } else {
          if (arrayOnlyCases) {
            suite2(formatTitle(_name, items, idx), options, handler ? () => handler(...items) : void 0);
          } else {
            suite2(formatTitle(_name, items, idx), options, handler ? () => handler(i3) : void 0);
          }
        }
      });
      context.setContext("each", void 0);
    };
  };
  suiteFn.for = function(cases, ...args) {
    if (Array.isArray(cases) && args.length) {
      cases = formatTemplateString(cases, args);
    }
    return (name, optionsOrFn, fnOrOptions) => {
      const name_ = formatName(name);
      const { options, handler } = parseArguments(optionsOrFn, fnOrOptions);
      cases.forEach((item, idx) => {
        suite(formatTitle(name_, toArray(item), idx), options, handler ? () => handler(item) : void 0);
      });
    };
  };
  suiteFn.skipIf = (condition) => condition ? suite.skip : suite;
  suiteFn.runIf = (condition) => condition ? suite : suite.skip;
  return createChainable([
    "concurrent",
    "sequential",
    "shuffle",
    "skip",
    "only",
    "todo"
  ], suiteFn);
}
function createTaskCollector(fn2) {
  const taskFn = fn2;
  taskFn.each = function(cases, ...args) {
    const context = getChainableContext(this);
    const test5 = context.withContext();
    context.setContext("each", true);
    if (Array.isArray(cases) && args.length) {
      cases = formatTemplateString(cases, args);
    }
    return (name, optionsOrFn, fnOrOptions) => {
      const _name = formatName(name);
      const arrayOnlyCases = cases.every(Array.isArray);
      const { options, handler } = parseArguments(optionsOrFn, fnOrOptions);
      const fnFirst = typeof optionsOrFn === "function";
      cases.forEach((i3, idx) => {
        const items = Array.isArray(i3) ? i3 : [i3];
        if (fnFirst) {
          if (arrayOnlyCases) {
            test5(formatTitle(_name, items, idx), handler ? () => handler(...items) : void 0, options.timeout);
          } else {
            test5(formatTitle(_name, items, idx), handler ? () => handler(i3) : void 0, options.timeout);
          }
        } else {
          if (arrayOnlyCases) {
            test5(formatTitle(_name, items, idx), options, handler ? () => handler(...items) : void 0);
          } else {
            test5(formatTitle(_name, items, idx), options, handler ? () => handler(i3) : void 0);
          }
        }
      });
      context.setContext("each", void 0);
    };
  };
  taskFn.for = function(cases, ...args) {
    const context = getChainableContext(this);
    const test5 = context.withContext();
    if (Array.isArray(cases) && args.length) {
      cases = formatTemplateString(cases, args);
    }
    return (name, optionsOrFn, fnOrOptions) => {
      const _name = formatName(name);
      const { options, handler } = parseArguments(optionsOrFn, fnOrOptions);
      cases.forEach((item, idx) => {
        const handlerWrapper = handler ? (ctx) => handler(item, ctx) : void 0;
        if (handlerWrapper) {
          configureProps(handlerWrapper, {
            index: 1,
            original: handler
          });
        }
        test5(formatTitle(_name, toArray(item), idx), options, handlerWrapper);
      });
    };
  };
  taskFn.skipIf = function(condition) {
    return condition ? this.skip : this;
  };
  taskFn.runIf = function(condition) {
    return condition ? this : this.skip;
  };
  function parseBuilderFixtures(fixturesOrName, optionsOrFn, maybeFn) {
    if (typeof fixturesOrName !== "string") {
      return fixturesOrName;
    }
    const fixtureName = fixturesOrName;
    let fixtureOptions;
    let fixtureValue;
    if (maybeFn !== void 0) {
      fixtureOptions = optionsOrFn;
      fixtureValue = maybeFn;
    } else {
      if (optionsOrFn !== null && typeof optionsOrFn === "object" && !Array.isArray(optionsOrFn) && TestFixtures.isFixtureOptions(optionsOrFn)) {
        fixtureOptions = optionsOrFn;
        fixtureValue = {};
      } else {
        fixtureOptions = void 0;
        fixtureValue = optionsOrFn;
      }
    }
    if (typeof fixtureValue === "function") {
      const builderFn = fixtureValue;
      const fixture = async (ctx, use2) => {
        let cleanup;
        const onCleanup = (fn3) => {
          if (cleanup !== void 0) {
            throw new Error(`onCleanup can only be called once per fixture. Define separate fixtures if you need multiple cleanup functions.`);
          }
          cleanup = fn3;
        };
        const value = await builderFn(ctx, { onCleanup });
        await use2(value);
        if (cleanup) {
          await cleanup();
        }
      };
      configureProps(fixture, { original: builderFn });
      if (fixtureOptions) {
        return { [fixtureName]: [fixture, fixtureOptions] };
      }
      return { [fixtureName]: fixture };
    }
    if (fixtureOptions) {
      return { [fixtureName]: [fixtureValue, fixtureOptions] };
    }
    return { [fixtureName]: fixtureValue };
  }
  taskFn.override = function(fixturesOrName, optionsOrFn, maybeFn) {
    const userFixtures = parseBuilderFixtures(fixturesOrName, optionsOrFn, maybeFn);
    getChainableContext(this).getFixtures().override(runner, userFixtures);
    return this;
  };
  taskFn.scoped = function(fixtures) {
    console.warn(`test.scoped() is deprecated and will be removed in future versions. Please use test.override() instead.`);
    return this.override(fixtures);
  };
  taskFn.extend = function(fixturesOrName, optionsOrFn, maybeFn) {
    const userFixtures = parseBuilderFixtures(fixturesOrName, optionsOrFn, maybeFn);
    const fixtures = getChainableContext(this).getFixtures().extend(runner, userFixtures);
    const _test3 = createTest(function(name, optionsOrFn2, optionsOrTest) {
      fn2.call(this, formatName(name), optionsOrFn2, optionsOrTest);
    });
    getChainableContext(_test3).mergeContext({ fixtures });
    return _test3;
  };
  taskFn.describe = suite;
  taskFn.suite = suite;
  taskFn.beforeEach = beforeEach2;
  taskFn.afterEach = afterEach;
  taskFn.beforeAll = beforeAll;
  taskFn.afterAll = afterAll;
  taskFn.aroundEach = aroundEach;
  taskFn.aroundAll = aroundAll;
  const _test2 = createChainable([
    "concurrent",
    "sequential",
    "skip",
    "only",
    "todo",
    "fails"
  ], taskFn, { fixtures: new TestFixtures() });
  return _test2;
}
function createTest(fn2) {
  return createTaskCollector(fn2);
}
function formatName(name) {
  return typeof name === "string" ? name : typeof name === "function" ? name.name || "<anonymous>" : String(name);
}
function formatTitle(template, items, idx) {
  if (template.includes("%#") || template.includes("%$")) {
    template = template.replace(/%%/g, "__vitest_escaped_%__").replace(/%#/g, `${idx}`).replace(/%\$/g, `${idx + 1}`).replace(/__vitest_escaped_%__/g, "%%");
  }
  const count = template.split("%").length - 1;
  if (template.includes("%f")) {
    const placeholders = template.match(/%f/g) || [];
    placeholders.forEach((_2, i4) => {
      if (isNegativeNaN(items[i4]) || Object.is(items[i4], -0)) {
        let occurrence = 0;
        template = template.replace(/%f/g, (match) => {
          occurrence++;
          return occurrence === i4 + 1 ? "-%f" : match;
        });
      }
    });
  }
  const isObjectItem = isObject(items[0]);
  function formatAttribute(s2) {
    return s2.replace(/\$([$\w.]+)/g, (_2, key) => {
      const isArrayKey = /^\d+$/.test(key);
      if (!isObjectItem && !isArrayKey) {
        return `$${key}`;
      }
      const arrayElement = isArrayKey ? objectAttr(items, key) : void 0;
      const value = isObjectItem ? objectAttr(items[0], key, arrayElement) : arrayElement;
      return objDisplay(value, { truncate: runner?.config?.chaiConfig?.truncateThreshold });
    });
  }
  let output = "";
  let i3 = 0;
  handleRegexMatch(
    template,
    formatRegExp,
    // format "%"
    (match) => {
      if (i3 < count) {
        output += format2(match[0], items[i3++]);
      } else {
        output += match[0];
      }
    },
    // format "$"
    (nonMatch) => {
      output += formatAttribute(nonMatch);
    }
  );
  return output;
}
function handleRegexMatch(input, regex, onMatch, onNonMatch) {
  let lastIndex = 0;
  for (const m2 of input.matchAll(regex)) {
    if (lastIndex < m2.index) {
      onNonMatch(input.slice(lastIndex, m2.index));
    }
    onMatch(m2);
    lastIndex = m2.index + m2[0].length;
  }
  if (lastIndex < input.length) {
    onNonMatch(input.slice(lastIndex));
  }
}
function formatTemplateString(cases, args) {
  const header = cases.join("").trim().replace(/ /g, "").split("\n").map((i3) => i3.split("|"))[0];
  const res = [];
  for (let i3 = 0; i3 < Math.floor(args.length / header.length); i3++) {
    const oneCase = {};
    for (let j2 = 0; j2 < header.length; j2++) {
      oneCase[header[j2]] = args[i3 * header.length + j2];
    }
    res.push(oneCase);
  }
  return res;
}
var now$2 = globalThis.performance ? globalThis.performance.now.bind(globalThis.performance) : Date.now;
var collectorContext = {
  tasks: [],
  currentSuite: null
};
function collectTask(task) {
  collectorContext.currentSuite?.tasks.push(task);
}
async function runWithSuite(suite2, fn2) {
  const prev = collectorContext.currentSuite;
  collectorContext.currentSuite = suite2;
  await fn2();
  collectorContext.currentSuite = prev;
}
function withTimeout(fn2, timeout, isHook = false, stackTraceError, onTimeout) {
  if (timeout <= 0 || timeout === Number.POSITIVE_INFINITY) {
    return fn2;
  }
  const { setTimeout: setTimeout3, clearTimeout: clearTimeout3 } = getSafeTimers();
  return (function runWithTimeout(...args) {
    const startTime = now$2();
    const runner2 = getRunner();
    runner2._currentTaskStartTime = startTime;
    runner2._currentTaskTimeout = timeout;
    return new Promise((resolve_, reject_) => {
      const timer = setTimeout3(() => {
        clearTimeout3(timer);
        rejectTimeoutError();
      }, timeout);
      timer.unref?.();
      function rejectTimeoutError() {
        const error = makeTimeoutError(isHook, timeout, stackTraceError);
        onTimeout?.(args, error);
        reject_(error);
      }
      function resolve2(result) {
        runner2._currentTaskStartTime = void 0;
        runner2._currentTaskTimeout = void 0;
        clearTimeout3(timer);
        if (now$2() - startTime >= timeout) {
          rejectTimeoutError();
          return;
        }
        resolve_(result);
      }
      function reject(error) {
        runner2._currentTaskStartTime = void 0;
        runner2._currentTaskTimeout = void 0;
        clearTimeout3(timer);
        reject_(error);
      }
      try {
        const result = fn2(...args);
        if (typeof result === "object" && result != null && typeof result.then === "function") {
          result.then(resolve2, reject);
        } else {
          resolve2(result);
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}
function withCancel(fn2, signal) {
  return (function runWithCancel(...args) {
    return new Promise((resolve2, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason));
      try {
        const result = fn2(...args);
        if (typeof result === "object" && result != null && typeof result.then === "function") {
          result.then(resolve2, reject);
        } else {
          resolve2(result);
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}
var abortControllers = /* @__PURE__ */ new WeakMap();
function abortIfTimeout([context], error) {
  if (context) {
    abortContextSignal(context, error);
  }
}
function abortContextSignal(context, error) {
  const abortController = abortControllers.get(context);
  abortController?.abort(error);
}
function createTestContext(test5, runner2) {
  const context = function() {
    throw new Error("done() callback is deprecated, use promise instead");
  };
  let abortController = abortControllers.get(context);
  if (!abortController) {
    abortController = new AbortController();
    abortControllers.set(context, abortController);
  }
  context.signal = abortController.signal;
  context.task = test5;
  context.skip = (condition, note) => {
    if (condition === false) {
      return void 0;
    }
    test5.result ??= { state: "skip" };
    test5.result.pending = true;
    throw new PendingError("test is skipped; abort execution", test5, typeof condition === "string" ? condition : note);
  };
  context.annotate = ((message, type3, attachment) => {
    if (test5.result && test5.result.state !== "run") {
      throw new Error(`Cannot annotate tests outside of the test run. The test "${test5.name}" finished running with the "${test5.result.state}" state already.`);
    }
    const annotation = {
      message,
      type: typeof type3 === "object" || type3 === void 0 ? "notice" : type3
    };
    const annotationAttachment = typeof type3 === "object" ? type3 : attachment;
    if (annotationAttachment) {
      annotation.attachment = annotationAttachment;
      manageArtifactAttachment(annotation.attachment);
    }
    return recordAsyncOperation(test5, recordArtifact(test5, {
      type: "internal:annotation",
      annotation
    }).then(async ({ annotation: annotation2 }) => {
      if (!runner2.onTestAnnotate) {
        throw new Error(`Test runner doesn't support test annotations.`);
      }
      await finishSendTasksUpdate(runner2);
      const resolvedAnnotation = await runner2.onTestAnnotate(test5, annotation2);
      test5.annotations.push(resolvedAnnotation);
      return resolvedAnnotation;
    }));
  });
  context.onTestFailed = (handler, timeout) => {
    test5.onFailed ||= [];
    test5.onFailed.push(withTimeout(handler, timeout ?? runner2.config.hookTimeout, true, new Error("STACK_TRACE_ERROR"), (_2, error) => abortController.abort(error)));
  };
  context.onTestFinished = (handler, timeout) => {
    test5.onFinished ||= [];
    test5.onFinished.push(withTimeout(handler, timeout ?? runner2.config.hookTimeout, true, new Error("STACK_TRACE_ERROR"), (_2, error) => abortController.abort(error)));
  };
  return runner2.extendTaskContext?.(context) || context;
}
function makeTimeoutError(isHook, timeout, stackTraceError) {
  const message = `${isHook ? "Hook" : "Test"} timed out in ${timeout}ms.
If this is a long-running ${isHook ? "hook" : "test"}, pass a timeout value as the last argument or configure it globally with "${isHook ? "hookTimeout" : "testTimeout"}".`;
  const error = new Error(message);
  if (stackTraceError?.stack) {
    error.stack = stackTraceError.stack.replace(error.message, stackTraceError.message);
  }
  return error;
}
var now$1 = globalThis.performance ? globalThis.performance.now.bind(globalThis.performance) : Date.now;
var now = globalThis.performance ? globalThis.performance.now.bind(globalThis.performance) : Date.now;
var unixNow = Date.now;
var { clearTimeout: clearTimeout2, setTimeout: setTimeout2 } = getSafeTimers();
var packs = /* @__PURE__ */ new Map();
var eventsPacks = [];
var pendingTasksUpdates = [];
function sendTasksUpdate(runner2) {
  if (packs.size) {
    const taskPacks = Array.from(packs).map(([id, task]) => {
      return [
        id,
        task[0],
        task[1]
      ];
    });
    const p2 = runner2.onTaskUpdate?.(taskPacks, eventsPacks);
    if (p2) {
      pendingTasksUpdates.push(p2);
      p2.then(() => pendingTasksUpdates.splice(pendingTasksUpdates.indexOf(p2), 1), () => {
      });
    }
    eventsPacks.length = 0;
    packs.clear();
  }
}
async function finishSendTasksUpdate(runner2) {
  sendTasksUpdate(runner2);
  await Promise.all(pendingTasksUpdates);
}
function throttle(fn2, ms) {
  let last = 0;
  let pendingCall;
  return function call2(...args) {
    const now3 = unixNow();
    if (now3 - last > ms) {
      last = now3;
      clearTimeout2(pendingCall);
      pendingCall = void 0;
      return fn2.apply(this, args);
    }
    pendingCall ??= setTimeout2(() => call2.bind(this)(...args), ms);
  };
}
var sendTasksUpdateThrottled = throttle(sendTasksUpdate, 100);
async function recordArtifact(task, artifact) {
  const runner2 = getRunner();
  const stack = findTestFileStackTrace(task.file.filepath, new Error("STACK_TRACE").stack);
  if (stack) {
    artifact.location = {
      file: stack.file,
      line: stack.line,
      column: stack.column
    };
    if (artifact.type === "internal:annotation") {
      artifact.annotation.location = artifact.location;
    }
  }
  if (Array.isArray(artifact.attachments)) {
    for (const attachment of artifact.attachments) {
      manageArtifactAttachment(attachment);
    }
  }
  if (artifact.type === "internal:annotation") {
    return artifact;
  }
  if (!runner2.onTestArtifactRecord) {
    throw new Error(`Test runner doesn't support test artifacts.`);
  }
  await finishSendTasksUpdate(runner2);
  const resolvedArtifact = await runner2.onTestArtifactRecord(task, artifact);
  task.artifacts.push(resolvedArtifact);
  return resolvedArtifact;
}
var table = [];
for (let i3 = 65; i3 < 91; i3++) {
  table.push(String.fromCharCode(i3));
}
for (let i3 = 97; i3 < 123; i3++) {
  table.push(String.fromCharCode(i3));
}
for (let i3 = 0; i3 < 10; i3++) {
  table.push(i3.toString(10));
}
table.push("+", "/");
function encodeUint8Array(bytes) {
  let base64 = "";
  const len = bytes.byteLength;
  for (let i3 = 0; i3 < len; i3 += 3) {
    if (len === i3 + 1) {
      const a2 = (bytes[i3] & 252) >> 2;
      const b3 = (bytes[i3] & 3) << 4;
      base64 += table[a2];
      base64 += table[b3];
      base64 += "==";
    } else if (len === i3 + 2) {
      const a2 = (bytes[i3] & 252) >> 2;
      const b3 = (bytes[i3] & 3) << 4 | (bytes[i3 + 1] & 240) >> 4;
      const c2 = (bytes[i3 + 1] & 15) << 2;
      base64 += table[a2];
      base64 += table[b3];
      base64 += table[c2];
      base64 += "=";
    } else {
      const a2 = (bytes[i3] & 252) >> 2;
      const b3 = (bytes[i3] & 3) << 4 | (bytes[i3 + 1] & 240) >> 4;
      const c2 = (bytes[i3 + 1] & 15) << 2 | (bytes[i3 + 2] & 192) >> 6;
      const d3 = bytes[i3 + 2] & 63;
      base64 += table[a2];
      base64 += table[b3];
      base64 += table[c2];
      base64 += table[d3];
    }
  }
  return base64;
}
function recordAsyncOperation(test5, promise) {
  promise = promise.finally(() => {
    if (!test5.promises) {
      return;
    }
    const index2 = test5.promises.indexOf(promise);
    if (index2 !== -1) {
      test5.promises.splice(index2, 1);
    }
  });
  if (!test5.promises) {
    test5.promises = [];
  }
  test5.promises.push(promise);
  return promise;
}
function manageArtifactAttachment(attachment) {
  if (attachment.body == null && !attachment.path) {
    throw new TypeError(`Test attachment requires "body" or "path" to be set. Both are missing.`);
  }
  if (attachment.body && attachment.path) {
    throw new TypeError(`Test attachment requires only one of "body" or "path" to be set. Both are specified.`);
  }
  if (attachment.body instanceof Uint8Array) {
    attachment.body = encodeUint8Array(attachment.body);
  }
}

// ../../node_modules/.pnpm/vitest@4.1.2_@opentelemetry+api@1.9.0_@types+node@25.5.1_vite@7.3.1_@types+node@25.5.1__db5ed10e0f1f36c7c04da8d42b6dbc45/node_modules/vitest/dist/chunks/utils.BX5Fg8C4.js
var NAME_WORKER_STATE = "__vitest_worker__";
function getWorkerState() {
  const workerState = globalThis[NAME_WORKER_STATE];
  if (!workerState) throw new Error('Vitest failed to access its internal state.\n\nOne of the following is possible:\n- "vitest" is imported directly without running "vitest" command\n- "vitest" is imported inside "globalSetup" (to fix this, use "setupFiles" instead, because "globalSetup" runs in a different context)\n- "vitest" is imported inside Vite / Vitest config file\n- Otherwise, it might be a Vitest bug. Please report it to https://github.com/vitest-dev/vitest/issues\n');
  return workerState;
}
function isChildProcess() {
  return typeof process !== "undefined" && !!process.send;
}
function resetModules(modules, resetMocks = false) {
  const skipPaths = [
    /\/vitest\/dist\//,
    /vitest-virtual-\w+\/dist/,
    /@vitest\/dist/,
    ...!resetMocks ? [/^mock:/] : []
  ];
  modules.idToModuleMap.forEach((node, path) => {
    if (skipPaths.some((re) => re.test(path))) return;
    node.promise = void 0;
    node.exports = void 0;
    node.evaluated = false;
    node.importers.clear();
  });
}
function waitNextTick() {
  const { setTimeout: setTimeout3 } = getSafeTimers();
  return new Promise((resolve2) => setTimeout3(resolve2, 0));
}
async function waitForImportsToResolve() {
  await waitNextTick();
  const state = getWorkerState();
  const promises = [];
  const resolvingCount = state.resolvingModules.size;
  for (const [_2, mod] of state.evaluatedModules.idToModuleMap) if (mod.promise && !mod.evaluated) promises.push(mod.promise);
  if (!promises.length && !resolvingCount) return;
  await Promise.allSettled(promises);
  await waitForImportsToResolve();
}

// ../../node_modules/.pnpm/@vitest+spy@4.1.2/node_modules/@vitest/spy/dist/index.js
function isMockFunction(fn2) {
  return typeof fn2 === "function" && "_isMockFunction" in fn2 && fn2._isMockFunction === true;
}
var MOCK_RESTORE = /* @__PURE__ */ new Set();
var REGISTERED_MOCKS = /* @__PURE__ */ new Set();
var MOCK_CONFIGS = /* @__PURE__ */ new WeakMap();
function createMockInstance(options = {}) {
  const { originalImplementation, restore, mockImplementation, resetToMockImplementation, resetToMockName } = options;
  if (restore) {
    MOCK_RESTORE.add(restore);
  }
  const config2 = getDefaultConfig(originalImplementation);
  const state = getDefaultState();
  const mock = createMock({
    config: config2,
    state,
    ...options
  });
  const mockLength = (mockImplementation || originalImplementation)?.length ?? 0;
  Object.defineProperty(mock, "length", {
    writable: true,
    enumerable: false,
    value: mockLength,
    configurable: true
  });
  if (resetToMockName) {
    config2.mockName = mock.name || "vi.fn()";
  }
  MOCK_CONFIGS.set(mock, config2);
  REGISTERED_MOCKS.add(mock);
  mock._isMockFunction = true;
  mock.getMockImplementation = () => {
    return config2.onceMockImplementations[0] || config2.mockImplementation;
  };
  Object.defineProperty(mock, "mock", {
    configurable: false,
    enumerable: true,
    writable: false,
    value: state
  });
  mock.mockImplementation = function mockImplementation2(implementation) {
    config2.mockImplementation = implementation;
    return mock;
  };
  mock.mockImplementationOnce = function mockImplementationOnce(implementation) {
    config2.onceMockImplementations.push(implementation);
    return mock;
  };
  mock.withImplementation = function withImplementation(implementation, callback) {
    const previousImplementation = config2.mockImplementation;
    const previousOnceImplementations = config2.onceMockImplementations;
    const reset = () => {
      config2.mockImplementation = previousImplementation;
      config2.onceMockImplementations = previousOnceImplementations;
    };
    config2.mockImplementation = implementation;
    config2.onceMockImplementations = [];
    const returnValue = callback();
    if (typeof returnValue === "object" && typeof returnValue?.then === "function") {
      return returnValue.then(() => {
        reset();
        return mock;
      });
    } else {
      reset();
    }
    return mock;
  };
  mock.mockReturnThis = function mockReturnThis() {
    return mock.mockImplementation(function() {
      return this;
    });
  };
  mock.mockReturnValue = function mockReturnValue(value) {
    return mock.mockImplementation(function() {
      if (new.target) {
        throwConstructorError("mockReturnValue");
      }
      return value;
    });
  };
  mock.mockReturnValueOnce = function mockReturnValueOnce(value) {
    return mock.mockImplementationOnce(function() {
      if (new.target) {
        throwConstructorError("mockReturnValueOnce");
      }
      return value;
    });
  };
  mock.mockThrow = function mockThrow(value) {
    return mock.mockImplementation(function() {
      throw value;
    });
  };
  mock.mockThrowOnce = function mockThrowOnce(value) {
    return mock.mockImplementationOnce(function() {
      throw value;
    });
  };
  mock.mockResolvedValue = function mockResolvedValue(value) {
    return mock.mockImplementation(function() {
      if (new.target) {
        throwConstructorError("mockResolvedValue");
      }
      return Promise.resolve(value);
    });
  };
  mock.mockResolvedValueOnce = function mockResolvedValueOnce(value) {
    return mock.mockImplementationOnce(function() {
      if (new.target) {
        throwConstructorError("mockResolvedValueOnce");
      }
      return Promise.resolve(value);
    });
  };
  mock.mockRejectedValue = function mockRejectedValue(value) {
    return mock.mockImplementation(function() {
      if (new.target) {
        throwConstructorError("mockRejectedValue");
      }
      return Promise.reject(value);
    });
  };
  mock.mockRejectedValueOnce = function mockRejectedValueOnce(value) {
    return mock.mockImplementationOnce(function() {
      if (new.target) {
        throwConstructorError("mockRejectedValueOnce");
      }
      return Promise.reject(value);
    });
  };
  mock.mockClear = function mockClear() {
    state.calls = [];
    state.contexts = [];
    state.instances = [];
    state.invocationCallOrder = [];
    state.results = [];
    state.settledResults = [];
    return mock;
  };
  mock.mockReset = function mockReset() {
    mock.mockClear();
    config2.mockImplementation = resetToMockImplementation ? mockImplementation : void 0;
    config2.mockName = resetToMockName ? mock.name || "vi.fn()" : "vi.fn()";
    config2.onceMockImplementations = [];
    return mock;
  };
  mock.mockRestore = function mockRestore() {
    mock.mockReset();
    return restore?.();
  };
  mock.mockName = function mockName(name) {
    if (typeof name === "string") {
      config2.mockName = name;
    }
    return mock;
  };
  mock.getMockName = function getMockName() {
    return config2.mockName || "vi.fn()";
  };
  if (Symbol.dispose) {
    mock[Symbol.dispose] = () => mock.mockRestore();
  }
  if (mockImplementation) {
    mock.mockImplementation(mockImplementation);
  }
  return mock;
}
function fn(originalImplementation) {
  if (originalImplementation != null && isMockFunction(originalImplementation)) {
    return originalImplementation;
  }
  return createMockInstance({
    mockImplementation: originalImplementation,
    resetToMockImplementation: true
  });
}
function spyOn(object2, key, accessor) {
  assert2(object2 != null, "The vi.spyOn() function could not find an object to spy upon. The first argument must be defined.");
  assert2(typeof object2 === "object" || typeof object2 === "function", "Vitest cannot spy on a primitive value.");
  const [originalDescriptorObject, originalDescriptor] = getDescriptor(object2, key) || [];
  assert2(originalDescriptor || key in object2, `The property "${String(key)}" is not defined on the ${typeof object2}.`);
  let accessType = accessor || "value";
  let ssr = false;
  if (accessType === "value" && originalDescriptor && originalDescriptor.value == null && originalDescriptor.get) {
    accessType = "get";
    ssr = true;
  }
  let original;
  if (originalDescriptor) {
    original = originalDescriptor[accessType];
    if (original == null && accessType === "value") {
      original = object2[key];
    }
  } else if (accessType !== "value") {
    original = () => object2[key];
  } else {
    original = object2[key];
  }
  const originalImplementation = ssr && original ? original() : original;
  const originalType = typeof originalImplementation;
  assert2(
    // allow only functions
    originalType === "function" || accessType !== "value" && original == null,
    `vi.spyOn() can only spy on a function. Received ${originalType}.`
  );
  if (isMockFunction(originalImplementation)) {
    return originalImplementation;
  }
  const reassign = (cb) => {
    const { value, ...desc } = originalDescriptor || {
      configurable: true,
      writable: true
    };
    if (accessType !== "value") {
      delete desc.writable;
    }
    desc[accessType] = cb;
    Object.defineProperty(object2, key, desc);
  };
  const restore = () => {
    if (originalDescriptorObject !== object2) {
      Reflect.deleteProperty(object2, key);
    } else if (originalDescriptor && !original) {
      Object.defineProperty(object2, key, originalDescriptor);
    } else {
      reassign(original);
    }
  };
  const mock = createMockInstance({
    restore,
    originalImplementation,
    resetToMockName: true
  });
  try {
    reassign(ssr ? () => mock : mock);
  } catch (error) {
    if (error instanceof TypeError && Symbol.toStringTag && object2[Symbol.toStringTag] === "Module" && (error.message.includes("Cannot redefine property") || error.message.includes("Cannot replace module namespace") || error.message.includes("can't redefine non-configurable property"))) {
      throw new TypeError(`Cannot spy on export "${String(key)}". Module namespace is not configurable in ESM. See: https://vitest.dev/guide/browser/#limitations`, { cause: error });
    }
    throw error;
  }
  return mock;
}
function getDescriptor(obj, method) {
  const objDescriptor = Object.getOwnPropertyDescriptor(obj, method);
  if (objDescriptor) {
    return [obj, objDescriptor];
  }
  let currentProto = Object.getPrototypeOf(obj);
  while (currentProto !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(currentProto, method);
    if (descriptor) {
      return [currentProto, descriptor];
    }
    currentProto = Object.getPrototypeOf(currentProto);
  }
}
function assert2(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
var invocationCallCounter = 1;
function createMock({ state, config: config2, name: mockName, prototypeState, prototypeConfig, keepMembersImplementation, mockImplementation, prototypeMembers = [] }) {
  const original = config2.mockOriginal;
  const pseudoOriginal = mockImplementation;
  const name = mockName || original?.name || "Mock";
  const namedObject = { [name]: (function(...args) {
    registerCalls(args, state, prototypeState);
    registerInvocationOrder(invocationCallCounter++, state, prototypeState);
    const result = {
      type: "incomplete",
      value: void 0
    };
    const settledResult = {
      type: "incomplete",
      value: void 0
    };
    registerResult(result, state, prototypeState);
    registerSettledResult(settledResult, state, prototypeState);
    const context = new.target ? void 0 : this;
    const [instanceIndex, instancePrototypeIndex] = registerInstance(context, state, prototypeState);
    const [contextIndex, contextPrototypeIndex] = registerContext(context, state, prototypeState);
    const implementation = config2.onceMockImplementations.shift() || config2.mockImplementation || prototypeConfig?.onceMockImplementations.shift() || prototypeConfig?.mockImplementation || original || function() {
    };
    let returnValue;
    let thrownValue;
    let didThrow = false;
    try {
      if (new.target) {
        returnValue = Reflect.construct(implementation, args, new.target);
        for (const prop of prototypeMembers) {
          const prototypeMock = returnValue[prop];
          if (prototypeMock !== mock.prototype[prop]) {
            continue;
          }
          const isMock = isMockFunction(prototypeMock);
          const prototypeState2 = isMock ? prototypeMock.mock : void 0;
          const prototypeConfig2 = isMock ? MOCK_CONFIGS.get(prototypeMock) : void 0;
          returnValue[prop] = createMockInstance({
            originalImplementation: keepMembersImplementation ? prototypeConfig2?.mockOriginal : void 0,
            prototypeState: prototypeState2,
            prototypeConfig: prototypeConfig2,
            keepMembersImplementation
          });
        }
      } else {
        returnValue = implementation.apply(this, args);
      }
    } catch (error) {
      thrownValue = error;
      didThrow = true;
      if (error instanceof TypeError && error.message.includes("is not a constructor")) {
        console.warn(`[vitest] The ${namedObject[name].getMockName()} mock did not use 'function' or 'class' in its implementation, see https://vitest.dev/api/vi#vi-spyon for examples.`);
      }
      throw error;
    } finally {
      if (didThrow) {
        result.type = "throw";
        result.value = thrownValue;
        settledResult.type = "rejected";
        settledResult.value = thrownValue;
      } else {
        result.type = "return";
        result.value = returnValue;
        if (new.target) {
          state.contexts[contextIndex - 1] = returnValue;
          state.instances[instanceIndex - 1] = returnValue;
          if (contextPrototypeIndex != null && prototypeState) {
            prototypeState.contexts[contextPrototypeIndex - 1] = returnValue;
          }
          if (instancePrototypeIndex != null && prototypeState) {
            prototypeState.instances[instancePrototypeIndex - 1] = returnValue;
          }
        }
        if (returnValue instanceof Promise) {
          returnValue.then((settledValue) => {
            settledResult.type = "fulfilled";
            settledResult.value = settledValue;
          }, (rejectedValue) => {
            settledResult.type = "rejected";
            settledResult.value = rejectedValue;
          });
        } else {
          settledResult.type = "fulfilled";
          settledResult.value = returnValue;
        }
      }
    }
    return returnValue;
  }) };
  const mock = namedObject[name];
  const copyPropertiesFrom = original || pseudoOriginal;
  if (copyPropertiesFrom) {
    copyOriginalStaticProperties(mock, copyPropertiesFrom);
  }
  return mock;
}
function registerCalls(args, state, prototypeState) {
  state.calls.push(args);
  prototypeState?.calls.push(args);
}
function registerInvocationOrder(order, state, prototypeState) {
  state.invocationCallOrder.push(order);
  prototypeState?.invocationCallOrder.push(order);
}
function registerResult(result, state, prototypeState) {
  state.results.push(result);
  prototypeState?.results.push(result);
}
function registerSettledResult(result, state, prototypeState) {
  state.settledResults.push(result);
  prototypeState?.settledResults.push(result);
}
function registerInstance(instance, state, prototypeState) {
  const instanceIndex = state.instances.push(instance);
  const instancePrototypeIndex = prototypeState?.instances.push(instance);
  return [instanceIndex, instancePrototypeIndex];
}
function registerContext(context, state, prototypeState) {
  const contextIndex = state.contexts.push(context);
  const contextPrototypeIndex = prototypeState?.contexts.push(context);
  return [contextIndex, contextPrototypeIndex];
}
function copyOriginalStaticProperties(mock, original) {
  const { properties, descriptors } = getAllProperties(original);
  for (const key of properties) {
    const descriptor = descriptors[key];
    const mockDescriptor = getDescriptor(mock, key);
    if (mockDescriptor) {
      continue;
    }
    Object.defineProperty(mock, key, descriptor);
  }
}
var ignoreProperties = /* @__PURE__ */ new Set([
  "length",
  "name",
  "prototype",
  /* @__PURE__ */ Symbol.for("nodejs.util.promisify.custom")
]);
function getAllProperties(original) {
  const properties = /* @__PURE__ */ new Set();
  const descriptors = {};
  while (original && original !== Object.prototype && original !== Function.prototype) {
    const ownProperties = [...Object.getOwnPropertyNames(original), ...Object.getOwnPropertySymbols(original)];
    for (const prop of ownProperties) {
      if (descriptors[prop] || ignoreProperties.has(prop)) {
        continue;
      }
      properties.add(prop);
      descriptors[prop] = Object.getOwnPropertyDescriptor(original, prop);
    }
    original = Object.getPrototypeOf(original);
  }
  return {
    properties,
    descriptors
  };
}
function getDefaultConfig(original) {
  return {
    mockImplementation: void 0,
    mockOriginal: original,
    mockName: "vi.fn()",
    onceMockImplementations: []
  };
}
function getDefaultState() {
  const state = {
    calls: [],
    contexts: [],
    instances: [],
    invocationCallOrder: [],
    settledResults: [],
    results: [],
    get lastCall() {
      return state.calls.at(-1);
    }
  };
  return state;
}
function restoreAllMocks() {
  for (const restore of MOCK_RESTORE) {
    restore();
  }
  MOCK_RESTORE.clear();
}
function clearAllMocks() {
  REGISTERED_MOCKS.forEach((mock) => mock.mockClear());
}
function resetAllMocks() {
  REGISTERED_MOCKS.forEach((mock) => mock.mockReset());
}
function throwConstructorError(shorthand) {
  throw new TypeError(`Cannot use \`${shorthand}\` when called with \`new\`. Use \`mockImplementation\` with a \`class\` keyword instead. See https://vitest.dev/api/mock#class-support for more information.`);
}

// ../../node_modules/.pnpm/chai@6.2.2/node_modules/chai/index.js
var chai_exports = {};
__export(chai_exports, {
  Assertion: () => Assertion,
  AssertionError: () => AssertionError,
  Should: () => Should,
  assert: () => assert3,
  config: () => config,
  expect: () => expect,
  should: () => should,
  use: () => use,
  util: () => utils_exports
});
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export2 = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var utils_exports = {};
__export2(utils_exports, {
  addChainableMethod: () => addChainableMethod,
  addLengthGuard: () => addLengthGuard,
  addMethod: () => addMethod,
  addProperty: () => addProperty,
  checkError: () => check_error_exports,
  compareByInspect: () => compareByInspect,
  eql: () => deep_eql_default,
  events: () => events,
  expectTypes: () => expectTypes,
  flag: () => flag,
  getActual: () => getActual,
  getMessage: () => getMessage2,
  getName: () => getName,
  getOperator: () => getOperator,
  getOwnEnumerableProperties: () => getOwnEnumerableProperties,
  getOwnEnumerablePropertySymbols: () => getOwnEnumerablePropertySymbols,
  getPathInfo: () => getPathInfo,
  hasProperty: () => hasProperty,
  inspect: () => inspect22,
  isNaN: () => isNaN22,
  isNumeric: () => isNumeric,
  isProxyEnabled: () => isProxyEnabled,
  isRegExp: () => isRegExp2,
  objDisplay: () => objDisplay2,
  overwriteChainableMethod: () => overwriteChainableMethod,
  overwriteMethod: () => overwriteMethod,
  overwriteProperty: () => overwriteProperty,
  proxify: () => proxify,
  test: () => test3,
  transferFlags: () => transferFlags,
  type: () => type
});
var check_error_exports = {};
__export2(check_error_exports, {
  compatibleConstructor: () => compatibleConstructor,
  compatibleInstance: () => compatibleInstance,
  compatibleMessage: () => compatibleMessage,
  getConstructorName: () => getConstructorName2,
  getMessage: () => getMessage
});
function isErrorInstance(obj) {
  return obj instanceof Error || Object.prototype.toString.call(obj) === "[object Error]";
}
__name(isErrorInstance, "isErrorInstance");
function isRegExp(obj) {
  return Object.prototype.toString.call(obj) === "[object RegExp]";
}
__name(isRegExp, "isRegExp");
function compatibleInstance(thrown, errorLike) {
  return isErrorInstance(errorLike) && thrown === errorLike;
}
__name(compatibleInstance, "compatibleInstance");
function compatibleConstructor(thrown, errorLike) {
  if (isErrorInstance(errorLike)) {
    return thrown.constructor === errorLike.constructor || thrown instanceof errorLike.constructor;
  } else if ((typeof errorLike === "object" || typeof errorLike === "function") && errorLike.prototype) {
    return thrown.constructor === errorLike || thrown instanceof errorLike;
  }
  return false;
}
__name(compatibleConstructor, "compatibleConstructor");
function compatibleMessage(thrown, errMatcher) {
  const comparisonString = typeof thrown === "string" ? thrown : thrown.message;
  if (isRegExp(errMatcher)) {
    return errMatcher.test(comparisonString);
  } else if (typeof errMatcher === "string") {
    return comparisonString.indexOf(errMatcher) !== -1;
  }
  return false;
}
__name(compatibleMessage, "compatibleMessage");
function getConstructorName2(errorLike) {
  let constructorName = errorLike;
  if (isErrorInstance(errorLike)) {
    constructorName = errorLike.constructor.name;
  } else if (typeof errorLike === "function") {
    constructorName = errorLike.name;
    if (constructorName === "") {
      const newConstructorName = new errorLike().name;
      constructorName = newConstructorName || constructorName;
    }
  }
  return constructorName;
}
__name(getConstructorName2, "getConstructorName");
function getMessage(errorLike) {
  let msg = "";
  if (errorLike && errorLike.message) {
    msg = errorLike.message;
  } else if (typeof errorLike === "string") {
    msg = errorLike;
  }
  return msg;
}
__name(getMessage, "getMessage");
function flag(obj, key, value) {
  let flags = obj.__flags || (obj.__flags = /* @__PURE__ */ Object.create(null));
  if (arguments.length === 3) {
    flags[key] = value;
  } else {
    return flags[key];
  }
}
__name(flag, "flag");
function test3(obj, args) {
  let negate = flag(obj, "negate"), expr = args[0];
  return negate ? !expr : expr;
}
__name(test3, "test");
function type(obj) {
  if (typeof obj === "undefined") {
    return "undefined";
  }
  if (obj === null) {
    return "null";
  }
  const stringTag = obj[Symbol.toStringTag];
  if (typeof stringTag === "string") {
    return stringTag;
  }
  const type3 = Object.prototype.toString.call(obj).slice(8, -1);
  return type3;
}
__name(type, "type");
var canElideFrames = "captureStackTrace" in Error;
var _AssertionError = class _AssertionError2 extends Error {
  constructor(message = "Unspecified AssertionError", props, ssf) {
    super(message);
    __publicField(this, "message");
    this.message = message;
    if (canElideFrames) {
      Error.captureStackTrace(this, ssf || _AssertionError2);
    }
    for (const key in props) {
      if (!(key in this)) {
        this[key] = props[key];
      }
    }
  }
  get name() {
    return "AssertionError";
  }
  get ok() {
    return false;
  }
  toJSON(stack) {
    return {
      ...this,
      name: this.name,
      message: this.message,
      ok: false,
      stack: stack !== false ? this.stack : void 0
    };
  }
};
__name(_AssertionError, "AssertionError");
var AssertionError = _AssertionError;
function expectTypes(obj, types) {
  let flagMsg = flag(obj, "message");
  let ssfi = flag(obj, "ssfi");
  flagMsg = flagMsg ? flagMsg + ": " : "";
  obj = flag(obj, "object");
  types = types.map(function(t) {
    return t.toLowerCase();
  });
  types.sort();
  let str = types.map(function(t, index2) {
    let art = ~["a", "e", "i", "o", "u"].indexOf(t.charAt(0)) ? "an" : "a";
    let or = types.length > 1 && index2 === types.length - 1 ? "or " : "";
    return or + art + " " + t;
  }).join(", ");
  let objType = type(obj).toLowerCase();
  if (!types.some(function(expected) {
    return objType === expected;
  })) {
    throw new AssertionError(
      flagMsg + "object tested must be " + str + ", but " + objType + " given",
      void 0,
      ssfi
    );
  }
}
__name(expectTypes, "expectTypes");
function getActual(obj, args) {
  return args.length > 4 ? args[4] : obj._obj;
}
__name(getActual, "getActual");
var ansiColors2 = {
  bold: ["1", "22"],
  dim: ["2", "22"],
  italic: ["3", "23"],
  underline: ["4", "24"],
  // 5 & 6 are blinking
  inverse: ["7", "27"],
  hidden: ["8", "28"],
  strike: ["9", "29"],
  // 10-20 are fonts
  // 21-29 are resets for 1-9
  black: ["30", "39"],
  red: ["31", "39"],
  green: ["32", "39"],
  yellow: ["33", "39"],
  blue: ["34", "39"],
  magenta: ["35", "39"],
  cyan: ["36", "39"],
  white: ["37", "39"],
  brightblack: ["30;1", "39"],
  brightred: ["31;1", "39"],
  brightgreen: ["32;1", "39"],
  brightyellow: ["33;1", "39"],
  brightblue: ["34;1", "39"],
  brightmagenta: ["35;1", "39"],
  brightcyan: ["36;1", "39"],
  brightwhite: ["37;1", "39"],
  grey: ["90", "39"]
};
var styles2 = {
  special: "cyan",
  number: "yellow",
  bigint: "yellow",
  boolean: "yellow",
  undefined: "grey",
  null: "bold",
  string: "green",
  symbol: "green",
  date: "magenta",
  regexp: "red"
};
var truncator2 = "\u2026";
function colorise2(value, styleType) {
  const color = ansiColors2[styles2[styleType]] || ansiColors2[styleType] || "";
  if (!color) {
    return String(value);
  }
  return `\x1B[${color[0]}m${String(value)}\x1B[${color[1]}m`;
}
__name(colorise2, "colorise");
function normaliseOptions2({
  showHidden = false,
  depth = 2,
  colors = false,
  customInspect = true,
  showProxy = false,
  maxArrayLength = Infinity,
  breakLength = Infinity,
  seen = [],
  // eslint-disable-next-line no-shadow
  truncate: truncate22 = Infinity,
  stylize = String
} = {}, inspect3) {
  const options = {
    showHidden: Boolean(showHidden),
    depth: Number(depth),
    colors: Boolean(colors),
    customInspect: Boolean(customInspect),
    showProxy: Boolean(showProxy),
    maxArrayLength: Number(maxArrayLength),
    breakLength: Number(breakLength),
    truncate: Number(truncate22),
    seen,
    inspect: inspect3,
    stylize
  };
  if (options.colors) {
    options.stylize = colorise2;
  }
  return options;
}
__name(normaliseOptions2, "normaliseOptions");
function isHighSurrogate2(char) {
  return char >= "\uD800" && char <= "\uDBFF";
}
__name(isHighSurrogate2, "isHighSurrogate");
function truncate2(string2, length, tail = truncator2) {
  string2 = String(string2);
  const tailLength = tail.length;
  const stringLength = string2.length;
  if (tailLength > length && stringLength > tailLength) {
    return tail;
  }
  if (stringLength > length && stringLength > tailLength) {
    let end = length - tailLength;
    if (end > 0 && isHighSurrogate2(string2[end - 1])) {
      end = end - 1;
    }
    return `${string2.slice(0, end)}${tail}`;
  }
  return string2;
}
__name(truncate2, "truncate");
function inspectList2(list, options, inspectItem, separator = ", ") {
  inspectItem = inspectItem || options.inspect;
  const size = list.length;
  if (size === 0)
    return "";
  const originalLength = options.truncate;
  let output = "";
  let peek = "";
  let truncated = "";
  for (let i3 = 0; i3 < size; i3 += 1) {
    const last = i3 + 1 === list.length;
    const secondToLast = i3 + 2 === list.length;
    truncated = `${truncator2}(${list.length - i3})`;
    const value = list[i3];
    options.truncate = originalLength - output.length - (last ? 0 : separator.length);
    const string2 = peek || inspectItem(value, options) + (last ? "" : separator);
    const nextLength = output.length + string2.length;
    const truncatedLength = nextLength + truncated.length;
    if (last && nextLength > originalLength && output.length + truncated.length <= originalLength) {
      break;
    }
    if (!last && !secondToLast && truncatedLength > originalLength) {
      break;
    }
    peek = last ? "" : inspectItem(list[i3 + 1], options) + (secondToLast ? "" : separator);
    if (!last && secondToLast && truncatedLength > originalLength && nextLength + peek.length > originalLength) {
      break;
    }
    output += string2;
    if (!last && !secondToLast && nextLength + peek.length >= originalLength) {
      truncated = `${truncator2}(${list.length - i3 - 1})`;
      break;
    }
    truncated = "";
  }
  return `${output}${truncated}`;
}
__name(inspectList2, "inspectList");
function quoteComplexKey2(key) {
  if (key.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/)) {
    return key;
  }
  return JSON.stringify(key).replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
}
__name(quoteComplexKey2, "quoteComplexKey");
function inspectProperty2([key, value], options) {
  options.truncate -= 2;
  if (typeof key === "string") {
    key = quoteComplexKey2(key);
  } else if (typeof key !== "number") {
    key = `[${options.inspect(key, options)}]`;
  }
  options.truncate -= key.length;
  value = options.inspect(value, options);
  return `${key}: ${value}`;
}
__name(inspectProperty2, "inspectProperty");
function inspectArray2(array2, options) {
  const nonIndexProperties = Object.keys(array2).slice(array2.length);
  if (!array2.length && !nonIndexProperties.length)
    return "[]";
  options.truncate -= 4;
  const listContents = inspectList2(array2, options);
  options.truncate -= listContents.length;
  let propertyContents = "";
  if (nonIndexProperties.length) {
    propertyContents = inspectList2(nonIndexProperties.map((key) => [key, array2[key]]), options, inspectProperty2);
  }
  return `[ ${listContents}${propertyContents ? `, ${propertyContents}` : ""} ]`;
}
__name(inspectArray2, "inspectArray");
var getArrayName2 = /* @__PURE__ */ __name((array2) => {
  if (typeof Buffer === "function" && array2 instanceof Buffer) {
    return "Buffer";
  }
  if (array2[Symbol.toStringTag]) {
    return array2[Symbol.toStringTag];
  }
  return array2.constructor.name;
}, "getArrayName");
function inspectTypedArray2(array2, options) {
  const name = getArrayName2(array2);
  options.truncate -= name.length + 4;
  const nonIndexProperties = Object.keys(array2).slice(array2.length);
  if (!array2.length && !nonIndexProperties.length)
    return `${name}[]`;
  let output = "";
  for (let i3 = 0; i3 < array2.length; i3++) {
    const string2 = `${options.stylize(truncate2(array2[i3], options.truncate), "number")}${i3 === array2.length - 1 ? "" : ", "}`;
    options.truncate -= string2.length;
    if (array2[i3] !== array2.length && options.truncate <= 3) {
      output += `${truncator2}(${array2.length - array2[i3] + 1})`;
      break;
    }
    output += string2;
  }
  let propertyContents = "";
  if (nonIndexProperties.length) {
    propertyContents = inspectList2(nonIndexProperties.map((key) => [key, array2[key]]), options, inspectProperty2);
  }
  return `${name}[ ${output}${propertyContents ? `, ${propertyContents}` : ""} ]`;
}
__name(inspectTypedArray2, "inspectTypedArray");
function inspectDate2(dateObject, options) {
  const stringRepresentation = dateObject.toJSON();
  if (stringRepresentation === null) {
    return "Invalid Date";
  }
  const split = stringRepresentation.split("T");
  const date = split[0];
  return options.stylize(`${date}T${truncate2(split[1], options.truncate - date.length - 1)}`, "date");
}
__name(inspectDate2, "inspectDate");
function inspectFunction2(func, options) {
  const functionType = func[Symbol.toStringTag] || "Function";
  const name = func.name;
  if (!name) {
    return options.stylize(`[${functionType}]`, "special");
  }
  return options.stylize(`[${functionType} ${truncate2(name, options.truncate - 11)}]`, "special");
}
__name(inspectFunction2, "inspectFunction");
function inspectMapEntry2([key, value], options) {
  options.truncate -= 4;
  key = options.inspect(key, options);
  options.truncate -= key.length;
  value = options.inspect(value, options);
  return `${key} => ${value}`;
}
__name(inspectMapEntry2, "inspectMapEntry");
function mapToEntries2(map2) {
  const entries = [];
  map2.forEach((value, key) => {
    entries.push([key, value]);
  });
  return entries;
}
__name(mapToEntries2, "mapToEntries");
function inspectMap2(map2, options) {
  if (map2.size === 0)
    return "Map{}";
  options.truncate -= 7;
  return `Map{ ${inspectList2(mapToEntries2(map2), options, inspectMapEntry2)} }`;
}
__name(inspectMap2, "inspectMap");
var isNaN2 = Number.isNaN || ((i3) => i3 !== i3);
function inspectNumber2(number, options) {
  if (isNaN2(number)) {
    return options.stylize("NaN", "number");
  }
  if (number === Infinity) {
    return options.stylize("Infinity", "number");
  }
  if (number === -Infinity) {
    return options.stylize("-Infinity", "number");
  }
  if (number === 0) {
    return options.stylize(1 / number === Infinity ? "+0" : "-0", "number");
  }
  return options.stylize(truncate2(String(number), options.truncate), "number");
}
__name(inspectNumber2, "inspectNumber");
function inspectBigInt2(number, options) {
  let nums = truncate2(number.toString(), options.truncate - 1);
  if (nums !== truncator2)
    nums += "n";
  return options.stylize(nums, "bigint");
}
__name(inspectBigInt2, "inspectBigInt");
function inspectRegExp2(value, options) {
  const flags = value.toString().split("/")[2];
  const sourceLength = options.truncate - (2 + flags.length);
  const source = value.source;
  return options.stylize(`/${truncate2(source, sourceLength)}/${flags}`, "regexp");
}
__name(inspectRegExp2, "inspectRegExp");
function arrayFromSet2(set22) {
  const values = [];
  set22.forEach((value) => {
    values.push(value);
  });
  return values;
}
__name(arrayFromSet2, "arrayFromSet");
function inspectSet2(set22, options) {
  if (set22.size === 0)
    return "Set{}";
  options.truncate -= 7;
  return `Set{ ${inspectList2(arrayFromSet2(set22), options)} }`;
}
__name(inspectSet2, "inspectSet");
var stringEscapeChars2 = new RegExp("['\\u0000-\\u001f\\u007f-\\u009f\\u00ad\\u0600-\\u0604\\u070f\\u17b4\\u17b5\\u200c-\\u200f\\u2028-\\u202f\\u2060-\\u206f\\ufeff\\ufff0-\\uffff]", "g");
var escapeCharacters2 = {
  "\b": "\\b",
  "	": "\\t",
  "\n": "\\n",
  "\f": "\\f",
  "\r": "\\r",
  "'": "\\'",
  "\\": "\\\\"
};
var hex2 = 16;
var unicodeLength = 4;
function escape2(char) {
  return escapeCharacters2[char] || `\\u${`0000${char.charCodeAt(0).toString(hex2)}`.slice(-unicodeLength)}`;
}
__name(escape2, "escape");
function inspectString2(string2, options) {
  if (stringEscapeChars2.test(string2)) {
    string2 = string2.replace(stringEscapeChars2, escape2);
  }
  return options.stylize(`'${truncate2(string2, options.truncate - 2)}'`, "string");
}
__name(inspectString2, "inspectString");
function inspectSymbol2(value) {
  if ("description" in Symbol.prototype) {
    return value.description ? `Symbol(${value.description})` : "Symbol()";
  }
  return value.toString();
}
__name(inspectSymbol2, "inspectSymbol");
var getPromiseValue2 = /* @__PURE__ */ __name(() => "Promise{\u2026}", "getPromiseValue");
var promise_default = getPromiseValue2;
function inspectObject2(object2, options) {
  const properties = Object.getOwnPropertyNames(object2);
  const symbols = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(object2) : [];
  if (properties.length === 0 && symbols.length === 0) {
    return "{}";
  }
  options.truncate -= 4;
  options.seen = options.seen || [];
  if (options.seen.includes(object2)) {
    return "[Circular]";
  }
  options.seen.push(object2);
  const propertyContents = inspectList2(properties.map((key) => [key, object2[key]]), options, inspectProperty2);
  const symbolContents = inspectList2(symbols.map((key) => [key, object2[key]]), options, inspectProperty2);
  options.seen.pop();
  let sep = "";
  if (propertyContents && symbolContents) {
    sep = ", ";
  }
  return `{ ${propertyContents}${sep}${symbolContents} }`;
}
__name(inspectObject2, "inspectObject");
var toStringTag2 = typeof Symbol !== "undefined" && Symbol.toStringTag ? Symbol.toStringTag : false;
function inspectClass2(value, options) {
  let name = "";
  if (toStringTag2 && toStringTag2 in value) {
    name = value[toStringTag2];
  }
  name = name || value.constructor.name;
  if (!name || name === "_class") {
    name = "<Anonymous Class>";
  }
  options.truncate -= name.length;
  return `${name}${inspectObject2(value, options)}`;
}
__name(inspectClass2, "inspectClass");
function inspectArguments2(args, options) {
  if (args.length === 0)
    return "Arguments[]";
  options.truncate -= 13;
  return `Arguments[ ${inspectList2(args, options)} ]`;
}
__name(inspectArguments2, "inspectArguments");
var errorKeys2 = [
  "stack",
  "line",
  "column",
  "name",
  "message",
  "fileName",
  "lineNumber",
  "columnNumber",
  "number",
  "description",
  "cause"
];
function inspectObject22(error, options) {
  const properties = Object.getOwnPropertyNames(error).filter((key) => errorKeys2.indexOf(key) === -1);
  const name = error.name;
  options.truncate -= name.length;
  let message = "";
  if (typeof error.message === "string") {
    message = truncate2(error.message, options.truncate);
  } else {
    properties.unshift("message");
  }
  message = message ? `: ${message}` : "";
  options.truncate -= message.length + 5;
  options.seen = options.seen || [];
  if (options.seen.includes(error)) {
    return "[Circular]";
  }
  options.seen.push(error);
  const propertyContents = inspectList2(properties.map((key) => [key, error[key]]), options, inspectProperty2);
  return `${name}${message}${propertyContents ? ` { ${propertyContents} }` : ""}`;
}
__name(inspectObject22, "inspectObject");
function inspectAttribute2([key, value], options) {
  options.truncate -= 3;
  if (!value) {
    return `${options.stylize(String(key), "yellow")}`;
  }
  return `${options.stylize(String(key), "yellow")}=${options.stylize(`"${value}"`, "string")}`;
}
__name(inspectAttribute2, "inspectAttribute");
function inspectNodeCollection2(collection, options) {
  return inspectList2(collection, options, inspectNode2, "\n");
}
__name(inspectNodeCollection2, "inspectNodeCollection");
function inspectNode2(node, options) {
  switch (node.nodeType) {
    case 1:
      return inspectHTML2(node, options);
    case 3:
      return options.inspect(node.data, options);
    default:
      return options.inspect(node, options);
  }
}
__name(inspectNode2, "inspectNode");
function inspectHTML2(element, options) {
  const properties = element.getAttributeNames();
  const name = element.tagName.toLowerCase();
  const head = options.stylize(`<${name}`, "special");
  const headClose = options.stylize(`>`, "special");
  const tail = options.stylize(`</${name}>`, "special");
  options.truncate -= name.length * 2 + 5;
  let propertyContents = "";
  if (properties.length > 0) {
    propertyContents += " ";
    propertyContents += inspectList2(properties.map((key) => [key, element.getAttribute(key)]), options, inspectAttribute2, " ");
  }
  options.truncate -= propertyContents.length;
  const truncate22 = options.truncate;
  let children = inspectNodeCollection2(element.children, options);
  if (children && children.length > truncate22) {
    children = `${truncator2}(${element.children.length})`;
  }
  return `${head}${propertyContents}${headClose}${children}${tail}`;
}
__name(inspectHTML2, "inspectHTML");
var symbolsSupported2 = typeof Symbol === "function" && typeof Symbol.for === "function";
var chaiInspect2 = symbolsSupported2 ? /* @__PURE__ */ Symbol.for("chai/inspect") : "@@chai/inspect";
var nodeInspect2 = /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom");
var constructorMap2 = /* @__PURE__ */ new WeakMap();
var stringTagMap2 = {};
var baseTypesMap2 = {
  undefined: /* @__PURE__ */ __name((value, options) => options.stylize("undefined", "undefined"), "undefined"),
  null: /* @__PURE__ */ __name((value, options) => options.stylize("null", "null"), "null"),
  boolean: /* @__PURE__ */ __name((value, options) => options.stylize(String(value), "boolean"), "boolean"),
  Boolean: /* @__PURE__ */ __name((value, options) => options.stylize(String(value), "boolean"), "Boolean"),
  number: inspectNumber2,
  Number: inspectNumber2,
  bigint: inspectBigInt2,
  BigInt: inspectBigInt2,
  string: inspectString2,
  String: inspectString2,
  function: inspectFunction2,
  Function: inspectFunction2,
  symbol: inspectSymbol2,
  // A Symbol polyfill will return `Symbol` not `symbol` from typedetect
  Symbol: inspectSymbol2,
  Array: inspectArray2,
  Date: inspectDate2,
  Map: inspectMap2,
  Set: inspectSet2,
  RegExp: inspectRegExp2,
  Promise: promise_default,
  // WeakSet, WeakMap are totally opaque to us
  WeakSet: /* @__PURE__ */ __name((value, options) => options.stylize("WeakSet{\u2026}", "special"), "WeakSet"),
  WeakMap: /* @__PURE__ */ __name((value, options) => options.stylize("WeakMap{\u2026}", "special"), "WeakMap"),
  Arguments: inspectArguments2,
  Int8Array: inspectTypedArray2,
  Uint8Array: inspectTypedArray2,
  Uint8ClampedArray: inspectTypedArray2,
  Int16Array: inspectTypedArray2,
  Uint16Array: inspectTypedArray2,
  Int32Array: inspectTypedArray2,
  Uint32Array: inspectTypedArray2,
  Float32Array: inspectTypedArray2,
  Float64Array: inspectTypedArray2,
  Generator: /* @__PURE__ */ __name(() => "", "Generator"),
  DataView: /* @__PURE__ */ __name(() => "", "DataView"),
  ArrayBuffer: /* @__PURE__ */ __name(() => "", "ArrayBuffer"),
  Error: inspectObject22,
  HTMLCollection: inspectNodeCollection2,
  NodeList: inspectNodeCollection2
};
var inspectCustom2 = /* @__PURE__ */ __name((value, options, type3, inspectFn) => {
  if (chaiInspect2 in value && typeof value[chaiInspect2] === "function") {
    return value[chaiInspect2](options);
  }
  if (nodeInspect2 in value && typeof value[nodeInspect2] === "function") {
    return value[nodeInspect2](options.depth, options, inspectFn);
  }
  if ("inspect" in value && typeof value.inspect === "function") {
    return value.inspect(options.depth, options);
  }
  if ("constructor" in value && constructorMap2.has(value.constructor)) {
    return constructorMap2.get(value.constructor)(value, options);
  }
  if (stringTagMap2[type3]) {
    return stringTagMap2[type3](value, options);
  }
  return "";
}, "inspectCustom");
var toString3 = Object.prototype.toString;
function inspect2(value, opts = {}) {
  const options = normaliseOptions2(opts, inspect2);
  const { customInspect } = options;
  let type3 = value === null ? "null" : typeof value;
  if (type3 === "object") {
    type3 = toString3.call(value).slice(8, -1);
  }
  if (type3 in baseTypesMap2) {
    return baseTypesMap2[type3](value, options);
  }
  if (customInspect && value) {
    const output = inspectCustom2(value, options, type3, inspect2);
    if (output) {
      if (typeof output === "string")
        return output;
      return inspect2(output, options);
    }
  }
  const proto = value ? Object.getPrototypeOf(value) : false;
  if (proto === Object.prototype || proto === null) {
    return inspectObject2(value, options);
  }
  if (value && typeof HTMLElement === "function" && value instanceof HTMLElement) {
    return inspectHTML2(value, options);
  }
  if ("constructor" in value) {
    if (value.constructor !== Object) {
      return inspectClass2(value, options);
    }
    return inspectObject2(value, options);
  }
  if (value === Object(value)) {
    return inspectObject2(value, options);
  }
  return options.stylize(String(value), type3);
}
__name(inspect2, "inspect");
var config = {
  /**
   * ### config.includeStack
   *
   * User configurable property, influences whether stack trace
   * is included in Assertion error message. Default of false
   * suppresses stack trace in the error message.
   *
   *     chai.config.includeStack = true;  // enable stack on error
   *
   * @param {boolean}
   * @public
   */
  includeStack: false,
  /**
   * ### config.showDiff
   *
   * User configurable property, influences whether or not
   * the `showDiff` flag should be included in the thrown
   * AssertionErrors. `false` will always be `false`; `true`
   * will be true when the assertion has requested a diff
   * be shown.
   *
   * @param {boolean}
   * @public
   */
  showDiff: true,
  /**
   * ### config.truncateThreshold
   *
   * User configurable property, sets length threshold for actual and
   * expected values in assertion errors. If this threshold is exceeded, for
   * example for large data structures, the value is replaced with something
   * like `[ Array(3) ]` or `{ Object (prop1, prop2) }`.
   *
   * Set it to zero if you want to disable truncating altogether.
   *
   * This is especially userful when doing assertions on arrays: having this
   * set to a reasonable large value makes the failure messages readily
   * inspectable.
   *
   *     chai.config.truncateThreshold = 0;  // disable truncating
   *
   * @param {number}
   * @public
   */
  truncateThreshold: 40,
  /**
   * ### config.useProxy
   *
   * User configurable property, defines if chai will use a Proxy to throw
   * an error when a non-existent property is read, which protects users
   * from typos when using property-based assertions.
   *
   * Set it to false if you want to disable this feature.
   *
   *     chai.config.useProxy = false;  // disable use of Proxy
   *
   * This feature is automatically disabled regardless of this config value
   * in environments that don't support proxies.
   *
   * @param {boolean}
   * @public
   */
  useProxy: true,
  /**
   * ### config.proxyExcludedKeys
   *
   * User configurable property, defines which properties should be ignored
   * instead of throwing an error if they do not exist on the assertion.
   * This is only applied if the environment Chai is running in supports proxies and
   * if the `useProxy` configuration setting is enabled.
   * By default, `then` and `inspect` will not throw an error if they do not exist on the
   * assertion object because the `.inspect` property is read by `util.inspect` (for example, when
   * using `console.log` on the assertion object) and `.then` is necessary for promise type-checking.
   *
   *     // By default these keys will not throw an error if they do not exist on the assertion object
   *     chai.config.proxyExcludedKeys = ['then', 'inspect'];
   *
   * @param {Array}
   * @public
   */
  proxyExcludedKeys: ["then", "catch", "inspect", "toJSON"],
  /**
   * ### config.deepEqual
   *
   * User configurable property, defines which a custom function to use for deepEqual
   * comparisons.
   * By default, the function used is the one from the `deep-eql` package without custom comparator.
   *
   *     // use a custom comparator
   *     chai.config.deepEqual = (expected, actual) => {
   *         return chai.util.eql(expected, actual, {
   *             comparator: (expected, actual) => {
   *                 // for non number comparison, use the default behavior
   *                 if(typeof expected !== 'number') return null;
   *                 // allow a difference of 10 between compared numbers
   *                 return typeof actual === 'number' && Math.abs(actual - expected) < 10
   *             }
   *         })
   *     };
   *
   * @param {Function}
   * @public
   */
  deepEqual: null
};
function inspect22(obj, showHidden, depth, colors) {
  let options = {
    colors,
    depth: typeof depth === "undefined" ? 2 : depth,
    showHidden,
    truncate: config.truncateThreshold ? config.truncateThreshold : Infinity
  };
  return inspect2(obj, options);
}
__name(inspect22, "inspect");
function objDisplay2(obj) {
  let str = inspect22(obj), type3 = Object.prototype.toString.call(obj);
  if (config.truncateThreshold && str.length >= config.truncateThreshold) {
    if (type3 === "[object Function]") {
      return !obj.name || obj.name === "" ? "[Function]" : "[Function: " + obj.name + "]";
    } else if (type3 === "[object Array]") {
      return "[ Array(" + obj.length + ") ]";
    } else if (type3 === "[object Object]") {
      let keys2 = Object.keys(obj), kstr = keys2.length > 2 ? keys2.splice(0, 2).join(", ") + ", ..." : keys2.join(", ");
      return "{ Object (" + kstr + ") }";
    } else {
      return str;
    }
  } else {
    return str;
  }
}
__name(objDisplay2, "objDisplay");
function getMessage2(obj, args) {
  let negate = flag(obj, "negate");
  let val = flag(obj, "object");
  let expected = args[3];
  let actual = getActual(obj, args);
  let msg = negate ? args[2] : args[1];
  let flagMsg = flag(obj, "message");
  if (typeof msg === "function") msg = msg();
  msg = msg || "";
  msg = msg.replace(/#\{this\}/g, function() {
    return objDisplay2(val);
  }).replace(/#\{act\}/g, function() {
    return objDisplay2(actual);
  }).replace(/#\{exp\}/g, function() {
    return objDisplay2(expected);
  });
  return flagMsg ? flagMsg + ": " + msg : msg;
}
__name(getMessage2, "getMessage");
function transferFlags(assertion, object2, includeAll) {
  let flags = assertion.__flags || (assertion.__flags = /* @__PURE__ */ Object.create(null));
  if (!object2.__flags) {
    object2.__flags = /* @__PURE__ */ Object.create(null);
  }
  includeAll = arguments.length === 3 ? includeAll : true;
  for (let flag3 in flags) {
    if (includeAll || flag3 !== "object" && flag3 !== "ssfi" && flag3 !== "lockSsfi" && flag3 != "message") {
      object2.__flags[flag3] = flags[flag3];
    }
  }
}
__name(transferFlags, "transferFlags");
function type2(obj) {
  if (typeof obj === "undefined") {
    return "undefined";
  }
  if (obj === null) {
    return "null";
  }
  const stringTag = obj[Symbol.toStringTag];
  if (typeof stringTag === "string") {
    return stringTag;
  }
  const sliceStart = 8;
  const sliceEnd = -1;
  return Object.prototype.toString.call(obj).slice(sliceStart, sliceEnd);
}
__name(type2, "type");
function FakeMap() {
  this._key = "chai/deep-eql__" + Math.random() + Date.now();
}
__name(FakeMap, "FakeMap");
FakeMap.prototype = {
  get: /* @__PURE__ */ __name(function get(key) {
    return key[this._key];
  }, "get"),
  set: /* @__PURE__ */ __name(function set(key, value) {
    if (Object.isExtensible(key)) {
      Object.defineProperty(key, this._key, {
        value,
        configurable: true
      });
    }
  }, "set")
};
var MemoizeMap = typeof WeakMap === "function" ? WeakMap : FakeMap;
function memoizeCompare(leftHandOperand, rightHandOperand, memoizeMap) {
  if (!memoizeMap || isPrimitive2(leftHandOperand) || isPrimitive2(rightHandOperand)) {
    return null;
  }
  var leftHandMap = memoizeMap.get(leftHandOperand);
  if (leftHandMap) {
    var result = leftHandMap.get(rightHandOperand);
    if (typeof result === "boolean") {
      return result;
    }
  }
  return null;
}
__name(memoizeCompare, "memoizeCompare");
function memoizeSet(leftHandOperand, rightHandOperand, memoizeMap, result) {
  if (!memoizeMap || isPrimitive2(leftHandOperand) || isPrimitive2(rightHandOperand)) {
    return;
  }
  var leftHandMap = memoizeMap.get(leftHandOperand);
  if (leftHandMap) {
    leftHandMap.set(rightHandOperand, result);
  } else {
    leftHandMap = new MemoizeMap();
    leftHandMap.set(rightHandOperand, result);
    memoizeMap.set(leftHandOperand, leftHandMap);
  }
}
__name(memoizeSet, "memoizeSet");
var deep_eql_default = deepEqual;
function deepEqual(leftHandOperand, rightHandOperand, options) {
  if (options && options.comparator) {
    return extensiveDeepEqual(leftHandOperand, rightHandOperand, options);
  }
  var simpleResult = simpleEqual(leftHandOperand, rightHandOperand);
  if (simpleResult !== null) {
    return simpleResult;
  }
  return extensiveDeepEqual(leftHandOperand, rightHandOperand, options);
}
__name(deepEqual, "deepEqual");
function simpleEqual(leftHandOperand, rightHandOperand) {
  if (leftHandOperand === rightHandOperand) {
    return leftHandOperand !== 0 || 1 / leftHandOperand === 1 / rightHandOperand;
  }
  if (leftHandOperand !== leftHandOperand && // eslint-disable-line no-self-compare
  rightHandOperand !== rightHandOperand) {
    return true;
  }
  if (isPrimitive2(leftHandOperand) || isPrimitive2(rightHandOperand)) {
    return false;
  }
  return null;
}
__name(simpleEqual, "simpleEqual");
function extensiveDeepEqual(leftHandOperand, rightHandOperand, options) {
  options = options || {};
  options.memoize = options.memoize === false ? false : options.memoize || new MemoizeMap();
  var comparator = options && options.comparator;
  var memoizeResultLeft = memoizeCompare(leftHandOperand, rightHandOperand, options.memoize);
  if (memoizeResultLeft !== null) {
    return memoizeResultLeft;
  }
  var memoizeResultRight = memoizeCompare(rightHandOperand, leftHandOperand, options.memoize);
  if (memoizeResultRight !== null) {
    return memoizeResultRight;
  }
  if (comparator) {
    var comparatorResult = comparator(leftHandOperand, rightHandOperand);
    if (comparatorResult === false || comparatorResult === true) {
      memoizeSet(leftHandOperand, rightHandOperand, options.memoize, comparatorResult);
      return comparatorResult;
    }
    var simpleResult = simpleEqual(leftHandOperand, rightHandOperand);
    if (simpleResult !== null) {
      return simpleResult;
    }
  }
  var leftHandType = type2(leftHandOperand);
  if (leftHandType !== type2(rightHandOperand)) {
    memoizeSet(leftHandOperand, rightHandOperand, options.memoize, false);
    return false;
  }
  memoizeSet(leftHandOperand, rightHandOperand, options.memoize, true);
  var result = extensiveDeepEqualByType(leftHandOperand, rightHandOperand, leftHandType, options);
  memoizeSet(leftHandOperand, rightHandOperand, options.memoize, result);
  return result;
}
__name(extensiveDeepEqual, "extensiveDeepEqual");
function extensiveDeepEqualByType(leftHandOperand, rightHandOperand, leftHandType, options) {
  switch (leftHandType) {
    case "String":
    case "Number":
    case "Boolean":
    case "Date":
      return deepEqual(leftHandOperand.valueOf(), rightHandOperand.valueOf());
    case "Promise":
    case "Symbol":
    case "function":
    case "WeakMap":
    case "WeakSet":
      return leftHandOperand === rightHandOperand;
    case "Error":
      return keysEqual(leftHandOperand, rightHandOperand, ["name", "message", "code"], options);
    case "Arguments":
    case "Int8Array":
    case "Uint8Array":
    case "Uint8ClampedArray":
    case "Int16Array":
    case "Uint16Array":
    case "Int32Array":
    case "Uint32Array":
    case "Float32Array":
    case "Float64Array":
    case "Array":
      return iterableEqual(leftHandOperand, rightHandOperand, options);
    case "RegExp":
      return regexpEqual(leftHandOperand, rightHandOperand);
    case "Generator":
      return generatorEqual(leftHandOperand, rightHandOperand, options);
    case "DataView":
      return iterableEqual(new Uint8Array(leftHandOperand.buffer), new Uint8Array(rightHandOperand.buffer), options);
    case "ArrayBuffer":
      return iterableEqual(new Uint8Array(leftHandOperand), new Uint8Array(rightHandOperand), options);
    case "Set":
      return entriesEqual(leftHandOperand, rightHandOperand, options);
    case "Map":
      return entriesEqual(leftHandOperand, rightHandOperand, options);
    case "Temporal.PlainDate":
    case "Temporal.PlainTime":
    case "Temporal.PlainDateTime":
    case "Temporal.Instant":
    case "Temporal.ZonedDateTime":
    case "Temporal.PlainYearMonth":
    case "Temporal.PlainMonthDay":
      return leftHandOperand.equals(rightHandOperand);
    case "Temporal.Duration":
      return leftHandOperand.total("nanoseconds") === rightHandOperand.total("nanoseconds");
    case "Temporal.TimeZone":
    case "Temporal.Calendar":
      return leftHandOperand.toString() === rightHandOperand.toString();
    default:
      return objectEqual(leftHandOperand, rightHandOperand, options);
  }
}
__name(extensiveDeepEqualByType, "extensiveDeepEqualByType");
function regexpEqual(leftHandOperand, rightHandOperand) {
  return leftHandOperand.toString() === rightHandOperand.toString();
}
__name(regexpEqual, "regexpEqual");
function entriesEqual(leftHandOperand, rightHandOperand, options) {
  try {
    if (leftHandOperand.size !== rightHandOperand.size) {
      return false;
    }
    if (leftHandOperand.size === 0) {
      return true;
    }
  } catch (sizeError) {
    return false;
  }
  var leftHandItems = [];
  var rightHandItems = [];
  leftHandOperand.forEach(/* @__PURE__ */ __name(function gatherEntries(key, value) {
    leftHandItems.push([key, value]);
  }, "gatherEntries"));
  rightHandOperand.forEach(/* @__PURE__ */ __name(function gatherEntries(key, value) {
    rightHandItems.push([key, value]);
  }, "gatherEntries"));
  return iterableEqual(leftHandItems.sort(), rightHandItems.sort(), options);
}
__name(entriesEqual, "entriesEqual");
function iterableEqual(leftHandOperand, rightHandOperand, options) {
  var length = leftHandOperand.length;
  if (length !== rightHandOperand.length) {
    return false;
  }
  if (length === 0) {
    return true;
  }
  var index2 = -1;
  while (++index2 < length) {
    if (deepEqual(leftHandOperand[index2], rightHandOperand[index2], options) === false) {
      return false;
    }
  }
  return true;
}
__name(iterableEqual, "iterableEqual");
function generatorEqual(leftHandOperand, rightHandOperand, options) {
  return iterableEqual(getGeneratorEntries(leftHandOperand), getGeneratorEntries(rightHandOperand), options);
}
__name(generatorEqual, "generatorEqual");
function hasIteratorFunction(target) {
  return typeof Symbol !== "undefined" && typeof target === "object" && typeof Symbol.iterator !== "undefined" && typeof target[Symbol.iterator] === "function";
}
__name(hasIteratorFunction, "hasIteratorFunction");
function getIteratorEntries(target) {
  if (hasIteratorFunction(target)) {
    try {
      return getGeneratorEntries(target[Symbol.iterator]());
    } catch (iteratorError) {
      return [];
    }
  }
  return [];
}
__name(getIteratorEntries, "getIteratorEntries");
function getGeneratorEntries(generator) {
  var generatorResult = generator.next();
  var accumulator = [generatorResult.value];
  while (generatorResult.done === false) {
    generatorResult = generator.next();
    accumulator.push(generatorResult.value);
  }
  return accumulator;
}
__name(getGeneratorEntries, "getGeneratorEntries");
function getEnumerableKeys(target) {
  var keys2 = [];
  for (var key in target) {
    keys2.push(key);
  }
  return keys2;
}
__name(getEnumerableKeys, "getEnumerableKeys");
function getEnumerableSymbols(target) {
  var keys2 = [];
  var allKeys = Object.getOwnPropertySymbols(target);
  for (var i3 = 0; i3 < allKeys.length; i3 += 1) {
    var key = allKeys[i3];
    if (Object.getOwnPropertyDescriptor(target, key).enumerable) {
      keys2.push(key);
    }
  }
  return keys2;
}
__name(getEnumerableSymbols, "getEnumerableSymbols");
function keysEqual(leftHandOperand, rightHandOperand, keys2, options) {
  var length = keys2.length;
  if (length === 0) {
    return true;
  }
  for (var i3 = 0; i3 < length; i3 += 1) {
    if (deepEqual(leftHandOperand[keys2[i3]], rightHandOperand[keys2[i3]], options) === false) {
      return false;
    }
  }
  return true;
}
__name(keysEqual, "keysEqual");
function objectEqual(leftHandOperand, rightHandOperand, options) {
  var leftHandKeys = getEnumerableKeys(leftHandOperand);
  var rightHandKeys = getEnumerableKeys(rightHandOperand);
  var leftHandSymbols = getEnumerableSymbols(leftHandOperand);
  var rightHandSymbols = getEnumerableSymbols(rightHandOperand);
  leftHandKeys = leftHandKeys.concat(leftHandSymbols);
  rightHandKeys = rightHandKeys.concat(rightHandSymbols);
  if (leftHandKeys.length && leftHandKeys.length === rightHandKeys.length) {
    if (iterableEqual(mapSymbols(leftHandKeys).sort(), mapSymbols(rightHandKeys).sort()) === false) {
      return false;
    }
    return keysEqual(leftHandOperand, rightHandOperand, leftHandKeys, options);
  }
  var leftHandEntries = getIteratorEntries(leftHandOperand);
  var rightHandEntries = getIteratorEntries(rightHandOperand);
  if (leftHandEntries.length && leftHandEntries.length === rightHandEntries.length) {
    leftHandEntries.sort();
    rightHandEntries.sort();
    return iterableEqual(leftHandEntries, rightHandEntries, options);
  }
  if (leftHandKeys.length === 0 && leftHandEntries.length === 0 && rightHandKeys.length === 0 && rightHandEntries.length === 0) {
    return true;
  }
  return false;
}
__name(objectEqual, "objectEqual");
function isPrimitive2(value) {
  return value === null || typeof value !== "object";
}
__name(isPrimitive2, "isPrimitive");
function mapSymbols(arr) {
  return arr.map(/* @__PURE__ */ __name(function mapSymbol(entry) {
    if (typeof entry === "symbol") {
      return entry.toString();
    }
    return entry;
  }, "mapSymbol"));
}
__name(mapSymbols, "mapSymbols");
function hasProperty(obj, name) {
  if (typeof obj === "undefined" || obj === null) {
    return false;
  }
  return name in Object(obj);
}
__name(hasProperty, "hasProperty");
function parsePath(path) {
  const str = path.replace(/([^\\])\[/g, "$1.[");
  const parts = str.match(/(\\\.|[^.]+?)+/g);
  return parts.map((value) => {
    if (value === "constructor" || value === "__proto__" || value === "prototype") {
      return {};
    }
    const regexp = /^\[(\d+)\]$/;
    const mArr = regexp.exec(value);
    let parsed = null;
    if (mArr) {
      parsed = { i: parseFloat(mArr[1]) };
    } else {
      parsed = { p: value.replace(/\\([.[\]])/g, "$1") };
    }
    return parsed;
  });
}
__name(parsePath, "parsePath");
function internalGetPathValue(obj, parsed, pathDepth) {
  let temporaryValue = obj;
  let res = null;
  pathDepth = typeof pathDepth === "undefined" ? parsed.length : pathDepth;
  for (let i3 = 0; i3 < pathDepth; i3++) {
    const part = parsed[i3];
    if (temporaryValue) {
      if (typeof part.p === "undefined") {
        temporaryValue = temporaryValue[part.i];
      } else {
        temporaryValue = temporaryValue[part.p];
      }
      if (i3 === pathDepth - 1) {
        res = temporaryValue;
      }
    }
  }
  return res;
}
__name(internalGetPathValue, "internalGetPathValue");
function getPathInfo(obj, path) {
  const parsed = parsePath(path);
  const last = parsed[parsed.length - 1];
  const info = {
    parent: parsed.length > 1 ? internalGetPathValue(obj, parsed, parsed.length - 1) : obj,
    name: last.p || last.i,
    value: internalGetPathValue(obj, parsed)
  };
  info.exists = hasProperty(info.parent, info.name);
  return info;
}
__name(getPathInfo, "getPathInfo");
var _Assertion = class _Assertion2 {
  /**
   * Creates object for chaining.
   * `Assertion` objects contain metadata in the form of flags. Three flags can
   * be assigned during instantiation by passing arguments to this constructor:
   *
   * - `object`: This flag contains the target of the assertion. For example, in
   * the assertion `expect(numKittens).to.equal(7);`, the `object` flag will
   * contain `numKittens` so that the `equal` assertion can reference it when
   * needed.
   *
   * - `message`: This flag contains an optional custom error message to be
   * prepended to the error message that's generated by the assertion when it
   * fails.
   *
   * - `ssfi`: This flag stands for "start stack function indicator". It
   * contains a function reference that serves as the starting point for
   * removing frames from the stack trace of the error that's created by the
   * assertion when it fails. The goal is to provide a cleaner stack trace to
   * end users by removing Chai's internal functions. Note that it only works
   * in environments that support `Error.captureStackTrace`, and only when
   * `Chai.config.includeStack` hasn't been set to `false`.
   *
   * - `lockSsfi`: This flag controls whether or not the given `ssfi` flag
   * should retain its current value, even as assertions are chained off of
   * this object. This is usually set to `true` when creating a new assertion
   * from within another assertion. It's also temporarily set to `true` before
   * an overwritten assertion gets called by the overwriting assertion.
   *
   * - `eql`: This flag contains the deepEqual function to be used by the assertion.
   *
   * @param {unknown} obj target of the assertion
   * @param {string} [msg] (optional) custom error message
   * @param {Function} [ssfi] (optional) starting point for removing stack frames
   * @param {boolean} [lockSsfi] (optional) whether or not the ssfi flag is locked
   */
  constructor(obj, msg, ssfi, lockSsfi) {
    __publicField(this, "__flags", {});
    flag(this, "ssfi", ssfi || _Assertion2);
    flag(this, "lockSsfi", lockSsfi);
    flag(this, "object", obj);
    flag(this, "message", msg);
    flag(this, "eql", config.deepEqual || deep_eql_default);
    return proxify(this);
  }
  /** @returns {boolean} */
  static get includeStack() {
    console.warn(
      "Assertion.includeStack is deprecated, use chai.config.includeStack instead."
    );
    return config.includeStack;
  }
  /** @param {boolean} value */
  static set includeStack(value) {
    console.warn(
      "Assertion.includeStack is deprecated, use chai.config.includeStack instead."
    );
    config.includeStack = value;
  }
  /** @returns {boolean} */
  static get showDiff() {
    console.warn(
      "Assertion.showDiff is deprecated, use chai.config.showDiff instead."
    );
    return config.showDiff;
  }
  /** @param {boolean} value */
  static set showDiff(value) {
    console.warn(
      "Assertion.showDiff is deprecated, use chai.config.showDiff instead."
    );
    config.showDiff = value;
  }
  /**
   * @param {string} name
   * @param {Function} fn
   */
  static addProperty(name, fn2) {
    addProperty(this.prototype, name, fn2);
  }
  /**
   * @param {string} name
   * @param {Function} fn
   */
  static addMethod(name, fn2) {
    addMethod(this.prototype, name, fn2);
  }
  /**
   * @param {string} name
   * @param {Function} fn
   * @param {Function} chainingBehavior
   */
  static addChainableMethod(name, fn2, chainingBehavior) {
    addChainableMethod(this.prototype, name, fn2, chainingBehavior);
  }
  /**
   * @param {string} name
   * @param {Function} fn
   */
  static overwriteProperty(name, fn2) {
    overwriteProperty(this.prototype, name, fn2);
  }
  /**
   * @param {string} name
   * @param {Function} fn
   */
  static overwriteMethod(name, fn2) {
    overwriteMethod(this.prototype, name, fn2);
  }
  /**
   * @param {string} name
   * @param {Function} fn
   * @param {Function} chainingBehavior
   */
  static overwriteChainableMethod(name, fn2, chainingBehavior) {
    overwriteChainableMethod(this.prototype, name, fn2, chainingBehavior);
  }
  /**
   * ### .assert(expression, message, negateMessage, expected, actual, showDiff)
   *
   * Executes an expression and check expectations. Throws AssertionError for reporting if test doesn't pass.
   *
   * @name assert
   * @param {unknown} _expr to be tested
   * @param {string | Function} msg or function that returns message to display if expression fails
   * @param {string | Function} _negateMsg or function that returns negatedMessage to display if negated expression fails
   * @param {unknown} expected value (remember to check for negation)
   * @param {unknown} _actual (optional) will default to `this.obj`
   * @param {boolean} showDiff (optional) when set to `true`, assert will display a diff in addition to the message if expression fails
   * @returns {void}
   */
  assert(_expr, msg, _negateMsg, expected, _actual, showDiff) {
    const ok = test3(this, arguments);
    if (false !== showDiff) showDiff = true;
    if (void 0 === expected && void 0 === _actual) showDiff = false;
    if (true !== config.showDiff) showDiff = false;
    if (!ok) {
      msg = getMessage2(this, arguments);
      const actual = getActual(this, arguments);
      const assertionErrorObjectProperties = {
        actual,
        expected,
        showDiff
      };
      const operator = getOperator(this, arguments);
      if (operator) {
        assertionErrorObjectProperties.operator = operator;
      }
      throw new AssertionError(
        msg,
        assertionErrorObjectProperties,
        // @ts-expect-error Not sure what to do about these types yet
        config.includeStack ? this.assert : flag(this, "ssfi")
      );
    }
  }
  /**
   * Quick reference to stored `actual` value for plugin developers.
   *
   * @returns {unknown}
   */
  get _obj() {
    return flag(this, "object");
  }
  /**
   * Quick reference to stored `actual` value for plugin developers.
   *
   * @param {unknown} val
   */
  set _obj(val) {
    flag(this, "object", val);
  }
};
__name(_Assertion, "Assertion");
var Assertion = _Assertion;
var events = new EventTarget();
var _PluginEvent = class _PluginEvent2 extends Event {
  constructor(type3, name, fn2) {
    super(type3);
    this.name = String(name);
    this.fn = fn2;
  }
};
__name(_PluginEvent, "PluginEvent");
var PluginEvent = _PluginEvent;
function isProxyEnabled() {
  return config.useProxy && typeof Proxy !== "undefined" && typeof Reflect !== "undefined";
}
__name(isProxyEnabled, "isProxyEnabled");
function addProperty(ctx, name, getter) {
  getter = getter === void 0 ? function() {
  } : getter;
  Object.defineProperty(ctx, name, {
    get: /* @__PURE__ */ __name(function propertyGetter() {
      if (!isProxyEnabled() && !flag(this, "lockSsfi")) {
        flag(this, "ssfi", propertyGetter);
      }
      let result = getter.call(this);
      if (result !== void 0) return result;
      let newAssertion = new Assertion();
      transferFlags(this, newAssertion);
      return newAssertion;
    }, "propertyGetter"),
    configurable: true
  });
  events.dispatchEvent(new PluginEvent("addProperty", name, getter));
}
__name(addProperty, "addProperty");
var fnLengthDesc = Object.getOwnPropertyDescriptor(function() {
}, "length");
function addLengthGuard(fn2, assertionName, isChainable) {
  if (!fnLengthDesc.configurable) return fn2;
  Object.defineProperty(fn2, "length", {
    get: /* @__PURE__ */ __name(function() {
      if (isChainable) {
        throw Error(
          "Invalid Chai property: " + assertionName + '.length. Due to a compatibility issue, "length" cannot directly follow "' + assertionName + '". Use "' + assertionName + '.lengthOf" instead.'
        );
      }
      throw Error(
        "Invalid Chai property: " + assertionName + '.length. See docs for proper usage of "' + assertionName + '".'
      );
    }, "get")
  });
  return fn2;
}
__name(addLengthGuard, "addLengthGuard");
function getProperties(object2) {
  let result = Object.getOwnPropertyNames(object2);
  function addProperty2(property) {
    if (result.indexOf(property) === -1) {
      result.push(property);
    }
  }
  __name(addProperty2, "addProperty");
  let proto = Object.getPrototypeOf(object2);
  while (proto !== null) {
    Object.getOwnPropertyNames(proto).forEach(addProperty2);
    proto = Object.getPrototypeOf(proto);
  }
  return result;
}
__name(getProperties, "getProperties");
var builtins = ["__flags", "__methods", "_obj", "assert"];
function proxify(obj, nonChainableMethodName) {
  if (!isProxyEnabled()) return obj;
  return new Proxy(obj, {
    get: /* @__PURE__ */ __name(function proxyGetter(target, property) {
      if (typeof property === "string" && config.proxyExcludedKeys.indexOf(property) === -1 && !Reflect.has(target, property)) {
        if (nonChainableMethodName) {
          throw Error(
            "Invalid Chai property: " + nonChainableMethodName + "." + property + '. See docs for proper usage of "' + nonChainableMethodName + '".'
          );
        }
        let suggestion = null;
        let suggestionDistance = 4;
        getProperties(target).forEach(function(prop) {
          if (
            // we actually mean to check `Object.prototype` here
            // eslint-disable-next-line no-prototype-builtins
            !Object.prototype.hasOwnProperty(prop) && builtins.indexOf(prop) === -1
          ) {
            let dist = stringDistanceCapped(property, prop, suggestionDistance);
            if (dist < suggestionDistance) {
              suggestion = prop;
              suggestionDistance = dist;
            }
          }
        });
        if (suggestion !== null) {
          throw Error(
            "Invalid Chai property: " + property + '. Did you mean "' + suggestion + '"?'
          );
        } else {
          throw Error("Invalid Chai property: " + property);
        }
      }
      if (builtins.indexOf(property) === -1 && !flag(target, "lockSsfi")) {
        flag(target, "ssfi", proxyGetter);
      }
      return Reflect.get(target, property);
    }, "proxyGetter")
  });
}
__name(proxify, "proxify");
function stringDistanceCapped(strA, strB, cap) {
  if (Math.abs(strA.length - strB.length) >= cap) {
    return cap;
  }
  let memo = [];
  for (let i3 = 0; i3 <= strA.length; i3++) {
    memo[i3] = Array(strB.length + 1).fill(0);
    memo[i3][0] = i3;
  }
  for (let j2 = 0; j2 < strB.length; j2++) {
    memo[0][j2] = j2;
  }
  for (let i3 = 1; i3 <= strA.length; i3++) {
    let ch = strA.charCodeAt(i3 - 1);
    for (let j2 = 1; j2 <= strB.length; j2++) {
      if (Math.abs(i3 - j2) >= cap) {
        memo[i3][j2] = cap;
        continue;
      }
      memo[i3][j2] = Math.min(
        memo[i3 - 1][j2] + 1,
        memo[i3][j2 - 1] + 1,
        memo[i3 - 1][j2 - 1] + (ch === strB.charCodeAt(j2 - 1) ? 0 : 1)
      );
    }
  }
  return memo[strA.length][strB.length];
}
__name(stringDistanceCapped, "stringDistanceCapped");
function addMethod(ctx, name, method) {
  let methodWrapper = /* @__PURE__ */ __name(function() {
    if (!flag(this, "lockSsfi")) {
      flag(this, "ssfi", methodWrapper);
    }
    let result = method.apply(this, arguments);
    if (result !== void 0) return result;
    let newAssertion = new Assertion();
    transferFlags(this, newAssertion);
    return newAssertion;
  }, "methodWrapper");
  addLengthGuard(methodWrapper, name, false);
  ctx[name] = proxify(methodWrapper, name);
  events.dispatchEvent(new PluginEvent("addMethod", name, method));
}
__name(addMethod, "addMethod");
function overwriteProperty(ctx, name, getter) {
  let _get = Object.getOwnPropertyDescriptor(ctx, name), _super = /* @__PURE__ */ __name(function() {
  }, "_super");
  if (_get && "function" === typeof _get.get) _super = _get.get;
  Object.defineProperty(ctx, name, {
    get: /* @__PURE__ */ __name(function overwritingPropertyGetter() {
      if (!isProxyEnabled() && !flag(this, "lockSsfi")) {
        flag(this, "ssfi", overwritingPropertyGetter);
      }
      let origLockSsfi = flag(this, "lockSsfi");
      flag(this, "lockSsfi", true);
      let result = getter(_super).call(this);
      flag(this, "lockSsfi", origLockSsfi);
      if (result !== void 0) {
        return result;
      }
      let newAssertion = new Assertion();
      transferFlags(this, newAssertion);
      return newAssertion;
    }, "overwritingPropertyGetter"),
    configurable: true
  });
}
__name(overwriteProperty, "overwriteProperty");
function overwriteMethod(ctx, name, method) {
  let _method = ctx[name], _super = /* @__PURE__ */ __name(function() {
    throw new Error(name + " is not a function");
  }, "_super");
  if (_method && "function" === typeof _method) _super = _method;
  let overwritingMethodWrapper = /* @__PURE__ */ __name(function() {
    if (!flag(this, "lockSsfi")) {
      flag(this, "ssfi", overwritingMethodWrapper);
    }
    let origLockSsfi = flag(this, "lockSsfi");
    flag(this, "lockSsfi", true);
    let result = method(_super).apply(this, arguments);
    flag(this, "lockSsfi", origLockSsfi);
    if (result !== void 0) {
      return result;
    }
    let newAssertion = new Assertion();
    transferFlags(this, newAssertion);
    return newAssertion;
  }, "overwritingMethodWrapper");
  addLengthGuard(overwritingMethodWrapper, name, false);
  ctx[name] = proxify(overwritingMethodWrapper, name);
}
__name(overwriteMethod, "overwriteMethod");
var canSetPrototype = typeof Object.setPrototypeOf === "function";
var testFn = /* @__PURE__ */ __name(function() {
}, "testFn");
var excludeNames = Object.getOwnPropertyNames(testFn).filter(function(name) {
  let propDesc = Object.getOwnPropertyDescriptor(testFn, name);
  if (typeof propDesc !== "object") return true;
  return !propDesc.configurable;
});
var call = Function.prototype.call;
var apply = Function.prototype.apply;
var _PluginAddChainableMethodEvent = class _PluginAddChainableMethodEvent2 extends PluginEvent {
  constructor(type3, name, fn2, chainingBehavior) {
    super(type3, name, fn2);
    this.chainingBehavior = chainingBehavior;
  }
};
__name(_PluginAddChainableMethodEvent, "PluginAddChainableMethodEvent");
var PluginAddChainableMethodEvent = _PluginAddChainableMethodEvent;
function addChainableMethod(ctx, name, method, chainingBehavior) {
  if (typeof chainingBehavior !== "function") {
    chainingBehavior = /* @__PURE__ */ __name(function() {
    }, "chainingBehavior");
  }
  let chainableBehavior = {
    method,
    chainingBehavior
  };
  if (!ctx.__methods) {
    ctx.__methods = {};
  }
  ctx.__methods[name] = chainableBehavior;
  Object.defineProperty(ctx, name, {
    get: /* @__PURE__ */ __name(function chainableMethodGetter() {
      chainableBehavior.chainingBehavior.call(this);
      let chainableMethodWrapper = /* @__PURE__ */ __name(function() {
        if (!flag(this, "lockSsfi")) {
          flag(this, "ssfi", chainableMethodWrapper);
        }
        let result = chainableBehavior.method.apply(this, arguments);
        if (result !== void 0) {
          return result;
        }
        let newAssertion = new Assertion();
        transferFlags(this, newAssertion);
        return newAssertion;
      }, "chainableMethodWrapper");
      addLengthGuard(chainableMethodWrapper, name, true);
      if (canSetPrototype) {
        let prototype = Object.create(this);
        prototype.call = call;
        prototype.apply = apply;
        Object.setPrototypeOf(chainableMethodWrapper, prototype);
      } else {
        let asserterNames = Object.getOwnPropertyNames(ctx);
        asserterNames.forEach(function(asserterName) {
          if (excludeNames.indexOf(asserterName) !== -1) {
            return;
          }
          let pd = Object.getOwnPropertyDescriptor(ctx, asserterName);
          Object.defineProperty(chainableMethodWrapper, asserterName, pd);
        });
      }
      transferFlags(this, chainableMethodWrapper);
      return proxify(chainableMethodWrapper);
    }, "chainableMethodGetter"),
    configurable: true
  });
  events.dispatchEvent(
    new PluginAddChainableMethodEvent(
      "addChainableMethod",
      name,
      method,
      chainingBehavior
    )
  );
}
__name(addChainableMethod, "addChainableMethod");
function overwriteChainableMethod(ctx, name, method, chainingBehavior) {
  let chainableBehavior = ctx.__methods[name];
  let _chainingBehavior = chainableBehavior.chainingBehavior;
  chainableBehavior.chainingBehavior = /* @__PURE__ */ __name(function overwritingChainableMethodGetter() {
    let result = chainingBehavior(_chainingBehavior).call(this);
    if (result !== void 0) {
      return result;
    }
    let newAssertion = new Assertion();
    transferFlags(this, newAssertion);
    return newAssertion;
  }, "overwritingChainableMethodGetter");
  let _method = chainableBehavior.method;
  chainableBehavior.method = /* @__PURE__ */ __name(function overwritingChainableMethodWrapper() {
    let result = method(_method).apply(this, arguments);
    if (result !== void 0) {
      return result;
    }
    let newAssertion = new Assertion();
    transferFlags(this, newAssertion);
    return newAssertion;
  }, "overwritingChainableMethodWrapper");
}
__name(overwriteChainableMethod, "overwriteChainableMethod");
function compareByInspect(a2, b3) {
  return inspect22(a2) < inspect22(b3) ? -1 : 1;
}
__name(compareByInspect, "compareByInspect");
function getOwnEnumerablePropertySymbols(obj) {
  if (typeof Object.getOwnPropertySymbols !== "function") return [];
  return Object.getOwnPropertySymbols(obj).filter(function(sym) {
    return Object.getOwnPropertyDescriptor(obj, sym).enumerable;
  });
}
__name(getOwnEnumerablePropertySymbols, "getOwnEnumerablePropertySymbols");
function getOwnEnumerableProperties(obj) {
  return Object.keys(obj).concat(getOwnEnumerablePropertySymbols(obj));
}
__name(getOwnEnumerableProperties, "getOwnEnumerableProperties");
var isNaN22 = Number.isNaN;
function isObjectType(obj) {
  let objectType = type(obj);
  let objectTypes = ["Array", "Object", "Function"];
  return objectTypes.indexOf(objectType) !== -1;
}
__name(isObjectType, "isObjectType");
function getOperator(obj, args) {
  let operator = flag(obj, "operator");
  let negate = flag(obj, "negate");
  let expected = args[3];
  let msg = negate ? args[2] : args[1];
  if (operator) {
    return operator;
  }
  if (typeof msg === "function") msg = msg();
  msg = msg || "";
  if (!msg) {
    return void 0;
  }
  if (/\shave\s/.test(msg)) {
    return void 0;
  }
  let isObject2 = isObjectType(expected);
  if (/\snot\s/.test(msg)) {
    return isObject2 ? "notDeepStrictEqual" : "notStrictEqual";
  }
  return isObject2 ? "deepStrictEqual" : "strictEqual";
}
__name(getOperator, "getOperator");
function getName(fn2) {
  return fn2.name;
}
__name(getName, "getName");
function isRegExp2(obj) {
  return Object.prototype.toString.call(obj) === "[object RegExp]";
}
__name(isRegExp2, "isRegExp");
function isNumeric(obj) {
  return ["Number", "BigInt"].includes(type(obj));
}
__name(isNumeric, "isNumeric");
var { flag: flag2 } = utils_exports;
[
  "to",
  "be",
  "been",
  "is",
  "and",
  "has",
  "have",
  "with",
  "that",
  "which",
  "at",
  "of",
  "same",
  "but",
  "does",
  "still",
  "also"
].forEach(function(chain) {
  Assertion.addProperty(chain);
});
Assertion.addProperty("not", function() {
  flag2(this, "negate", true);
});
Assertion.addProperty("deep", function() {
  flag2(this, "deep", true);
});
Assertion.addProperty("nested", function() {
  flag2(this, "nested", true);
});
Assertion.addProperty("own", function() {
  flag2(this, "own", true);
});
Assertion.addProperty("ordered", function() {
  flag2(this, "ordered", true);
});
Assertion.addProperty("any", function() {
  flag2(this, "any", true);
  flag2(this, "all", false);
});
Assertion.addProperty("all", function() {
  flag2(this, "all", true);
  flag2(this, "any", false);
});
var functionTypes = {
  function: [
    "function",
    "asyncfunction",
    "generatorfunction",
    "asyncgeneratorfunction"
  ],
  asyncfunction: ["asyncfunction", "asyncgeneratorfunction"],
  generatorfunction: ["generatorfunction", "asyncgeneratorfunction"],
  asyncgeneratorfunction: ["asyncgeneratorfunction"]
};
function an(type3, msg) {
  if (msg) flag2(this, "message", msg);
  type3 = type3.toLowerCase();
  let obj = flag2(this, "object"), article = ~["a", "e", "i", "o", "u"].indexOf(type3.charAt(0)) ? "an " : "a ";
  const detectedType = type(obj).toLowerCase();
  if (functionTypes["function"].includes(type3)) {
    this.assert(
      functionTypes[type3].includes(detectedType),
      "expected #{this} to be " + article + type3,
      "expected #{this} not to be " + article + type3
    );
  } else {
    this.assert(
      type3 === detectedType,
      "expected #{this} to be " + article + type3,
      "expected #{this} not to be " + article + type3
    );
  }
}
__name(an, "an");
Assertion.addChainableMethod("an", an);
Assertion.addChainableMethod("a", an);
function SameValueZero(a2, b3) {
  return isNaN22(a2) && isNaN22(b3) || a2 === b3;
}
__name(SameValueZero, "SameValueZero");
function includeChainingBehavior() {
  flag2(this, "contains", true);
}
__name(includeChainingBehavior, "includeChainingBehavior");
function include(val, msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object"), objType = type(obj).toLowerCase(), flagMsg = flag2(this, "message"), negate = flag2(this, "negate"), ssfi = flag2(this, "ssfi"), isDeep = flag2(this, "deep"), descriptor = isDeep ? "deep " : "", isEql = isDeep ? flag2(this, "eql") : SameValueZero;
  flagMsg = flagMsg ? flagMsg + ": " : "";
  let included = false;
  switch (objType) {
    case "string":
      included = obj.indexOf(val) !== -1;
      break;
    case "weakset":
      if (isDeep) {
        throw new AssertionError(
          flagMsg + "unable to use .deep.include with WeakSet",
          void 0,
          ssfi
        );
      }
      included = obj.has(val);
      break;
    case "map":
      obj.forEach(function(item) {
        included = included || isEql(item, val);
      });
      break;
    case "set":
      if (isDeep) {
        obj.forEach(function(item) {
          included = included || isEql(item, val);
        });
      } else {
        included = obj.has(val);
      }
      break;
    case "array":
      if (isDeep) {
        included = obj.some(function(item) {
          return isEql(item, val);
        });
      } else {
        included = obj.indexOf(val) !== -1;
      }
      break;
    default: {
      if (val !== Object(val)) {
        throw new AssertionError(
          flagMsg + "the given combination of arguments (" + objType + " and " + type(val).toLowerCase() + ") is invalid for this assertion. You can use an array, a map, an object, a set, a string, or a weakset instead of a " + type(val).toLowerCase(),
          void 0,
          ssfi
        );
      }
      let props = Object.keys(val);
      let firstErr = null;
      let numErrs = 0;
      props.forEach(function(prop) {
        let propAssertion = new Assertion(obj);
        transferFlags(this, propAssertion, true);
        flag2(propAssertion, "lockSsfi", true);
        if (!negate || props.length === 1) {
          propAssertion.property(prop, val[prop]);
          return;
        }
        try {
          propAssertion.property(prop, val[prop]);
        } catch (err) {
          if (!check_error_exports.compatibleConstructor(err, AssertionError)) {
            throw err;
          }
          if (firstErr === null) firstErr = err;
          numErrs++;
        }
      }, this);
      if (negate && props.length > 1 && numErrs === props.length) {
        throw firstErr;
      }
      return;
    }
  }
  this.assert(
    included,
    "expected #{this} to " + descriptor + "include " + inspect22(val),
    "expected #{this} to not " + descriptor + "include " + inspect22(val)
  );
}
__name(include, "include");
Assertion.addChainableMethod("include", include, includeChainingBehavior);
Assertion.addChainableMethod("contain", include, includeChainingBehavior);
Assertion.addChainableMethod("contains", include, includeChainingBehavior);
Assertion.addChainableMethod("includes", include, includeChainingBehavior);
Assertion.addProperty("ok", function() {
  this.assert(
    flag2(this, "object"),
    "expected #{this} to be truthy",
    "expected #{this} to be falsy"
  );
});
Assertion.addProperty("true", function() {
  this.assert(
    true === flag2(this, "object"),
    "expected #{this} to be true",
    "expected #{this} to be false",
    flag2(this, "negate") ? false : true
  );
});
Assertion.addProperty("numeric", function() {
  const object2 = flag2(this, "object");
  this.assert(
    ["Number", "BigInt"].includes(type(object2)),
    "expected #{this} to be numeric",
    "expected #{this} to not be numeric",
    flag2(this, "negate") ? false : true
  );
});
Assertion.addProperty("callable", function() {
  const val = flag2(this, "object");
  const ssfi = flag2(this, "ssfi");
  const message = flag2(this, "message");
  const msg = message ? `${message}: ` : "";
  const negate = flag2(this, "negate");
  const assertionMessage = negate ? `${msg}expected ${inspect22(val)} not to be a callable function` : `${msg}expected ${inspect22(val)} to be a callable function`;
  const isCallable = [
    "Function",
    "AsyncFunction",
    "GeneratorFunction",
    "AsyncGeneratorFunction"
  ].includes(type(val));
  if (isCallable && negate || !isCallable && !negate) {
    throw new AssertionError(assertionMessage, void 0, ssfi);
  }
});
Assertion.addProperty("false", function() {
  this.assert(
    false === flag2(this, "object"),
    "expected #{this} to be false",
    "expected #{this} to be true",
    flag2(this, "negate") ? true : false
  );
});
Assertion.addProperty("null", function() {
  this.assert(
    null === flag2(this, "object"),
    "expected #{this} to be null",
    "expected #{this} not to be null"
  );
});
Assertion.addProperty("undefined", function() {
  this.assert(
    void 0 === flag2(this, "object"),
    "expected #{this} to be undefined",
    "expected #{this} not to be undefined"
  );
});
Assertion.addProperty("NaN", function() {
  this.assert(
    isNaN22(flag2(this, "object")),
    "expected #{this} to be NaN",
    "expected #{this} not to be NaN"
  );
});
function assertExist() {
  let val = flag2(this, "object");
  this.assert(
    val !== null && val !== void 0,
    "expected #{this} to exist",
    "expected #{this} to not exist"
  );
}
__name(assertExist, "assertExist");
Assertion.addProperty("exist", assertExist);
Assertion.addProperty("exists", assertExist);
Assertion.addProperty("empty", function() {
  let val = flag2(this, "object"), ssfi = flag2(this, "ssfi"), flagMsg = flag2(this, "message"), itemsCount;
  flagMsg = flagMsg ? flagMsg + ": " : "";
  switch (type(val).toLowerCase()) {
    case "array":
    case "string":
      itemsCount = val.length;
      break;
    case "map":
    case "set":
      itemsCount = val.size;
      break;
    case "weakmap":
    case "weakset":
      throw new AssertionError(
        flagMsg + ".empty was passed a weak collection",
        void 0,
        ssfi
      );
    case "function": {
      const msg = flagMsg + ".empty was passed a function " + getName(val);
      throw new AssertionError(msg.trim(), void 0, ssfi);
    }
    default:
      if (val !== Object(val)) {
        throw new AssertionError(
          flagMsg + ".empty was passed non-string primitive " + inspect22(val),
          void 0,
          ssfi
        );
      }
      itemsCount = Object.keys(val).length;
  }
  this.assert(
    0 === itemsCount,
    "expected #{this} to be empty",
    "expected #{this} not to be empty"
  );
});
function checkArguments() {
  let obj = flag2(this, "object"), type3 = type(obj);
  this.assert(
    "Arguments" === type3,
    "expected #{this} to be arguments but got " + type3,
    "expected #{this} to not be arguments"
  );
}
__name(checkArguments, "checkArguments");
Assertion.addProperty("arguments", checkArguments);
Assertion.addProperty("Arguments", checkArguments);
function assertEqual(val, msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object");
  if (flag2(this, "deep")) {
    let prevLockSsfi = flag2(this, "lockSsfi");
    flag2(this, "lockSsfi", true);
    this.eql(val);
    flag2(this, "lockSsfi", prevLockSsfi);
  } else {
    this.assert(
      val === obj,
      "expected #{this} to equal #{exp}",
      "expected #{this} to not equal #{exp}",
      val,
      this._obj,
      true
    );
  }
}
__name(assertEqual, "assertEqual");
Assertion.addMethod("equal", assertEqual);
Assertion.addMethod("equals", assertEqual);
Assertion.addMethod("eq", assertEqual);
function assertEql(obj, msg) {
  if (msg) flag2(this, "message", msg);
  let eql = flag2(this, "eql");
  this.assert(
    eql(obj, flag2(this, "object")),
    "expected #{this} to deeply equal #{exp}",
    "expected #{this} to not deeply equal #{exp}",
    obj,
    this._obj,
    true
  );
}
__name(assertEql, "assertEql");
Assertion.addMethod("eql", assertEql);
Assertion.addMethod("eqls", assertEql);
function assertAbove(n2, msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object"), doLength = flag2(this, "doLength"), flagMsg = flag2(this, "message"), msgPrefix = flagMsg ? flagMsg + ": " : "", ssfi = flag2(this, "ssfi"), objType = type(obj).toLowerCase(), nType = type(n2).toLowerCase();
  if (doLength && objType !== "map" && objType !== "set") {
    new Assertion(obj, flagMsg, ssfi, true).to.have.property("length");
  }
  if (!doLength && objType === "date" && nType !== "date") {
    throw new AssertionError(
      msgPrefix + "the argument to above must be a date",
      void 0,
      ssfi
    );
  } else if (!isNumeric(n2) && (doLength || isNumeric(obj))) {
    throw new AssertionError(
      msgPrefix + "the argument to above must be a number",
      void 0,
      ssfi
    );
  } else if (!doLength && objType !== "date" && !isNumeric(obj)) {
    let printObj = objType === "string" ? "'" + obj + "'" : obj;
    throw new AssertionError(
      msgPrefix + "expected " + printObj + " to be a number or a date",
      void 0,
      ssfi
    );
  }
  if (doLength) {
    let descriptor = "length", itemsCount;
    if (objType === "map" || objType === "set") {
      descriptor = "size";
      itemsCount = obj.size;
    } else {
      itemsCount = obj.length;
    }
    this.assert(
      itemsCount > n2,
      "expected #{this} to have a " + descriptor + " above #{exp} but got #{act}",
      "expected #{this} to not have a " + descriptor + " above #{exp}",
      n2,
      itemsCount
    );
  } else {
    this.assert(
      obj > n2,
      "expected #{this} to be above #{exp}",
      "expected #{this} to be at most #{exp}",
      n2
    );
  }
}
__name(assertAbove, "assertAbove");
Assertion.addMethod("above", assertAbove);
Assertion.addMethod("gt", assertAbove);
Assertion.addMethod("greaterThan", assertAbove);
function assertLeast(n2, msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object"), doLength = flag2(this, "doLength"), flagMsg = flag2(this, "message"), msgPrefix = flagMsg ? flagMsg + ": " : "", ssfi = flag2(this, "ssfi"), objType = type(obj).toLowerCase(), nType = type(n2).toLowerCase(), errorMessage, shouldThrow = true;
  if (doLength && objType !== "map" && objType !== "set") {
    new Assertion(obj, flagMsg, ssfi, true).to.have.property("length");
  }
  if (!doLength && objType === "date" && nType !== "date") {
    errorMessage = msgPrefix + "the argument to least must be a date";
  } else if (!isNumeric(n2) && (doLength || isNumeric(obj))) {
    errorMessage = msgPrefix + "the argument to least must be a number";
  } else if (!doLength && objType !== "date" && !isNumeric(obj)) {
    let printObj = objType === "string" ? "'" + obj + "'" : obj;
    errorMessage = msgPrefix + "expected " + printObj + " to be a number or a date";
  } else {
    shouldThrow = false;
  }
  if (shouldThrow) {
    throw new AssertionError(errorMessage, void 0, ssfi);
  }
  if (doLength) {
    let descriptor = "length", itemsCount;
    if (objType === "map" || objType === "set") {
      descriptor = "size";
      itemsCount = obj.size;
    } else {
      itemsCount = obj.length;
    }
    this.assert(
      itemsCount >= n2,
      "expected #{this} to have a " + descriptor + " at least #{exp} but got #{act}",
      "expected #{this} to have a " + descriptor + " below #{exp}",
      n2,
      itemsCount
    );
  } else {
    this.assert(
      obj >= n2,
      "expected #{this} to be at least #{exp}",
      "expected #{this} to be below #{exp}",
      n2
    );
  }
}
__name(assertLeast, "assertLeast");
Assertion.addMethod("least", assertLeast);
Assertion.addMethod("gte", assertLeast);
Assertion.addMethod("greaterThanOrEqual", assertLeast);
function assertBelow(n2, msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object"), doLength = flag2(this, "doLength"), flagMsg = flag2(this, "message"), msgPrefix = flagMsg ? flagMsg + ": " : "", ssfi = flag2(this, "ssfi"), objType = type(obj).toLowerCase(), nType = type(n2).toLowerCase(), errorMessage, shouldThrow = true;
  if (doLength && objType !== "map" && objType !== "set") {
    new Assertion(obj, flagMsg, ssfi, true).to.have.property("length");
  }
  if (!doLength && objType === "date" && nType !== "date") {
    errorMessage = msgPrefix + "the argument to below must be a date";
  } else if (!isNumeric(n2) && (doLength || isNumeric(obj))) {
    errorMessage = msgPrefix + "the argument to below must be a number";
  } else if (!doLength && objType !== "date" && !isNumeric(obj)) {
    let printObj = objType === "string" ? "'" + obj + "'" : obj;
    errorMessage = msgPrefix + "expected " + printObj + " to be a number or a date";
  } else {
    shouldThrow = false;
  }
  if (shouldThrow) {
    throw new AssertionError(errorMessage, void 0, ssfi);
  }
  if (doLength) {
    let descriptor = "length", itemsCount;
    if (objType === "map" || objType === "set") {
      descriptor = "size";
      itemsCount = obj.size;
    } else {
      itemsCount = obj.length;
    }
    this.assert(
      itemsCount < n2,
      "expected #{this} to have a " + descriptor + " below #{exp} but got #{act}",
      "expected #{this} to not have a " + descriptor + " below #{exp}",
      n2,
      itemsCount
    );
  } else {
    this.assert(
      obj < n2,
      "expected #{this} to be below #{exp}",
      "expected #{this} to be at least #{exp}",
      n2
    );
  }
}
__name(assertBelow, "assertBelow");
Assertion.addMethod("below", assertBelow);
Assertion.addMethod("lt", assertBelow);
Assertion.addMethod("lessThan", assertBelow);
function assertMost(n2, msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object"), doLength = flag2(this, "doLength"), flagMsg = flag2(this, "message"), msgPrefix = flagMsg ? flagMsg + ": " : "", ssfi = flag2(this, "ssfi"), objType = type(obj).toLowerCase(), nType = type(n2).toLowerCase(), errorMessage, shouldThrow = true;
  if (doLength && objType !== "map" && objType !== "set") {
    new Assertion(obj, flagMsg, ssfi, true).to.have.property("length");
  }
  if (!doLength && objType === "date" && nType !== "date") {
    errorMessage = msgPrefix + "the argument to most must be a date";
  } else if (!isNumeric(n2) && (doLength || isNumeric(obj))) {
    errorMessage = msgPrefix + "the argument to most must be a number";
  } else if (!doLength && objType !== "date" && !isNumeric(obj)) {
    let printObj = objType === "string" ? "'" + obj + "'" : obj;
    errorMessage = msgPrefix + "expected " + printObj + " to be a number or a date";
  } else {
    shouldThrow = false;
  }
  if (shouldThrow) {
    throw new AssertionError(errorMessage, void 0, ssfi);
  }
  if (doLength) {
    let descriptor = "length", itemsCount;
    if (objType === "map" || objType === "set") {
      descriptor = "size";
      itemsCount = obj.size;
    } else {
      itemsCount = obj.length;
    }
    this.assert(
      itemsCount <= n2,
      "expected #{this} to have a " + descriptor + " at most #{exp} but got #{act}",
      "expected #{this} to have a " + descriptor + " above #{exp}",
      n2,
      itemsCount
    );
  } else {
    this.assert(
      obj <= n2,
      "expected #{this} to be at most #{exp}",
      "expected #{this} to be above #{exp}",
      n2
    );
  }
}
__name(assertMost, "assertMost");
Assertion.addMethod("most", assertMost);
Assertion.addMethod("lte", assertMost);
Assertion.addMethod("lessThanOrEqual", assertMost);
Assertion.addMethod("within", function(start, finish, msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object"), doLength = flag2(this, "doLength"), flagMsg = flag2(this, "message"), msgPrefix = flagMsg ? flagMsg + ": " : "", ssfi = flag2(this, "ssfi"), objType = type(obj).toLowerCase(), startType = type(start).toLowerCase(), finishType = type(finish).toLowerCase(), errorMessage, shouldThrow = true, range = startType === "date" && finishType === "date" ? start.toISOString() + ".." + finish.toISOString() : start + ".." + finish;
  if (doLength && objType !== "map" && objType !== "set") {
    new Assertion(obj, flagMsg, ssfi, true).to.have.property("length");
  }
  if (!doLength && objType === "date" && (startType !== "date" || finishType !== "date")) {
    errorMessage = msgPrefix + "the arguments to within must be dates";
  } else if ((!isNumeric(start) || !isNumeric(finish)) && (doLength || isNumeric(obj))) {
    errorMessage = msgPrefix + "the arguments to within must be numbers";
  } else if (!doLength && objType !== "date" && !isNumeric(obj)) {
    let printObj = objType === "string" ? "'" + obj + "'" : obj;
    errorMessage = msgPrefix + "expected " + printObj + " to be a number or a date";
  } else {
    shouldThrow = false;
  }
  if (shouldThrow) {
    throw new AssertionError(errorMessage, void 0, ssfi);
  }
  if (doLength) {
    let descriptor = "length", itemsCount;
    if (objType === "map" || objType === "set") {
      descriptor = "size";
      itemsCount = obj.size;
    } else {
      itemsCount = obj.length;
    }
    this.assert(
      itemsCount >= start && itemsCount <= finish,
      "expected #{this} to have a " + descriptor + " within " + range,
      "expected #{this} to not have a " + descriptor + " within " + range
    );
  } else {
    this.assert(
      obj >= start && obj <= finish,
      "expected #{this} to be within " + range,
      "expected #{this} to not be within " + range
    );
  }
});
function assertInstanceOf(constructor, msg) {
  if (msg) flag2(this, "message", msg);
  let target = flag2(this, "object");
  let ssfi = flag2(this, "ssfi");
  let flagMsg = flag2(this, "message");
  let isInstanceOf;
  try {
    isInstanceOf = target instanceof constructor;
  } catch (err) {
    if (err instanceof TypeError) {
      flagMsg = flagMsg ? flagMsg + ": " : "";
      throw new AssertionError(
        flagMsg + "The instanceof assertion needs a constructor but " + type(constructor) + " was given.",
        void 0,
        ssfi
      );
    }
    throw err;
  }
  let name = getName(constructor);
  if (name == null) {
    name = "an unnamed constructor";
  }
  this.assert(
    isInstanceOf,
    "expected #{this} to be an instance of " + name,
    "expected #{this} to not be an instance of " + name
  );
}
__name(assertInstanceOf, "assertInstanceOf");
Assertion.addMethod("instanceof", assertInstanceOf);
Assertion.addMethod("instanceOf", assertInstanceOf);
function assertProperty(name, val, msg) {
  if (msg) flag2(this, "message", msg);
  let isNested = flag2(this, "nested"), isOwn = flag2(this, "own"), flagMsg = flag2(this, "message"), obj = flag2(this, "object"), ssfi = flag2(this, "ssfi"), nameType = typeof name;
  flagMsg = flagMsg ? flagMsg + ": " : "";
  if (isNested) {
    if (nameType !== "string") {
      throw new AssertionError(
        flagMsg + "the argument to property must be a string when using nested syntax",
        void 0,
        ssfi
      );
    }
  } else {
    if (nameType !== "string" && nameType !== "number" && nameType !== "symbol") {
      throw new AssertionError(
        flagMsg + "the argument to property must be a string, number, or symbol",
        void 0,
        ssfi
      );
    }
  }
  if (isNested && isOwn) {
    throw new AssertionError(
      flagMsg + 'The "nested" and "own" flags cannot be combined.',
      void 0,
      ssfi
    );
  }
  if (obj === null || obj === void 0) {
    throw new AssertionError(
      flagMsg + "Target cannot be null or undefined.",
      void 0,
      ssfi
    );
  }
  let isDeep = flag2(this, "deep"), negate = flag2(this, "negate"), pathInfo = isNested ? getPathInfo(obj, name) : null, value = isNested ? pathInfo.value : obj[name], isEql = isDeep ? flag2(this, "eql") : (val1, val2) => val1 === val2;
  let descriptor = "";
  if (isDeep) descriptor += "deep ";
  if (isOwn) descriptor += "own ";
  if (isNested) descriptor += "nested ";
  descriptor += "property ";
  let hasProperty2;
  if (isOwn) hasProperty2 = Object.prototype.hasOwnProperty.call(obj, name);
  else if (isNested) hasProperty2 = pathInfo.exists;
  else hasProperty2 = hasProperty(obj, name);
  if (!negate || arguments.length === 1) {
    this.assert(
      hasProperty2,
      "expected #{this} to have " + descriptor + inspect22(name),
      "expected #{this} to not have " + descriptor + inspect22(name)
    );
  }
  if (arguments.length > 1) {
    this.assert(
      hasProperty2 && isEql(val, value),
      "expected #{this} to have " + descriptor + inspect22(name) + " of #{exp}, but got #{act}",
      "expected #{this} to not have " + descriptor + inspect22(name) + " of #{act}",
      val,
      value
    );
  }
  flag2(this, "object", value);
}
__name(assertProperty, "assertProperty");
Assertion.addMethod("property", assertProperty);
function assertOwnProperty(_name, _value, _msg) {
  flag2(this, "own", true);
  assertProperty.apply(this, arguments);
}
__name(assertOwnProperty, "assertOwnProperty");
Assertion.addMethod("ownProperty", assertOwnProperty);
Assertion.addMethod("haveOwnProperty", assertOwnProperty);
function assertOwnPropertyDescriptor(name, descriptor, msg) {
  if (typeof descriptor === "string") {
    msg = descriptor;
    descriptor = null;
  }
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object");
  let actualDescriptor = Object.getOwnPropertyDescriptor(Object(obj), name);
  let eql = flag2(this, "eql");
  if (actualDescriptor && descriptor) {
    this.assert(
      eql(descriptor, actualDescriptor),
      "expected the own property descriptor for " + inspect22(name) + " on #{this} to match " + inspect22(descriptor) + ", got " + inspect22(actualDescriptor),
      "expected the own property descriptor for " + inspect22(name) + " on #{this} to not match " + inspect22(descriptor),
      descriptor,
      actualDescriptor,
      true
    );
  } else {
    this.assert(
      actualDescriptor,
      "expected #{this} to have an own property descriptor for " + inspect22(name),
      "expected #{this} to not have an own property descriptor for " + inspect22(name)
    );
  }
  flag2(this, "object", actualDescriptor);
}
__name(assertOwnPropertyDescriptor, "assertOwnPropertyDescriptor");
Assertion.addMethod("ownPropertyDescriptor", assertOwnPropertyDescriptor);
Assertion.addMethod("haveOwnPropertyDescriptor", assertOwnPropertyDescriptor);
function assertLengthChain() {
  flag2(this, "doLength", true);
}
__name(assertLengthChain, "assertLengthChain");
function assertLength(n2, msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object"), objType = type(obj).toLowerCase(), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi"), descriptor = "length", itemsCount;
  switch (objType) {
    case "map":
    case "set":
      descriptor = "size";
      itemsCount = obj.size;
      break;
    default:
      new Assertion(obj, flagMsg, ssfi, true).to.have.property("length");
      itemsCount = obj.length;
  }
  this.assert(
    itemsCount == n2,
    "expected #{this} to have a " + descriptor + " of #{exp} but got #{act}",
    "expected #{this} to not have a " + descriptor + " of #{act}",
    n2,
    itemsCount
  );
}
__name(assertLength, "assertLength");
Assertion.addChainableMethod("length", assertLength, assertLengthChain);
Assertion.addChainableMethod("lengthOf", assertLength, assertLengthChain);
function assertMatch(re, msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object");
  this.assert(
    re.exec(obj),
    "expected #{this} to match " + re,
    "expected #{this} not to match " + re
  );
}
__name(assertMatch, "assertMatch");
Assertion.addMethod("match", assertMatch);
Assertion.addMethod("matches", assertMatch);
Assertion.addMethod("string", function(str, msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object"), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi");
  new Assertion(obj, flagMsg, ssfi, true).is.a("string");
  this.assert(
    ~obj.indexOf(str),
    "expected #{this} to contain " + inspect22(str),
    "expected #{this} to not contain " + inspect22(str)
  );
});
function assertKeys(keys2) {
  let obj = flag2(this, "object"), objType = type(obj), keysType = type(keys2), ssfi = flag2(this, "ssfi"), isDeep = flag2(this, "deep"), str, deepStr = "", actual, ok = true, flagMsg = flag2(this, "message");
  flagMsg = flagMsg ? flagMsg + ": " : "";
  let mixedArgsMsg = flagMsg + "when testing keys against an object or an array you must give a single Array|Object|String argument or multiple String arguments";
  if (objType === "Map" || objType === "Set") {
    deepStr = isDeep ? "deeply " : "";
    actual = [];
    obj.forEach(function(val, key) {
      actual.push(key);
    });
    if (keysType !== "Array") {
      keys2 = Array.prototype.slice.call(arguments);
    }
  } else {
    actual = getOwnEnumerableProperties(obj);
    switch (keysType) {
      case "Array":
        if (arguments.length > 1) {
          throw new AssertionError(mixedArgsMsg, void 0, ssfi);
        }
        break;
      case "Object":
        if (arguments.length > 1) {
          throw new AssertionError(mixedArgsMsg, void 0, ssfi);
        }
        keys2 = Object.keys(keys2);
        break;
      default:
        keys2 = Array.prototype.slice.call(arguments);
    }
    keys2 = keys2.map(function(val) {
      return typeof val === "symbol" ? val : String(val);
    });
  }
  if (!keys2.length) {
    throw new AssertionError(flagMsg + "keys required", void 0, ssfi);
  }
  let len = keys2.length, any = flag2(this, "any"), all = flag2(this, "all"), expected = keys2, isEql = isDeep ? flag2(this, "eql") : (val1, val2) => val1 === val2;
  if (!any && !all) {
    all = true;
  }
  if (any) {
    ok = expected.some(function(expectedKey) {
      return actual.some(function(actualKey) {
        return isEql(expectedKey, actualKey);
      });
    });
  }
  if (all) {
    ok = expected.every(function(expectedKey) {
      return actual.some(function(actualKey) {
        return isEql(expectedKey, actualKey);
      });
    });
    if (!flag2(this, "contains")) {
      ok = ok && keys2.length == actual.length;
    }
  }
  if (len > 1) {
    keys2 = keys2.map(function(key) {
      return inspect22(key);
    });
    let last = keys2.pop();
    if (all) {
      str = keys2.join(", ") + ", and " + last;
    }
    if (any) {
      str = keys2.join(", ") + ", or " + last;
    }
  } else {
    str = inspect22(keys2[0]);
  }
  str = (len > 1 ? "keys " : "key ") + str;
  str = (flag2(this, "contains") ? "contain " : "have ") + str;
  this.assert(
    ok,
    "expected #{this} to " + deepStr + str,
    "expected #{this} to not " + deepStr + str,
    expected.slice(0).sort(compareByInspect),
    actual.sort(compareByInspect),
    true
  );
}
__name(assertKeys, "assertKeys");
Assertion.addMethod("keys", assertKeys);
Assertion.addMethod("key", assertKeys);
function assertThrows(errorLike, errMsgMatcher, msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object"), ssfi = flag2(this, "ssfi"), flagMsg = flag2(this, "message"), negate = flag2(this, "negate") || false;
  new Assertion(obj, flagMsg, ssfi, true).is.a("function");
  if (isRegExp2(errorLike) || typeof errorLike === "string") {
    errMsgMatcher = errorLike;
    errorLike = null;
  }
  let caughtErr;
  let errorWasThrown = false;
  try {
    obj();
  } catch (err) {
    errorWasThrown = true;
    caughtErr = err;
  }
  let everyArgIsUndefined = errorLike === void 0 && errMsgMatcher === void 0;
  let everyArgIsDefined = Boolean(errorLike && errMsgMatcher);
  let errorLikeFail = false;
  let errMsgMatcherFail = false;
  if (everyArgIsUndefined || !everyArgIsUndefined && !negate) {
    let errorLikeString = "an error";
    if (errorLike instanceof Error) {
      errorLikeString = "#{exp}";
    } else if (errorLike) {
      errorLikeString = check_error_exports.getConstructorName(errorLike);
    }
    let actual = caughtErr;
    if (caughtErr instanceof Error) {
      actual = caughtErr.toString();
    } else if (typeof caughtErr === "string") {
      actual = caughtErr;
    } else if (caughtErr && (typeof caughtErr === "object" || typeof caughtErr === "function")) {
      try {
        actual = check_error_exports.getConstructorName(caughtErr);
      } catch (_err) {
      }
    }
    this.assert(
      errorWasThrown,
      "expected #{this} to throw " + errorLikeString,
      "expected #{this} to not throw an error but #{act} was thrown",
      errorLike && errorLike.toString(),
      actual
    );
  }
  if (errorLike && caughtErr) {
    if (errorLike instanceof Error) {
      let isCompatibleInstance = check_error_exports.compatibleInstance(
        caughtErr,
        errorLike
      );
      if (isCompatibleInstance === negate) {
        if (everyArgIsDefined && negate) {
          errorLikeFail = true;
        } else {
          this.assert(
            negate,
            "expected #{this} to throw #{exp} but #{act} was thrown",
            "expected #{this} to not throw #{exp}" + (caughtErr && !negate ? " but #{act} was thrown" : ""),
            errorLike.toString(),
            caughtErr.toString()
          );
        }
      }
    }
    let isCompatibleConstructor = check_error_exports.compatibleConstructor(
      caughtErr,
      errorLike
    );
    if (isCompatibleConstructor === negate) {
      if (everyArgIsDefined && negate) {
        errorLikeFail = true;
      } else {
        this.assert(
          negate,
          "expected #{this} to throw #{exp} but #{act} was thrown",
          "expected #{this} to not throw #{exp}" + (caughtErr ? " but #{act} was thrown" : ""),
          errorLike instanceof Error ? errorLike.toString() : errorLike && check_error_exports.getConstructorName(errorLike),
          caughtErr instanceof Error ? caughtErr.toString() : caughtErr && check_error_exports.getConstructorName(caughtErr)
        );
      }
    }
  }
  if (caughtErr && errMsgMatcher !== void 0 && errMsgMatcher !== null) {
    let placeholder = "including";
    if (isRegExp2(errMsgMatcher)) {
      placeholder = "matching";
    }
    let isCompatibleMessage = check_error_exports.compatibleMessage(
      caughtErr,
      errMsgMatcher
    );
    if (isCompatibleMessage === negate) {
      if (everyArgIsDefined && negate) {
        errMsgMatcherFail = true;
      } else {
        this.assert(
          negate,
          "expected #{this} to throw error " + placeholder + " #{exp} but got #{act}",
          "expected #{this} to throw error not " + placeholder + " #{exp}",
          errMsgMatcher,
          check_error_exports.getMessage(caughtErr)
        );
      }
    }
  }
  if (errorLikeFail && errMsgMatcherFail) {
    this.assert(
      negate,
      "expected #{this} to throw #{exp} but #{act} was thrown",
      "expected #{this} to not throw #{exp}" + (caughtErr ? " but #{act} was thrown" : ""),
      errorLike instanceof Error ? errorLike.toString() : errorLike && check_error_exports.getConstructorName(errorLike),
      caughtErr instanceof Error ? caughtErr.toString() : caughtErr && check_error_exports.getConstructorName(caughtErr)
    );
  }
  flag2(this, "object", caughtErr);
}
__name(assertThrows, "assertThrows");
Assertion.addMethod("throw", assertThrows);
Assertion.addMethod("throws", assertThrows);
Assertion.addMethod("Throw", assertThrows);
function respondTo(method, msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object"), itself = flag2(this, "itself"), context = "function" === typeof obj && !itself ? obj.prototype[method] : obj[method];
  this.assert(
    "function" === typeof context,
    "expected #{this} to respond to " + inspect22(method),
    "expected #{this} to not respond to " + inspect22(method)
  );
}
__name(respondTo, "respondTo");
Assertion.addMethod("respondTo", respondTo);
Assertion.addMethod("respondsTo", respondTo);
Assertion.addProperty("itself", function() {
  flag2(this, "itself", true);
});
function satisfy(matcher, msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object");
  let result = matcher(obj);
  this.assert(
    result,
    "expected #{this} to satisfy " + objDisplay2(matcher),
    "expected #{this} to not satisfy" + objDisplay2(matcher),
    flag2(this, "negate") ? false : true,
    result
  );
}
__name(satisfy, "satisfy");
Assertion.addMethod("satisfy", satisfy);
Assertion.addMethod("satisfies", satisfy);
function closeTo(expected, delta, msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object"), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi");
  new Assertion(obj, flagMsg, ssfi, true).is.numeric;
  let message = "A `delta` value is required for `closeTo`";
  if (delta == void 0) {
    throw new AssertionError(
      flagMsg ? `${flagMsg}: ${message}` : message,
      void 0,
      ssfi
    );
  }
  new Assertion(delta, flagMsg, ssfi, true).is.numeric;
  message = "A `expected` value is required for `closeTo`";
  if (expected == void 0) {
    throw new AssertionError(
      flagMsg ? `${flagMsg}: ${message}` : message,
      void 0,
      ssfi
    );
  }
  new Assertion(expected, flagMsg, ssfi, true).is.numeric;
  const abs = /* @__PURE__ */ __name((x2) => x2 < 0 ? -x2 : x2, "abs");
  const strip = /* @__PURE__ */ __name((number) => parseFloat(parseFloat(number).toPrecision(12)), "strip");
  this.assert(
    strip(abs(obj - expected)) <= delta,
    "expected #{this} to be close to " + expected + " +/- " + delta,
    "expected #{this} not to be close to " + expected + " +/- " + delta
  );
}
__name(closeTo, "closeTo");
Assertion.addMethod("closeTo", closeTo);
Assertion.addMethod("approximately", closeTo);
function isSubsetOf(_subset, _superset, cmp, contains, ordered) {
  let superset = Array.from(_superset);
  let subset = Array.from(_subset);
  if (!contains) {
    if (subset.length !== superset.length) return false;
    superset = superset.slice();
  }
  return subset.every(function(elem, idx) {
    if (ordered) return cmp ? cmp(elem, superset[idx]) : elem === superset[idx];
    if (!cmp) {
      let matchIdx = superset.indexOf(elem);
      if (matchIdx === -1) return false;
      if (!contains) superset.splice(matchIdx, 1);
      return true;
    }
    return superset.some(function(elem2, matchIdx) {
      if (!cmp(elem, elem2)) return false;
      if (!contains) superset.splice(matchIdx, 1);
      return true;
    });
  });
}
__name(isSubsetOf, "isSubsetOf");
Assertion.addMethod("members", function(subset, msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object"), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi");
  new Assertion(obj, flagMsg, ssfi, true).to.be.iterable;
  new Assertion(subset, flagMsg, ssfi, true).to.be.iterable;
  let contains = flag2(this, "contains");
  let ordered = flag2(this, "ordered");
  let subject, failMsg, failNegateMsg;
  if (contains) {
    subject = ordered ? "an ordered superset" : "a superset";
    failMsg = "expected #{this} to be " + subject + " of #{exp}";
    failNegateMsg = "expected #{this} to not be " + subject + " of #{exp}";
  } else {
    subject = ordered ? "ordered members" : "members";
    failMsg = "expected #{this} to have the same " + subject + " as #{exp}";
    failNegateMsg = "expected #{this} to not have the same " + subject + " as #{exp}";
  }
  let cmp = flag2(this, "deep") ? flag2(this, "eql") : void 0;
  this.assert(
    isSubsetOf(subset, obj, cmp, contains, ordered),
    failMsg,
    failNegateMsg,
    subset,
    obj,
    true
  );
});
Assertion.addProperty("iterable", function(msg) {
  if (msg) flag2(this, "message", msg);
  let obj = flag2(this, "object");
  this.assert(
    obj != void 0 && obj[Symbol.iterator],
    "expected #{this} to be an iterable",
    "expected #{this} to not be an iterable",
    obj
  );
});
function oneOf(list, msg) {
  if (msg) flag2(this, "message", msg);
  let expected = flag2(this, "object"), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi"), contains = flag2(this, "contains"), isDeep = flag2(this, "deep"), eql = flag2(this, "eql");
  new Assertion(list, flagMsg, ssfi, true).to.be.an("array");
  if (contains) {
    this.assert(
      list.some(function(possibility) {
        return expected.indexOf(possibility) > -1;
      }),
      "expected #{this} to contain one of #{exp}",
      "expected #{this} to not contain one of #{exp}",
      list,
      expected
    );
  } else {
    if (isDeep) {
      this.assert(
        list.some(function(possibility) {
          return eql(expected, possibility);
        }),
        "expected #{this} to deeply equal one of #{exp}",
        "expected #{this} to deeply equal one of #{exp}",
        list,
        expected
      );
    } else {
      this.assert(
        list.indexOf(expected) > -1,
        "expected #{this} to be one of #{exp}",
        "expected #{this} to not be one of #{exp}",
        list,
        expected
      );
    }
  }
}
__name(oneOf, "oneOf");
Assertion.addMethod("oneOf", oneOf);
function assertChanges(subject, prop, msg) {
  if (msg) flag2(this, "message", msg);
  let fn2 = flag2(this, "object"), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi");
  new Assertion(fn2, flagMsg, ssfi, true).is.a("function");
  let initial;
  if (!prop) {
    new Assertion(subject, flagMsg, ssfi, true).is.a("function");
    initial = subject();
  } else {
    new Assertion(subject, flagMsg, ssfi, true).to.have.property(prop);
    initial = subject[prop];
  }
  fn2();
  let final = prop === void 0 || prop === null ? subject() : subject[prop];
  let msgObj = prop === void 0 || prop === null ? initial : "." + prop;
  flag2(this, "deltaMsgObj", msgObj);
  flag2(this, "initialDeltaValue", initial);
  flag2(this, "finalDeltaValue", final);
  flag2(this, "deltaBehavior", "change");
  flag2(this, "realDelta", final !== initial);
  this.assert(
    initial !== final,
    "expected " + msgObj + " to change",
    "expected " + msgObj + " to not change"
  );
}
__name(assertChanges, "assertChanges");
Assertion.addMethod("change", assertChanges);
Assertion.addMethod("changes", assertChanges);
function assertIncreases(subject, prop, msg) {
  if (msg) flag2(this, "message", msg);
  let fn2 = flag2(this, "object"), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi");
  new Assertion(fn2, flagMsg, ssfi, true).is.a("function");
  let initial;
  if (!prop) {
    new Assertion(subject, flagMsg, ssfi, true).is.a("function");
    initial = subject();
  } else {
    new Assertion(subject, flagMsg, ssfi, true).to.have.property(prop);
    initial = subject[prop];
  }
  new Assertion(initial, flagMsg, ssfi, true).is.a("number");
  fn2();
  let final = prop === void 0 || prop === null ? subject() : subject[prop];
  let msgObj = prop === void 0 || prop === null ? initial : "." + prop;
  flag2(this, "deltaMsgObj", msgObj);
  flag2(this, "initialDeltaValue", initial);
  flag2(this, "finalDeltaValue", final);
  flag2(this, "deltaBehavior", "increase");
  flag2(this, "realDelta", final - initial);
  this.assert(
    final - initial > 0,
    "expected " + msgObj + " to increase",
    "expected " + msgObj + " to not increase"
  );
}
__name(assertIncreases, "assertIncreases");
Assertion.addMethod("increase", assertIncreases);
Assertion.addMethod("increases", assertIncreases);
function assertDecreases(subject, prop, msg) {
  if (msg) flag2(this, "message", msg);
  let fn2 = flag2(this, "object"), flagMsg = flag2(this, "message"), ssfi = flag2(this, "ssfi");
  new Assertion(fn2, flagMsg, ssfi, true).is.a("function");
  let initial;
  if (!prop) {
    new Assertion(subject, flagMsg, ssfi, true).is.a("function");
    initial = subject();
  } else {
    new Assertion(subject, flagMsg, ssfi, true).to.have.property(prop);
    initial = subject[prop];
  }
  new Assertion(initial, flagMsg, ssfi, true).is.a("number");
  fn2();
  let final = prop === void 0 || prop === null ? subject() : subject[prop];
  let msgObj = prop === void 0 || prop === null ? initial : "." + prop;
  flag2(this, "deltaMsgObj", msgObj);
  flag2(this, "initialDeltaValue", initial);
  flag2(this, "finalDeltaValue", final);
  flag2(this, "deltaBehavior", "decrease");
  flag2(this, "realDelta", initial - final);
  this.assert(
    final - initial < 0,
    "expected " + msgObj + " to decrease",
    "expected " + msgObj + " to not decrease"
  );
}
__name(assertDecreases, "assertDecreases");
Assertion.addMethod("decrease", assertDecreases);
Assertion.addMethod("decreases", assertDecreases);
function assertDelta(delta, msg) {
  if (msg) flag2(this, "message", msg);
  let msgObj = flag2(this, "deltaMsgObj");
  let initial = flag2(this, "initialDeltaValue");
  let final = flag2(this, "finalDeltaValue");
  let behavior = flag2(this, "deltaBehavior");
  let realDelta = flag2(this, "realDelta");
  let expression;
  if (behavior === "change") {
    expression = Math.abs(final - initial) === Math.abs(delta);
  } else {
    expression = realDelta === Math.abs(delta);
  }
  this.assert(
    expression,
    "expected " + msgObj + " to " + behavior + " by " + delta,
    "expected " + msgObj + " to not " + behavior + " by " + delta
  );
}
__name(assertDelta, "assertDelta");
Assertion.addMethod("by", assertDelta);
Assertion.addProperty("extensible", function() {
  let obj = flag2(this, "object");
  let isExtensible = obj === Object(obj) && Object.isExtensible(obj);
  this.assert(
    isExtensible,
    "expected #{this} to be extensible",
    "expected #{this} to not be extensible"
  );
});
Assertion.addProperty("sealed", function() {
  let obj = flag2(this, "object");
  let isSealed = obj === Object(obj) ? Object.isSealed(obj) : true;
  this.assert(
    isSealed,
    "expected #{this} to be sealed",
    "expected #{this} to not be sealed"
  );
});
Assertion.addProperty("frozen", function() {
  let obj = flag2(this, "object");
  let isFrozen = obj === Object(obj) ? Object.isFrozen(obj) : true;
  this.assert(
    isFrozen,
    "expected #{this} to be frozen",
    "expected #{this} to not be frozen"
  );
});
Assertion.addProperty("finite", function(_msg) {
  let obj = flag2(this, "object");
  this.assert(
    typeof obj === "number" && isFinite(obj),
    "expected #{this} to be a finite number",
    "expected #{this} to not be a finite number"
  );
});
function compareSubset(expected, actual) {
  if (expected === actual) {
    return true;
  }
  if (typeof actual !== typeof expected) {
    return false;
  }
  if (typeof expected !== "object" || expected === null) {
    return expected === actual;
  }
  if (!actual) {
    return false;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      return false;
    }
    return expected.every(function(exp) {
      return actual.some(function(act) {
        return compareSubset(exp, act);
      });
    });
  }
  if (expected instanceof Date) {
    if (actual instanceof Date) {
      return expected.getTime() === actual.getTime();
    } else {
      return false;
    }
  }
  return Object.keys(expected).every(function(key) {
    let expectedValue = expected[key];
    let actualValue = actual[key];
    if (typeof expectedValue === "object" && expectedValue !== null && actualValue !== null) {
      return compareSubset(expectedValue, actualValue);
    }
    if (typeof expectedValue === "function") {
      return expectedValue(actualValue);
    }
    return actualValue === expectedValue;
  });
}
__name(compareSubset, "compareSubset");
Assertion.addMethod("containSubset", function(expected) {
  const actual = flag(this, "object");
  const showDiff = config.showDiff;
  this.assert(
    compareSubset(expected, actual),
    "expected #{act} to contain subset #{exp}",
    "expected #{act} to not contain subset #{exp}",
    expected,
    actual,
    showDiff
  );
});
function expect(val, message) {
  return new Assertion(val, message);
}
__name(expect, "expect");
expect.fail = function(actual, expected, message, operator) {
  if (arguments.length < 2) {
    message = actual;
    actual = void 0;
  }
  message = message || "expect.fail()";
  throw new AssertionError(
    message,
    {
      actual,
      expected,
      operator
    },
    expect.fail
  );
};
var should_exports = {};
__export2(should_exports, {
  Should: () => Should,
  should: () => should
});
function loadShould() {
  function shouldGetter() {
    if (this instanceof String || this instanceof Number || this instanceof Boolean || typeof Symbol === "function" && this instanceof Symbol || typeof BigInt === "function" && this instanceof BigInt) {
      return new Assertion(this.valueOf(), null, shouldGetter);
    }
    return new Assertion(this, null, shouldGetter);
  }
  __name(shouldGetter, "shouldGetter");
  function shouldSetter(value) {
    Object.defineProperty(this, "should", {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  __name(shouldSetter, "shouldSetter");
  Object.defineProperty(Object.prototype, "should", {
    set: shouldSetter,
    get: shouldGetter,
    configurable: true
  });
  let should22 = {};
  should22.fail = function(actual, expected, message, operator) {
    if (arguments.length < 2) {
      message = actual;
      actual = void 0;
    }
    message = message || "should.fail()";
    throw new AssertionError(
      message,
      {
        actual,
        expected,
        operator
      },
      should22.fail
    );
  };
  should22.equal = function(actual, expected, message) {
    new Assertion(actual, message).to.equal(expected);
  };
  should22.Throw = function(fn2, errt, errs, msg) {
    new Assertion(fn2, msg).to.Throw(errt, errs);
  };
  should22.exist = function(val, msg) {
    new Assertion(val, msg).to.exist;
  };
  should22.not = {};
  should22.not.equal = function(actual, expected, msg) {
    new Assertion(actual, msg).to.not.equal(expected);
  };
  should22.not.Throw = function(fn2, errt, errs, msg) {
    new Assertion(fn2, msg).to.not.Throw(errt, errs);
  };
  should22.not.exist = function(val, msg) {
    new Assertion(val, msg).to.not.exist;
  };
  should22["throw"] = should22["Throw"];
  should22.not["throw"] = should22.not["Throw"];
  return should22;
}
__name(loadShould, "loadShould");
var should = loadShould;
var Should = loadShould;
function assert3(express, errmsg) {
  let test22 = new Assertion(null, null, assert3, true);
  test22.assert(express, errmsg, "[ negation message unavailable ]");
}
__name(assert3, "assert");
assert3.fail = function(actual, expected, message, operator) {
  if (arguments.length < 2) {
    message = actual;
    actual = void 0;
  }
  message = message || "assert.fail()";
  throw new AssertionError(
    message,
    {
      actual,
      expected,
      operator
    },
    assert3.fail
  );
};
assert3.isOk = function(val, msg) {
  new Assertion(val, msg, assert3.isOk, true).is.ok;
};
assert3.isNotOk = function(val, msg) {
  new Assertion(val, msg, assert3.isNotOk, true).is.not.ok;
};
assert3.equal = function(act, exp, msg) {
  let test22 = new Assertion(act, msg, assert3.equal, true);
  test22.assert(
    exp == flag(test22, "object"),
    "expected #{this} to equal #{exp}",
    "expected #{this} to not equal #{act}",
    exp,
    act,
    true
  );
};
assert3.notEqual = function(act, exp, msg) {
  let test22 = new Assertion(act, msg, assert3.notEqual, true);
  test22.assert(
    exp != flag(test22, "object"),
    "expected #{this} to not equal #{exp}",
    "expected #{this} to equal #{act}",
    exp,
    act,
    true
  );
};
assert3.strictEqual = function(act, exp, msg) {
  new Assertion(act, msg, assert3.strictEqual, true).to.equal(exp);
};
assert3.notStrictEqual = function(act, exp, msg) {
  new Assertion(act, msg, assert3.notStrictEqual, true).to.not.equal(exp);
};
assert3.deepEqual = assert3.deepStrictEqual = function(act, exp, msg) {
  new Assertion(act, msg, assert3.deepEqual, true).to.eql(exp);
};
assert3.notDeepEqual = function(act, exp, msg) {
  new Assertion(act, msg, assert3.notDeepEqual, true).to.not.eql(exp);
};
assert3.isAbove = function(val, abv, msg) {
  new Assertion(val, msg, assert3.isAbove, true).to.be.above(abv);
};
assert3.isAtLeast = function(val, atlst, msg) {
  new Assertion(val, msg, assert3.isAtLeast, true).to.be.least(atlst);
};
assert3.isBelow = function(val, blw, msg) {
  new Assertion(val, msg, assert3.isBelow, true).to.be.below(blw);
};
assert3.isAtMost = function(val, atmst, msg) {
  new Assertion(val, msg, assert3.isAtMost, true).to.be.most(atmst);
};
assert3.isTrue = function(val, msg) {
  new Assertion(val, msg, assert3.isTrue, true).is["true"];
};
assert3.isNotTrue = function(val, msg) {
  new Assertion(val, msg, assert3.isNotTrue, true).to.not.equal(true);
};
assert3.isFalse = function(val, msg) {
  new Assertion(val, msg, assert3.isFalse, true).is["false"];
};
assert3.isNotFalse = function(val, msg) {
  new Assertion(val, msg, assert3.isNotFalse, true).to.not.equal(false);
};
assert3.isNull = function(val, msg) {
  new Assertion(val, msg, assert3.isNull, true).to.equal(null);
};
assert3.isNotNull = function(val, msg) {
  new Assertion(val, msg, assert3.isNotNull, true).to.not.equal(null);
};
assert3.isNaN = function(val, msg) {
  new Assertion(val, msg, assert3.isNaN, true).to.be.NaN;
};
assert3.isNotNaN = function(value, message) {
  new Assertion(value, message, assert3.isNotNaN, true).not.to.be.NaN;
};
assert3.exists = function(val, msg) {
  new Assertion(val, msg, assert3.exists, true).to.exist;
};
assert3.notExists = function(val, msg) {
  new Assertion(val, msg, assert3.notExists, true).to.not.exist;
};
assert3.isUndefined = function(val, msg) {
  new Assertion(val, msg, assert3.isUndefined, true).to.equal(void 0);
};
assert3.isDefined = function(val, msg) {
  new Assertion(val, msg, assert3.isDefined, true).to.not.equal(void 0);
};
assert3.isCallable = function(value, message) {
  new Assertion(value, message, assert3.isCallable, true).is.callable;
};
assert3.isNotCallable = function(value, message) {
  new Assertion(value, message, assert3.isNotCallable, true).is.not.callable;
};
assert3.isObject = function(val, msg) {
  new Assertion(val, msg, assert3.isObject, true).to.be.a("object");
};
assert3.isNotObject = function(val, msg) {
  new Assertion(val, msg, assert3.isNotObject, true).to.not.be.a("object");
};
assert3.isArray = function(val, msg) {
  new Assertion(val, msg, assert3.isArray, true).to.be.an("array");
};
assert3.isNotArray = function(val, msg) {
  new Assertion(val, msg, assert3.isNotArray, true).to.not.be.an("array");
};
assert3.isString = function(val, msg) {
  new Assertion(val, msg, assert3.isString, true).to.be.a("string");
};
assert3.isNotString = function(val, msg) {
  new Assertion(val, msg, assert3.isNotString, true).to.not.be.a("string");
};
assert3.isNumber = function(val, msg) {
  new Assertion(val, msg, assert3.isNumber, true).to.be.a("number");
};
assert3.isNotNumber = function(val, msg) {
  new Assertion(val, msg, assert3.isNotNumber, true).to.not.be.a("number");
};
assert3.isNumeric = function(val, msg) {
  new Assertion(val, msg, assert3.isNumeric, true).is.numeric;
};
assert3.isNotNumeric = function(val, msg) {
  new Assertion(val, msg, assert3.isNotNumeric, true).is.not.numeric;
};
assert3.isFinite = function(val, msg) {
  new Assertion(val, msg, assert3.isFinite, true).to.be.finite;
};
assert3.isBoolean = function(val, msg) {
  new Assertion(val, msg, assert3.isBoolean, true).to.be.a("boolean");
};
assert3.isNotBoolean = function(val, msg) {
  new Assertion(val, msg, assert3.isNotBoolean, true).to.not.be.a("boolean");
};
assert3.typeOf = function(val, type3, msg) {
  new Assertion(val, msg, assert3.typeOf, true).to.be.a(type3);
};
assert3.notTypeOf = function(value, type3, message) {
  new Assertion(value, message, assert3.notTypeOf, true).to.not.be.a(type3);
};
assert3.instanceOf = function(val, type3, msg) {
  new Assertion(val, msg, assert3.instanceOf, true).to.be.instanceOf(type3);
};
assert3.notInstanceOf = function(val, type3, msg) {
  new Assertion(val, msg, assert3.notInstanceOf, true).to.not.be.instanceOf(
    type3
  );
};
assert3.include = function(exp, inc, msg) {
  new Assertion(exp, msg, assert3.include, true).include(inc);
};
assert3.notInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert3.notInclude, true).not.include(inc);
};
assert3.deepInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert3.deepInclude, true).deep.include(inc);
};
assert3.notDeepInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert3.notDeepInclude, true).not.deep.include(inc);
};
assert3.nestedInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert3.nestedInclude, true).nested.include(inc);
};
assert3.notNestedInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert3.notNestedInclude, true).not.nested.include(
    inc
  );
};
assert3.deepNestedInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert3.deepNestedInclude, true).deep.nested.include(
    inc
  );
};
assert3.notDeepNestedInclude = function(exp, inc, msg) {
  new Assertion(
    exp,
    msg,
    assert3.notDeepNestedInclude,
    true
  ).not.deep.nested.include(inc);
};
assert3.ownInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert3.ownInclude, true).own.include(inc);
};
assert3.notOwnInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert3.notOwnInclude, true).not.own.include(inc);
};
assert3.deepOwnInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert3.deepOwnInclude, true).deep.own.include(inc);
};
assert3.notDeepOwnInclude = function(exp, inc, msg) {
  new Assertion(exp, msg, assert3.notDeepOwnInclude, true).not.deep.own.include(
    inc
  );
};
assert3.match = function(exp, re, msg) {
  new Assertion(exp, msg, assert3.match, true).to.match(re);
};
assert3.notMatch = function(exp, re, msg) {
  new Assertion(exp, msg, assert3.notMatch, true).to.not.match(re);
};
assert3.property = function(obj, prop, msg) {
  new Assertion(obj, msg, assert3.property, true).to.have.property(prop);
};
assert3.notProperty = function(obj, prop, msg) {
  new Assertion(obj, msg, assert3.notProperty, true).to.not.have.property(prop);
};
assert3.propertyVal = function(obj, prop, val, msg) {
  new Assertion(obj, msg, assert3.propertyVal, true).to.have.property(prop, val);
};
assert3.notPropertyVal = function(obj, prop, val, msg) {
  new Assertion(obj, msg, assert3.notPropertyVal, true).to.not.have.property(
    prop,
    val
  );
};
assert3.deepPropertyVal = function(obj, prop, val, msg) {
  new Assertion(obj, msg, assert3.deepPropertyVal, true).to.have.deep.property(
    prop,
    val
  );
};
assert3.notDeepPropertyVal = function(obj, prop, val, msg) {
  new Assertion(
    obj,
    msg,
    assert3.notDeepPropertyVal,
    true
  ).to.not.have.deep.property(prop, val);
};
assert3.ownProperty = function(obj, prop, msg) {
  new Assertion(obj, msg, assert3.ownProperty, true).to.have.own.property(prop);
};
assert3.notOwnProperty = function(obj, prop, msg) {
  new Assertion(obj, msg, assert3.notOwnProperty, true).to.not.have.own.property(
    prop
  );
};
assert3.ownPropertyVal = function(obj, prop, value, msg) {
  new Assertion(obj, msg, assert3.ownPropertyVal, true).to.have.own.property(
    prop,
    value
  );
};
assert3.notOwnPropertyVal = function(obj, prop, value, msg) {
  new Assertion(
    obj,
    msg,
    assert3.notOwnPropertyVal,
    true
  ).to.not.have.own.property(prop, value);
};
assert3.deepOwnPropertyVal = function(obj, prop, value, msg) {
  new Assertion(
    obj,
    msg,
    assert3.deepOwnPropertyVal,
    true
  ).to.have.deep.own.property(prop, value);
};
assert3.notDeepOwnPropertyVal = function(obj, prop, value, msg) {
  new Assertion(
    obj,
    msg,
    assert3.notDeepOwnPropertyVal,
    true
  ).to.not.have.deep.own.property(prop, value);
};
assert3.nestedProperty = function(obj, prop, msg) {
  new Assertion(obj, msg, assert3.nestedProperty, true).to.have.nested.property(
    prop
  );
};
assert3.notNestedProperty = function(obj, prop, msg) {
  new Assertion(
    obj,
    msg,
    assert3.notNestedProperty,
    true
  ).to.not.have.nested.property(prop);
};
assert3.nestedPropertyVal = function(obj, prop, val, msg) {
  new Assertion(
    obj,
    msg,
    assert3.nestedPropertyVal,
    true
  ).to.have.nested.property(prop, val);
};
assert3.notNestedPropertyVal = function(obj, prop, val, msg) {
  new Assertion(
    obj,
    msg,
    assert3.notNestedPropertyVal,
    true
  ).to.not.have.nested.property(prop, val);
};
assert3.deepNestedPropertyVal = function(obj, prop, val, msg) {
  new Assertion(
    obj,
    msg,
    assert3.deepNestedPropertyVal,
    true
  ).to.have.deep.nested.property(prop, val);
};
assert3.notDeepNestedPropertyVal = function(obj, prop, val, msg) {
  new Assertion(
    obj,
    msg,
    assert3.notDeepNestedPropertyVal,
    true
  ).to.not.have.deep.nested.property(prop, val);
};
assert3.lengthOf = function(exp, len, msg) {
  new Assertion(exp, msg, assert3.lengthOf, true).to.have.lengthOf(len);
};
assert3.hasAnyKeys = function(obj, keys2, msg) {
  new Assertion(obj, msg, assert3.hasAnyKeys, true).to.have.any.keys(keys2);
};
assert3.hasAllKeys = function(obj, keys2, msg) {
  new Assertion(obj, msg, assert3.hasAllKeys, true).to.have.all.keys(keys2);
};
assert3.containsAllKeys = function(obj, keys2, msg) {
  new Assertion(obj, msg, assert3.containsAllKeys, true).to.contain.all.keys(
    keys2
  );
};
assert3.doesNotHaveAnyKeys = function(obj, keys2, msg) {
  new Assertion(obj, msg, assert3.doesNotHaveAnyKeys, true).to.not.have.any.keys(
    keys2
  );
};
assert3.doesNotHaveAllKeys = function(obj, keys2, msg) {
  new Assertion(obj, msg, assert3.doesNotHaveAllKeys, true).to.not.have.all.keys(
    keys2
  );
};
assert3.hasAnyDeepKeys = function(obj, keys2, msg) {
  new Assertion(obj, msg, assert3.hasAnyDeepKeys, true).to.have.any.deep.keys(
    keys2
  );
};
assert3.hasAllDeepKeys = function(obj, keys2, msg) {
  new Assertion(obj, msg, assert3.hasAllDeepKeys, true).to.have.all.deep.keys(
    keys2
  );
};
assert3.containsAllDeepKeys = function(obj, keys2, msg) {
  new Assertion(
    obj,
    msg,
    assert3.containsAllDeepKeys,
    true
  ).to.contain.all.deep.keys(keys2);
};
assert3.doesNotHaveAnyDeepKeys = function(obj, keys2, msg) {
  new Assertion(
    obj,
    msg,
    assert3.doesNotHaveAnyDeepKeys,
    true
  ).to.not.have.any.deep.keys(keys2);
};
assert3.doesNotHaveAllDeepKeys = function(obj, keys2, msg) {
  new Assertion(
    obj,
    msg,
    assert3.doesNotHaveAllDeepKeys,
    true
  ).to.not.have.all.deep.keys(keys2);
};
assert3.throws = function(fn2, errorLike, errMsgMatcher, msg) {
  if ("string" === typeof errorLike || errorLike instanceof RegExp) {
    errMsgMatcher = errorLike;
    errorLike = null;
  }
  let assertErr = new Assertion(fn2, msg, assert3.throws, true).to.throw(
    errorLike,
    errMsgMatcher
  );
  return flag(assertErr, "object");
};
assert3.doesNotThrow = function(fn2, errorLike, errMsgMatcher, message) {
  if ("string" === typeof errorLike || errorLike instanceof RegExp) {
    errMsgMatcher = errorLike;
    errorLike = null;
  }
  new Assertion(fn2, message, assert3.doesNotThrow, true).to.not.throw(
    errorLike,
    errMsgMatcher
  );
};
assert3.operator = function(val, operator, val2, msg) {
  let ok;
  switch (operator) {
    case "==":
      ok = val == val2;
      break;
    case "===":
      ok = val === val2;
      break;
    case ">":
      ok = val > val2;
      break;
    case ">=":
      ok = val >= val2;
      break;
    case "<":
      ok = val < val2;
      break;
    case "<=":
      ok = val <= val2;
      break;
    case "!=":
      ok = val != val2;
      break;
    case "!==":
      ok = val !== val2;
      break;
    default:
      msg = msg ? msg + ": " : msg;
      throw new AssertionError(
        msg + 'Invalid operator "' + operator + '"',
        void 0,
        assert3.operator
      );
  }
  let test22 = new Assertion(ok, msg, assert3.operator, true);
  test22.assert(
    true === flag(test22, "object"),
    "expected " + inspect22(val) + " to be " + operator + " " + inspect22(val2),
    "expected " + inspect22(val) + " to not be " + operator + " " + inspect22(val2)
  );
};
assert3.closeTo = function(act, exp, delta, msg) {
  new Assertion(act, msg, assert3.closeTo, true).to.be.closeTo(exp, delta);
};
assert3.approximately = function(act, exp, delta, msg) {
  new Assertion(act, msg, assert3.approximately, true).to.be.approximately(
    exp,
    delta
  );
};
assert3.sameMembers = function(set1, set22, msg) {
  new Assertion(set1, msg, assert3.sameMembers, true).to.have.same.members(set22);
};
assert3.notSameMembers = function(set1, set22, msg) {
  new Assertion(
    set1,
    msg,
    assert3.notSameMembers,
    true
  ).to.not.have.same.members(set22);
};
assert3.sameDeepMembers = function(set1, set22, msg) {
  new Assertion(
    set1,
    msg,
    assert3.sameDeepMembers,
    true
  ).to.have.same.deep.members(set22);
};
assert3.notSameDeepMembers = function(set1, set22, msg) {
  new Assertion(
    set1,
    msg,
    assert3.notSameDeepMembers,
    true
  ).to.not.have.same.deep.members(set22);
};
assert3.sameOrderedMembers = function(set1, set22, msg) {
  new Assertion(
    set1,
    msg,
    assert3.sameOrderedMembers,
    true
  ).to.have.same.ordered.members(set22);
};
assert3.notSameOrderedMembers = function(set1, set22, msg) {
  new Assertion(
    set1,
    msg,
    assert3.notSameOrderedMembers,
    true
  ).to.not.have.same.ordered.members(set22);
};
assert3.sameDeepOrderedMembers = function(set1, set22, msg) {
  new Assertion(
    set1,
    msg,
    assert3.sameDeepOrderedMembers,
    true
  ).to.have.same.deep.ordered.members(set22);
};
assert3.notSameDeepOrderedMembers = function(set1, set22, msg) {
  new Assertion(
    set1,
    msg,
    assert3.notSameDeepOrderedMembers,
    true
  ).to.not.have.same.deep.ordered.members(set22);
};
assert3.includeMembers = function(superset, subset, msg) {
  new Assertion(superset, msg, assert3.includeMembers, true).to.include.members(
    subset
  );
};
assert3.notIncludeMembers = function(superset, subset, msg) {
  new Assertion(
    superset,
    msg,
    assert3.notIncludeMembers,
    true
  ).to.not.include.members(subset);
};
assert3.includeDeepMembers = function(superset, subset, msg) {
  new Assertion(
    superset,
    msg,
    assert3.includeDeepMembers,
    true
  ).to.include.deep.members(subset);
};
assert3.notIncludeDeepMembers = function(superset, subset, msg) {
  new Assertion(
    superset,
    msg,
    assert3.notIncludeDeepMembers,
    true
  ).to.not.include.deep.members(subset);
};
assert3.includeOrderedMembers = function(superset, subset, msg) {
  new Assertion(
    superset,
    msg,
    assert3.includeOrderedMembers,
    true
  ).to.include.ordered.members(subset);
};
assert3.notIncludeOrderedMembers = function(superset, subset, msg) {
  new Assertion(
    superset,
    msg,
    assert3.notIncludeOrderedMembers,
    true
  ).to.not.include.ordered.members(subset);
};
assert3.includeDeepOrderedMembers = function(superset, subset, msg) {
  new Assertion(
    superset,
    msg,
    assert3.includeDeepOrderedMembers,
    true
  ).to.include.deep.ordered.members(subset);
};
assert3.notIncludeDeepOrderedMembers = function(superset, subset, msg) {
  new Assertion(
    superset,
    msg,
    assert3.notIncludeDeepOrderedMembers,
    true
  ).to.not.include.deep.ordered.members(subset);
};
assert3.oneOf = function(inList, list, msg) {
  new Assertion(inList, msg, assert3.oneOf, true).to.be.oneOf(list);
};
assert3.isIterable = function(obj, msg) {
  if (obj == void 0 || !obj[Symbol.iterator]) {
    msg = msg ? `${msg} expected ${inspect22(obj)} to be an iterable` : `expected ${inspect22(obj)} to be an iterable`;
    throw new AssertionError(msg, void 0, assert3.isIterable);
  }
};
assert3.changes = function(fn2, obj, prop, msg) {
  if (arguments.length === 3 && typeof obj === "function") {
    msg = prop;
    prop = null;
  }
  new Assertion(fn2, msg, assert3.changes, true).to.change(obj, prop);
};
assert3.changesBy = function(fn2, obj, prop, delta, msg) {
  if (arguments.length === 4 && typeof obj === "function") {
    let tmpMsg = delta;
    delta = prop;
    msg = tmpMsg;
  } else if (arguments.length === 3) {
    delta = prop;
    prop = null;
  }
  new Assertion(fn2, msg, assert3.changesBy, true).to.change(obj, prop).by(delta);
};
assert3.doesNotChange = function(fn2, obj, prop, msg) {
  if (arguments.length === 3 && typeof obj === "function") {
    msg = prop;
    prop = null;
  }
  return new Assertion(fn2, msg, assert3.doesNotChange, true).to.not.change(
    obj,
    prop
  );
};
assert3.changesButNotBy = function(fn2, obj, prop, delta, msg) {
  if (arguments.length === 4 && typeof obj === "function") {
    let tmpMsg = delta;
    delta = prop;
    msg = tmpMsg;
  } else if (arguments.length === 3) {
    delta = prop;
    prop = null;
  }
  new Assertion(fn2, msg, assert3.changesButNotBy, true).to.change(obj, prop).but.not.by(delta);
};
assert3.increases = function(fn2, obj, prop, msg) {
  if (arguments.length === 3 && typeof obj === "function") {
    msg = prop;
    prop = null;
  }
  return new Assertion(fn2, msg, assert3.increases, true).to.increase(obj, prop);
};
assert3.increasesBy = function(fn2, obj, prop, delta, msg) {
  if (arguments.length === 4 && typeof obj === "function") {
    let tmpMsg = delta;
    delta = prop;
    msg = tmpMsg;
  } else if (arguments.length === 3) {
    delta = prop;
    prop = null;
  }
  new Assertion(fn2, msg, assert3.increasesBy, true).to.increase(obj, prop).by(delta);
};
assert3.doesNotIncrease = function(fn2, obj, prop, msg) {
  if (arguments.length === 3 && typeof obj === "function") {
    msg = prop;
    prop = null;
  }
  return new Assertion(fn2, msg, assert3.doesNotIncrease, true).to.not.increase(
    obj,
    prop
  );
};
assert3.increasesButNotBy = function(fn2, obj, prop, delta, msg) {
  if (arguments.length === 4 && typeof obj === "function") {
    let tmpMsg = delta;
    delta = prop;
    msg = tmpMsg;
  } else if (arguments.length === 3) {
    delta = prop;
    prop = null;
  }
  new Assertion(fn2, msg, assert3.increasesButNotBy, true).to.increase(obj, prop).but.not.by(delta);
};
assert3.decreases = function(fn2, obj, prop, msg) {
  if (arguments.length === 3 && typeof obj === "function") {
    msg = prop;
    prop = null;
  }
  return new Assertion(fn2, msg, assert3.decreases, true).to.decrease(obj, prop);
};
assert3.decreasesBy = function(fn2, obj, prop, delta, msg) {
  if (arguments.length === 4 && typeof obj === "function") {
    let tmpMsg = delta;
    delta = prop;
    msg = tmpMsg;
  } else if (arguments.length === 3) {
    delta = prop;
    prop = null;
  }
  new Assertion(fn2, msg, assert3.decreasesBy, true).to.decrease(obj, prop).by(delta);
};
assert3.doesNotDecrease = function(fn2, obj, prop, msg) {
  if (arguments.length === 3 && typeof obj === "function") {
    msg = prop;
    prop = null;
  }
  return new Assertion(fn2, msg, assert3.doesNotDecrease, true).to.not.decrease(
    obj,
    prop
  );
};
assert3.doesNotDecreaseBy = function(fn2, obj, prop, delta, msg) {
  if (arguments.length === 4 && typeof obj === "function") {
    let tmpMsg = delta;
    delta = prop;
    msg = tmpMsg;
  } else if (arguments.length === 3) {
    delta = prop;
    prop = null;
  }
  return new Assertion(fn2, msg, assert3.doesNotDecreaseBy, true).to.not.decrease(obj, prop).by(delta);
};
assert3.decreasesButNotBy = function(fn2, obj, prop, delta, msg) {
  if (arguments.length === 4 && typeof obj === "function") {
    let tmpMsg = delta;
    delta = prop;
    msg = tmpMsg;
  } else if (arguments.length === 3) {
    delta = prop;
    prop = null;
  }
  new Assertion(fn2, msg, assert3.decreasesButNotBy, true).to.decrease(obj, prop).but.not.by(delta);
};
assert3.ifError = function(val) {
  if (val) {
    throw val;
  }
};
assert3.isExtensible = function(obj, msg) {
  new Assertion(obj, msg, assert3.isExtensible, true).to.be.extensible;
};
assert3.isNotExtensible = function(obj, msg) {
  new Assertion(obj, msg, assert3.isNotExtensible, true).to.not.be.extensible;
};
assert3.isSealed = function(obj, msg) {
  new Assertion(obj, msg, assert3.isSealed, true).to.be.sealed;
};
assert3.isNotSealed = function(obj, msg) {
  new Assertion(obj, msg, assert3.isNotSealed, true).to.not.be.sealed;
};
assert3.isFrozen = function(obj, msg) {
  new Assertion(obj, msg, assert3.isFrozen, true).to.be.frozen;
};
assert3.isNotFrozen = function(obj, msg) {
  new Assertion(obj, msg, assert3.isNotFrozen, true).to.not.be.frozen;
};
assert3.isEmpty = function(val, msg) {
  new Assertion(val, msg, assert3.isEmpty, true).to.be.empty;
};
assert3.isNotEmpty = function(val, msg) {
  new Assertion(val, msg, assert3.isNotEmpty, true).to.not.be.empty;
};
assert3.containsSubset = function(val, exp, msg) {
  new Assertion(val, msg).to.containSubset(exp);
};
assert3.doesNotContainSubset = function(val, exp, msg) {
  new Assertion(val, msg).to.not.containSubset(exp);
};
var aliases = [
  ["isOk", "ok"],
  ["isNotOk", "notOk"],
  ["throws", "throw"],
  ["throws", "Throw"],
  ["isExtensible", "extensible"],
  ["isNotExtensible", "notExtensible"],
  ["isSealed", "sealed"],
  ["isNotSealed", "notSealed"],
  ["isFrozen", "frozen"],
  ["isNotFrozen", "notFrozen"],
  ["isEmpty", "empty"],
  ["isNotEmpty", "notEmpty"],
  ["isCallable", "isFunction"],
  ["isNotCallable", "isNotFunction"],
  ["containsSubset", "containSubset"]
];
for (const [name, as] of aliases) {
  assert3[as] = assert3[name];
}
var used = [];
function use(fn2) {
  const exports = {
    use,
    AssertionError,
    util: utils_exports,
    config,
    expect,
    assert: assert3,
    Assertion,
    ...should_exports
  };
  if (!~used.indexOf(fn2)) {
    fn2(exports, utils_exports);
    used.push(fn2);
  }
  return exports;
}
__name(use, "use");

// ../../node_modules/.pnpm/@vitest+expect@4.1.2/node_modules/@vitest/expect/dist/index.js
var ChaiStyleAssertions = (chai, utils) => {
  function defProperty(name, delegateTo) {
    utils.addProperty(chai.Assertion.prototype, name, function() {
      const jestMethod = chai.Assertion.prototype[delegateTo];
      if (!jestMethod) {
        throw new Error(`Cannot delegate to ${String(delegateTo)}: method not found. Ensure JestChaiExpect plugin is loaded first.`);
      }
      return jestMethod.call(this);
    });
  }
  function defPropertyWithArgs(name, delegateTo, ...args) {
    utils.addProperty(chai.Assertion.prototype, name, function() {
      const jestMethod = chai.Assertion.prototype[delegateTo];
      if (!jestMethod) {
        throw new Error(`Cannot delegate to ${String(delegateTo)}: method not found. Ensure JestChaiExpect plugin is loaded first.`);
      }
      return jestMethod.call(this, ...args);
    });
  }
  function defMethod(name, delegateTo) {
    utils.addMethod(chai.Assertion.prototype, name, function(...args) {
      const jestMethod = chai.Assertion.prototype[delegateTo];
      if (!jestMethod) {
        throw new Error(`Cannot delegate to ${String(delegateTo)}: method not found. Ensure JestChaiExpect plugin is loaded first.`);
      }
      return jestMethod.call(this, ...args);
    });
  }
  defProperty("called", "toHaveBeenCalled");
  defProperty("calledOnce", "toHaveBeenCalledOnce");
  defPropertyWithArgs("calledTwice", "toHaveBeenCalledTimes", 2);
  defPropertyWithArgs("calledThrice", "toHaveBeenCalledTimes", 3);
  defMethod("callCount", "toHaveBeenCalledTimes");
  defMethod("calledWith", "toHaveBeenCalledWith");
  defMethod("calledOnceWith", "toHaveBeenCalledExactlyOnceWith");
  defMethod("lastCalledWith", "toHaveBeenLastCalledWith");
  defMethod("nthCalledWith", "toHaveBeenNthCalledWith");
  defMethod("returned", "toHaveReturned");
  defMethod("returnedWith", "toHaveReturnedWith");
  defMethod("returnedTimes", "toHaveReturnedTimes");
  defMethod("lastReturnedWith", "toHaveLastReturnedWith");
  defMethod("nthReturnedWith", "toHaveNthReturnedWith");
  defMethod("calledBefore", "toHaveBeenCalledBefore");
  defMethod("calledAfter", "toHaveBeenCalledAfter");
};
var MATCHERS_OBJECT = /* @__PURE__ */ Symbol.for("matchers-object");
var JEST_MATCHERS_OBJECT = /* @__PURE__ */ Symbol.for("$$jest-matchers-object");
var GLOBAL_EXPECT = /* @__PURE__ */ Symbol.for("expect-global");
var ASYMMETRIC_MATCHERS_OBJECT = /* @__PURE__ */ Symbol.for("asymmetric-matchers-object");
var customMatchers = {
  toSatisfy(actual, expected, message) {
    const { printReceived: printReceived3, printExpected: printExpected3, matcherHint: matcherHint2 } = this.utils;
    const pass = expected(actual);
    return {
      pass,
      message: () => pass ? `${matcherHint2(".not.toSatisfy", "received", "")}

Expected value to not satisfy:
${message || printExpected3(expected)}
Received:
${printReceived3(actual)}` : `${matcherHint2(".toSatisfy", "received", "")}

Expected value to satisfy:
${message || printExpected3(expected)}

Received:
${printReceived3(actual)}`
    };
  },
  toBeOneOf(actual, expected) {
    const { equals: equals2, customTesters } = this;
    const { printReceived: printReceived3, printExpected: printExpected3, matcherHint: matcherHint2 } = this.utils;
    let pass;
    if (Array.isArray(expected)) {
      pass = expected.length === 0 || expected.some((item) => equals2(item, actual, customTesters));
    } else if (expected instanceof Set) {
      pass = expected.size === 0 || expected.has(actual) || [...expected].some((item) => equals2(item, actual, customTesters));
    } else {
      throw new TypeError(`You must provide an array or set to ${matcherHint2(".toBeOneOf")}, not '${typeof expected}'.`);
    }
    return {
      pass,
      message: () => pass ? `${matcherHint2(".not.toBeOneOf", "received", "")}

Expected value to not be one of:
${printExpected3(expected)}
Received:
${printReceived3(actual)}` : `${matcherHint2(".toBeOneOf", "received", "")}

Expected value to be one of:
${printExpected3(expected)}

Received:
${printReceived3(actual)}`
    };
  }
};
var EXPECTED_COLOR = y.green;
var RECEIVED_COLOR = y.red;
var INVERTED_COLOR = y.inverse;
var BOLD_WEIGHT = y.bold;
var DIM_COLOR = y.dim;
function matcherHint(matcherName, received = "received", expected = "expected", options = {}) {
  const { comment = "", isDirectExpectCall = false, isNot = false, promise = "", secondArgument = "", expectedColor = EXPECTED_COLOR, receivedColor = RECEIVED_COLOR, secondArgumentColor = EXPECTED_COLOR } = options;
  let hint = "";
  let dimString = "expect";
  if (!isDirectExpectCall && received !== "") {
    hint += DIM_COLOR(`${dimString}(`) + receivedColor(received);
    dimString = ")";
  }
  if (promise !== "") {
    hint += DIM_COLOR(`${dimString}.`) + promise;
    dimString = "";
  }
  if (isNot) {
    hint += `${DIM_COLOR(`${dimString}.`)}not`;
    dimString = "";
  }
  if (matcherName.includes(".")) {
    dimString += matcherName;
  } else {
    hint += DIM_COLOR(`${dimString}.`) + matcherName;
    dimString = "";
  }
  if (expected === "") {
    dimString += "()";
  } else {
    hint += DIM_COLOR(`${dimString}(`) + expectedColor(expected);
    if (secondArgument) {
      hint += DIM_COLOR(", ") + secondArgumentColor(secondArgument);
    }
    dimString = ")";
  }
  if (comment !== "") {
    dimString += ` // ${comment}`;
  }
  if (dimString !== "") {
    hint += DIM_COLOR(dimString);
  }
  return hint;
}
var SPACE_SYMBOL2 = "\xB7";
function replaceTrailingSpaces2(text) {
  return text.replace(/\s+$/gm, (spaces) => SPACE_SYMBOL2.repeat(spaces.length));
}
function printReceived2(object2) {
  return RECEIVED_COLOR(replaceTrailingSpaces2(stringify2(object2)));
}
function printExpected2(value) {
  return EXPECTED_COLOR(replaceTrailingSpaces2(stringify2(value)));
}
function getMatcherUtils() {
  return {
    EXPECTED_COLOR,
    RECEIVED_COLOR,
    INVERTED_COLOR,
    BOLD_WEIGHT,
    DIM_COLOR,
    diff,
    matcherHint,
    printReceived: printReceived2,
    printExpected: printExpected2,
    printDiffOrStringify,
    printWithType
  };
}
function printWithType(name, value, print) {
  const type3 = getType2(value);
  const hasType = type3 !== "null" && type3 !== "undefined" ? `${name} has type:  ${type3}
` : "";
  const hasValue = `${name} has value: ${print(value)}`;
  return hasType + hasValue;
}
function addCustomEqualityTesters(newTesters) {
  if (!Array.isArray(newTesters)) {
    throw new TypeError(`expect.customEqualityTesters: Must be set to an array of Testers. Was given "${getType2(newTesters)}"`);
  }
  globalThis[JEST_MATCHERS_OBJECT].customEqualityTesters.push(...newTesters);
}
function getCustomEqualityTesters() {
  return globalThis[JEST_MATCHERS_OBJECT].customEqualityTesters;
}
function equals(a2, b3, customTesters, strictCheck) {
  customTesters = customTesters || [];
  return eq(a2, b3, [], [], customTesters, strictCheck ? hasKey : hasDefinedKey);
}
var functionToString = Function.prototype.toString;
function isAsymmetric(obj) {
  return !!obj && typeof obj === "object" && "asymmetricMatch" in obj && isA("Function", obj.asymmetricMatch);
}
function asymmetricMatch(a2, b3, customTesters) {
  const asymmetricA = isAsymmetric(a2);
  const asymmetricB = isAsymmetric(b3);
  if (asymmetricA && asymmetricB) {
    return void 0;
  }
  if (asymmetricA) {
    return a2.asymmetricMatch(b3, customTesters);
  }
  if (asymmetricB) {
    return b3.asymmetricMatch(a2, customTesters);
  }
}
function isError(value) {
  if (typeof Error.isError === "function") {
    return Error.isError(value);
  }
  switch (Object.prototype.toString.call(value)) {
    case "[object Error]":
    case "[object Exception]":
    case "[object DOMException]":
      return true;
    default:
      return value instanceof Error;
  }
}
function eq(a2, b3, aStack, bStack, customTesters, hasKey2) {
  let result = true;
  const asymmetricResult = asymmetricMatch(a2, b3, customTesters);
  if (asymmetricResult !== void 0) {
    return asymmetricResult;
  }
  const testerContext = { equals };
  for (let i3 = 0; i3 < customTesters.length; i3++) {
    const customTesterResult = customTesters[i3].call(testerContext, a2, b3, customTesters);
    if (customTesterResult !== void 0) {
      return customTesterResult;
    }
  }
  if (typeof URL === "function" && a2 instanceof URL && b3 instanceof URL) {
    return a2.href === b3.href;
  }
  if (Object.is(a2, b3)) {
    return true;
  }
  if (a2 === null || b3 === null) {
    return a2 === b3;
  }
  const className = Object.prototype.toString.call(a2);
  if (className !== Object.prototype.toString.call(b3)) {
    return false;
  }
  switch (className) {
    case "[object Boolean]":
    case "[object String]":
    case "[object Number]":
      if (typeof a2 !== typeof b3) {
        return false;
      } else if (typeof a2 !== "object" && typeof b3 !== "object") {
        return Object.is(a2, b3);
      } else {
        return Object.is(a2.valueOf(), b3.valueOf());
      }
    case "[object Date]": {
      const numA = +a2;
      const numB = +b3;
      return numA === numB || Number.isNaN(numA) && Number.isNaN(numB);
    }
    case "[object RegExp]":
      return a2.source === b3.source && a2.flags === b3.flags;
    case "[object Temporal.Instant]":
    case "[object Temporal.ZonedDateTime]":
    case "[object Temporal.PlainDateTime]":
    case "[object Temporal.PlainDate]":
    case "[object Temporal.PlainTime]":
    case "[object Temporal.PlainYearMonth]":
    case "[object Temporal.PlainMonthDay]":
      return a2.equals(b3);
    case "[object Temporal.Duration]":
      return a2.toString() === b3.toString();
  }
  if (typeof a2 !== "object" || typeof b3 !== "object") {
    return false;
  }
  if (isDomNode(a2) && isDomNode(b3)) {
    return a2.isEqualNode(b3);
  }
  let length = aStack.length;
  while (length--) {
    if (aStack[length] === a2) {
      return bStack[length] === b3;
    } else if (bStack[length] === b3) {
      return false;
    }
  }
  aStack.push(a2);
  bStack.push(b3);
  if (className === "[object Array]" && a2.length !== b3.length) {
    return false;
  }
  if (isError(a2) && isError(b3)) {
    try {
      return isErrorEqual(a2, b3, aStack, bStack, customTesters, hasKey2);
    } finally {
      aStack.pop();
      bStack.pop();
    }
  }
  const aKeys = keys(a2, hasKey2);
  let key;
  let size = aKeys.length;
  if (keys(b3, hasKey2).length !== size) {
    return false;
  }
  while (size--) {
    key = aKeys[size];
    result = hasKey2(b3, key) && eq(a2[key], b3[key], aStack, bStack, customTesters, hasKey2);
    if (!result) {
      return false;
    }
  }
  aStack.pop();
  bStack.pop();
  return result;
}
function isErrorEqual(a2, b3, aStack, bStack, customTesters, hasKey2) {
  let result = Object.prototype.toString.call(a2) === Object.prototype.toString.call(b3) && a2.name === b3.name && a2.message === b3.message;
  if (typeof b3.cause !== "undefined") {
    result &&= eq(a2.cause, b3.cause, aStack, bStack, customTesters, hasKey2);
  }
  if (a2 instanceof AggregateError && b3 instanceof AggregateError) {
    result &&= eq(a2.errors, b3.errors, aStack, bStack, customTesters, hasKey2);
  }
  result &&= eq({ ...a2 }, { ...b3 }, aStack, bStack, customTesters, hasKey2);
  return result;
}
function keys(obj, hasKey2) {
  const keys2 = [];
  for (const key in obj) {
    if (hasKey2(obj, key)) {
      keys2.push(key);
    }
  }
  return keys2.concat(Object.getOwnPropertySymbols(obj).filter((symbol) => Object.getOwnPropertyDescriptor(obj, symbol).enumerable));
}
function hasDefinedKey(obj, key) {
  return hasKey(obj, key) && obj[key] !== void 0;
}
function hasKey(obj, key) {
  return Object.hasOwn(obj, key);
}
function isA(typeName, value) {
  return Object.prototype.toString.apply(value) === `[object ${typeName}]`;
}
function isDomNode(obj) {
  return obj !== null && typeof obj === "object" && "nodeType" in obj && typeof obj.nodeType === "number" && "nodeName" in obj && typeof obj.nodeName === "string" && "isEqualNode" in obj && typeof obj.isEqualNode === "function";
}
var IS_KEYED_SENTINEL2 = "@@__IMMUTABLE_KEYED__@@";
var IS_SET_SENTINEL2 = "@@__IMMUTABLE_SET__@@";
var IS_LIST_SENTINEL2 = "@@__IMMUTABLE_LIST__@@";
var IS_ORDERED_SENTINEL2 = "@@__IMMUTABLE_ORDERED__@@";
var IS_RECORD_SYMBOL2 = "@@__IMMUTABLE_RECORD__@@";
function isImmutableUnorderedKeyed(maybeKeyed) {
  return !!(maybeKeyed && maybeKeyed[IS_KEYED_SENTINEL2] && !maybeKeyed[IS_ORDERED_SENTINEL2]);
}
function isImmutableUnorderedSet(maybeSet) {
  return !!(maybeSet && maybeSet[IS_SET_SENTINEL2] && !maybeSet[IS_ORDERED_SENTINEL2]);
}
function isObjectLiteral(source) {
  return source != null && typeof source === "object" && !Array.isArray(source);
}
function isImmutableList(source) {
  return Boolean(source && isObjectLiteral(source) && source[IS_LIST_SENTINEL2]);
}
function isImmutableOrderedKeyed(source) {
  return Boolean(source && isObjectLiteral(source) && source[IS_KEYED_SENTINEL2] && source[IS_ORDERED_SENTINEL2]);
}
function isImmutableOrderedSet(source) {
  return Boolean(source && isObjectLiteral(source) && source[IS_SET_SENTINEL2] && source[IS_ORDERED_SENTINEL2]);
}
function isImmutableRecord(source) {
  return Boolean(source && isObjectLiteral(source) && source[IS_RECORD_SYMBOL2]);
}
var IteratorSymbol = Symbol.iterator;
function hasIterator(object2) {
  return !!(object2 != null && object2[IteratorSymbol]);
}
function iterableEquality(a2, b3, customTesters = [], aStack = [], bStack = []) {
  if (typeof a2 !== "object" || typeof b3 !== "object" || Array.isArray(a2) || Array.isArray(b3) || !hasIterator(a2) || !hasIterator(b3)) {
    return void 0;
  }
  if (a2.constructor !== b3.constructor) {
    return false;
  }
  let length = aStack.length;
  while (length--) {
    if (aStack[length] === a2) {
      return bStack[length] === b3;
    }
  }
  aStack.push(a2);
  bStack.push(b3);
  const filteredCustomTesters = [...customTesters.filter((t) => t !== iterableEquality), iterableEqualityWithStack];
  function iterableEqualityWithStack(a3, b4) {
    return iterableEquality(a3, b4, [...customTesters], [...aStack], [...bStack]);
  }
  if (a2.size !== void 0) {
    if (a2.size !== b3.size) {
      return false;
    } else if (isA("Set", a2) || isImmutableUnorderedSet(a2)) {
      let allFound = true;
      for (const aValue of a2) {
        if (!b3.has(aValue)) {
          let has = false;
          for (const bValue of b3) {
            const isEqual = equals(aValue, bValue, filteredCustomTesters);
            if (isEqual === true) {
              has = true;
            }
          }
          if (has === false) {
            allFound = false;
            break;
          }
        }
      }
      aStack.pop();
      bStack.pop();
      return allFound;
    } else if (isA("Map", a2) || isImmutableUnorderedKeyed(a2)) {
      let allFound = true;
      for (const aEntry of a2) {
        if (!b3.has(aEntry[0]) || !equals(aEntry[1], b3.get(aEntry[0]), filteredCustomTesters)) {
          let has = false;
          for (const bEntry of b3) {
            const matchedKey = equals(aEntry[0], bEntry[0], filteredCustomTesters);
            let matchedValue = false;
            if (matchedKey === true) {
              matchedValue = equals(aEntry[1], bEntry[1], filteredCustomTesters);
            }
            if (matchedValue === true) {
              has = true;
            }
          }
          if (has === false) {
            allFound = false;
            break;
          }
        }
      }
      aStack.pop();
      bStack.pop();
      return allFound;
    }
  }
  const bIterator = b3[IteratorSymbol]();
  for (const aValue of a2) {
    const nextB = bIterator.next();
    if (nextB.done || !equals(aValue, nextB.value, filteredCustomTesters)) {
      return false;
    }
  }
  if (!bIterator.next().done) {
    return false;
  }
  if (!isImmutableList(a2) && !isImmutableOrderedKeyed(a2) && !isImmutableOrderedSet(a2) && !isImmutableRecord(a2)) {
    const aEntries = Object.entries(a2);
    const bEntries = Object.entries(b3);
    if (!equals(aEntries, bEntries, filteredCustomTesters)) {
      return false;
    }
  }
  aStack.pop();
  bStack.pop();
  return true;
}
function hasPropertyInObject(object2, key) {
  const shouldTerminate = !object2 || typeof object2 !== "object" || object2 === Object.prototype;
  if (shouldTerminate) {
    return false;
  }
  return Object.hasOwn(object2, key) || hasPropertyInObject(Object.getPrototypeOf(object2), key);
}
function isObjectWithKeys(a2) {
  return isObject(a2) && !isError(a2) && !Array.isArray(a2) && !(a2 instanceof Date) && !(a2 instanceof Set) && !(a2 instanceof Map);
}
function subsetEquality(object2, subset, customTesters = []) {
  const filteredCustomTesters = customTesters.filter((t) => t !== subsetEquality);
  const subsetEqualityWithContext = (seenReferences = /* @__PURE__ */ new WeakMap()) => (object3, subset2) => {
    if (!isObjectWithKeys(subset2)) {
      return void 0;
    }
    return Object.keys(subset2).every((key) => {
      if (subset2[key] != null && typeof subset2[key] === "object") {
        if (seenReferences.has(subset2[key])) {
          return equals(object3[key], subset2[key], filteredCustomTesters);
        }
        seenReferences.set(subset2[key], true);
      }
      const result = object3 != null && hasPropertyInObject(object3, key) && equals(object3[key], subset2[key], [...filteredCustomTesters, subsetEqualityWithContext(seenReferences)]);
      seenReferences.delete(subset2[key]);
      return result;
    });
  };
  return subsetEqualityWithContext()(object2, subset);
}
function typeEquality(a2, b3) {
  if (a2 == null || b3 == null || a2.constructor === b3.constructor) {
    return void 0;
  }
  return false;
}
function arrayBufferEquality(a2, b3) {
  let dataViewA = a2;
  let dataViewB = b3;
  if (!(a2 instanceof DataView && b3 instanceof DataView)) {
    if (!(a2 instanceof ArrayBuffer) || !(b3 instanceof ArrayBuffer)) {
      return void 0;
    }
    try {
      dataViewA = new DataView(a2);
      dataViewB = new DataView(b3);
    } catch {
      return void 0;
    }
  }
  if (dataViewA.byteLength !== dataViewB.byteLength) {
    return false;
  }
  for (let i3 = 0; i3 < dataViewA.byteLength; i3++) {
    if (dataViewA.getUint8(i3) !== dataViewB.getUint8(i3)) {
      return false;
    }
  }
  return true;
}
function sparseArrayEquality(a2, b3, customTesters = []) {
  if (!Array.isArray(a2) || !Array.isArray(b3)) {
    return void 0;
  }
  const aKeys = Object.keys(a2);
  const bKeys = Object.keys(b3);
  const filteredCustomTesters = customTesters.filter((t) => t !== sparseArrayEquality);
  return equals(a2, b3, filteredCustomTesters, true) && equals(aKeys, bKeys);
}
function generateToBeMessage(deepEqualityName, expected = "#{this}", actual = "#{exp}") {
  const toBeMessage = `expected ${expected} to be ${actual} // Object.is equality`;
  if (["toStrictEqual", "toEqual"].includes(deepEqualityName)) {
    return `${toBeMessage}

If it should pass with deep equality, replace "toBe" with "${deepEqualityName}"

Expected: ${expected}
Received: serializes to the same string
`;
  }
  return toBeMessage;
}
function pluralize(word, count) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
function getObjectKeys(object2) {
  return [...Object.keys(object2), ...Object.getOwnPropertySymbols(object2).filter((s2) => Object.getOwnPropertyDescriptor(object2, s2)?.enumerable)];
}
function getObjectSubset(object2, subset, customTesters) {
  let stripped = 0;
  const getObjectSubsetWithContext = (seenReferences = /* @__PURE__ */ new WeakMap()) => (object3, subset2) => {
    if (Array.isArray(object3)) {
      if (Array.isArray(subset2) && subset2.length === object3.length) {
        return subset2.map((sub, i3) => getObjectSubsetWithContext(seenReferences)(object3[i3], sub));
      }
    } else if (object3 instanceof Date) {
      return object3;
    } else if (isObject(object3) && isObject(subset2)) {
      if (equals(object3, subset2, [
        ...customTesters,
        iterableEquality,
        subsetEquality
      ])) {
        return subset2;
      }
      const trimmed = {};
      seenReferences.set(object3, trimmed);
      if (typeof object3.constructor === "function" && typeof object3.constructor.name === "string") {
        Object.defineProperty(trimmed, "constructor", {
          enumerable: false,
          value: object3.constructor
        });
      }
      for (const key of getObjectKeys(object3)) {
        if (hasPropertyInObject(subset2, key)) {
          trimmed[key] = seenReferences.has(object3[key]) ? seenReferences.get(object3[key]) : getObjectSubsetWithContext(seenReferences)(object3[key], subset2[key]);
        } else {
          if (!seenReferences.has(object3[key])) {
            stripped += 1;
            if (isObject(object3[key])) {
              stripped += getObjectKeys(object3[key]).length;
            }
            getObjectSubsetWithContext(seenReferences)(object3[key], subset2[key]);
          }
        }
      }
      if (getObjectKeys(trimmed).length > 0) {
        return trimmed;
      }
    }
    return object3;
  };
  return {
    subset: getObjectSubsetWithContext()(object2, subset),
    stripped
  };
}
function isStandardSchema(obj) {
  return !!obj && (typeof obj === "object" || typeof obj === "function") && obj["~standard"] && typeof obj["~standard"].validate === "function";
}
if (!Object.hasOwn(globalThis, MATCHERS_OBJECT)) {
  const globalState = /* @__PURE__ */ new WeakMap();
  const matchers = /* @__PURE__ */ Object.create(null);
  const customEqualityTesters = [];
  const asymmetricMatchers = /* @__PURE__ */ Object.create(null);
  Object.defineProperty(globalThis, MATCHERS_OBJECT, { get: () => globalState });
  Object.defineProperty(globalThis, JEST_MATCHERS_OBJECT, {
    configurable: true,
    get: () => ({
      state: globalState.get(globalThis[GLOBAL_EXPECT]),
      matchers,
      customEqualityTesters
    })
  });
  Object.defineProperty(globalThis, ASYMMETRIC_MATCHERS_OBJECT, { get: () => asymmetricMatchers });
}
function getState(expect2) {
  return globalThis[MATCHERS_OBJECT].get(expect2);
}
function setState(state, expect2) {
  const map2 = globalThis[MATCHERS_OBJECT];
  const current = map2.get(expect2) || {};
  const results = Object.defineProperties(current, {
    ...Object.getOwnPropertyDescriptors(current),
    ...Object.getOwnPropertyDescriptors(state)
  });
  map2.set(expect2, results);
}
var AsymmetricMatcher3 = class {
  // should have "jest" to be compatible with its ecosystem
  $$typeof = /* @__PURE__ */ Symbol.for("jest.asymmetricMatcher");
  constructor(sample, inverse = false) {
    this.sample = sample;
    this.inverse = inverse;
  }
  getMatcherContext(expect2) {
    return {
      ...getState(expect2 || globalThis[GLOBAL_EXPECT]),
      equals,
      isNot: this.inverse,
      customTesters: getCustomEqualityTesters(),
      utils: {
        ...getMatcherUtils(),
        diff,
        stringify: stringify2,
        iterableEquality,
        subsetEquality
      }
    };
  }
};
AsymmetricMatcher3.prototype[/* @__PURE__ */ Symbol.for("chai/inspect")] = function(options) {
  const result = stringify2(this, options.depth, { min: true });
  if (result.length <= options.truncate) {
    return result;
  }
  return `${this.toString()}{\u2026}`;
};
var StringContaining = class extends AsymmetricMatcher3 {
  constructor(sample, inverse = false) {
    if (!isA("String", sample)) {
      throw new Error("Expected is not a string");
    }
    super(sample, inverse);
  }
  asymmetricMatch(other) {
    const result = isA("String", other) && other.includes(this.sample);
    return this.inverse ? !result : result;
  }
  toString() {
    return `String${this.inverse ? "Not" : ""}Containing`;
  }
  getExpectedType() {
    return "string";
  }
};
var Anything = class extends AsymmetricMatcher3 {
  asymmetricMatch(other) {
    return other != null;
  }
  toString() {
    return "Anything";
  }
  toAsymmetricMatcher() {
    return "Anything";
  }
};
var ObjectContaining = class extends AsymmetricMatcher3 {
  constructor(sample, inverse = false) {
    super(sample, inverse);
  }
  getPrototype(obj) {
    if (Object.getPrototypeOf) {
      return Object.getPrototypeOf(obj);
    }
    if (obj.constructor.prototype === obj) {
      return null;
    }
    return obj.constructor.prototype;
  }
  hasProperty(obj, property) {
    if (!obj) {
      return false;
    }
    if (Object.hasOwn(obj, property)) {
      return true;
    }
    return this.hasProperty(this.getPrototype(obj), property);
  }
  getProperties(obj) {
    return [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj).filter((s2) => Object.getOwnPropertyDescriptor(obj, s2)?.enumerable)];
  }
  asymmetricMatch(other, customTesters) {
    if (typeof this.sample !== "object") {
      throw new TypeError(`You must provide an object to ${this.toString()}, not '${typeof this.sample}'.`);
    }
    let result = true;
    const properties = this.getProperties(this.sample);
    for (const property of properties) {
      if (!this.hasProperty(other, property)) {
        result = false;
        break;
      }
      const value = this.sample[property];
      const otherValue = other[property];
      if (!equals(value, otherValue, customTesters)) {
        result = false;
        break;
      }
    }
    return this.inverse ? !result : result;
  }
  toString() {
    return `Object${this.inverse ? "Not" : ""}Containing`;
  }
  getExpectedType() {
    return "object";
  }
};
var ArrayContaining = class extends AsymmetricMatcher3 {
  constructor(sample, inverse = false) {
    super(sample, inverse);
  }
  asymmetricMatch(other, customTesters) {
    if (!Array.isArray(this.sample)) {
      throw new TypeError(`You must provide an array to ${this.toString()}, not '${typeof this.sample}'.`);
    }
    const result = this.sample.length === 0 || Array.isArray(other) && this.sample.every((item) => other.some((another) => equals(item, another, customTesters)));
    return this.inverse ? !result : result;
  }
  toString() {
    return `Array${this.inverse ? "Not" : ""}Containing`;
  }
  getExpectedType() {
    return "array";
  }
};
var Any = class extends AsymmetricMatcher3 {
  constructor(sample) {
    if (typeof sample === "undefined") {
      throw new TypeError("any() expects to be passed a constructor function. Please pass one or use anything() to match any object.");
    }
    super(sample);
  }
  fnNameFor(func) {
    if (func.name) {
      return func.name;
    }
    const functionToString2 = Function.prototype.toString;
    const matches = functionToString2.call(func).match(/^(?:async)?\s*function\s*(?:\*\s*)?([\w$]+)\s*\(/);
    return matches ? matches[1] : "<anonymous>";
  }
  asymmetricMatch(other) {
    if (this.sample === String) {
      return typeof other == "string" || other instanceof String;
    }
    if (this.sample === Number) {
      return typeof other == "number" || other instanceof Number;
    }
    if (this.sample === Function) {
      return typeof other == "function" || typeof other === "function";
    }
    if (this.sample === Boolean) {
      return typeof other == "boolean" || other instanceof Boolean;
    }
    if (this.sample === BigInt) {
      return typeof other == "bigint" || other instanceof BigInt;
    }
    if (this.sample === Symbol) {
      return typeof other == "symbol" || other instanceof Symbol;
    }
    if (this.sample === Object) {
      return typeof other == "object";
    }
    return other instanceof this.sample;
  }
  toString() {
    return "Any";
  }
  getExpectedType() {
    if (this.sample === String) {
      return "string";
    }
    if (this.sample === Number) {
      return "number";
    }
    if (this.sample === Function) {
      return "function";
    }
    if (this.sample === Object) {
      return "object";
    }
    if (this.sample === Boolean) {
      return "boolean";
    }
    return this.fnNameFor(this.sample);
  }
  toAsymmetricMatcher() {
    return `Any<${this.fnNameFor(this.sample)}>`;
  }
};
var StringMatching = class extends AsymmetricMatcher3 {
  constructor(sample, inverse = false) {
    if (!isA("String", sample) && !isA("RegExp", sample)) {
      throw new Error("Expected is not a String or a RegExp");
    }
    super(new RegExp(sample), inverse);
  }
  asymmetricMatch(other) {
    const result = isA("String", other) && this.sample.test(other);
    return this.inverse ? !result : result;
  }
  toString() {
    return `String${this.inverse ? "Not" : ""}Matching`;
  }
  getExpectedType() {
    return "string";
  }
};
var CloseTo = class extends AsymmetricMatcher3 {
  precision;
  constructor(sample, precision = 2, inverse = false) {
    if (!isA("Number", sample)) {
      throw new Error("Expected is not a Number");
    }
    if (!isA("Number", precision)) {
      throw new Error("Precision is not a Number");
    }
    super(sample);
    this.inverse = inverse;
    this.precision = precision;
  }
  asymmetricMatch(other) {
    if (!isA("Number", other)) {
      return false;
    }
    let result = false;
    if (other === Number.POSITIVE_INFINITY && this.sample === Number.POSITIVE_INFINITY) {
      result = true;
    } else if (other === Number.NEGATIVE_INFINITY && this.sample === Number.NEGATIVE_INFINITY) {
      result = true;
    } else {
      result = Math.abs(this.sample - other) < 10 ** -this.precision / 2;
    }
    return this.inverse ? !result : result;
  }
  toString() {
    return `Number${this.inverse ? "Not" : ""}CloseTo`;
  }
  getExpectedType() {
    return "number";
  }
  toAsymmetricMatcher() {
    return [
      this.toString(),
      this.sample,
      `(${pluralize("digit", this.precision)})`
    ].join(" ");
  }
};
var SchemaMatching = class extends AsymmetricMatcher3 {
  result;
  constructor(sample, inverse = false) {
    if (!isStandardSchema(sample)) {
      throw new TypeError("SchemaMatching expected to receive a Standard Schema.");
    }
    super(sample, inverse);
  }
  asymmetricMatch(other) {
    const result = this.sample["~standard"].validate(other);
    if (result instanceof Promise) {
      throw new TypeError("Async schema validation is not supported in asymmetric matchers.");
    }
    this.result = result;
    const pass = !this.result.issues || this.result.issues.length === 0;
    return this.inverse ? !pass : pass;
  }
  toString() {
    return `Schema${this.inverse ? "Not" : ""}Matching`;
  }
  getExpectedType() {
    return "object";
  }
  toAsymmetricMatcher() {
    const { utils } = this.getMatcherContext();
    const issues = this.result?.issues || [];
    if (issues.length > 0) {
      return `${this.toString()} ${utils.stringify(this.result, void 0, { printBasicPrototype: false })}`;
    }
    return this.toString();
  }
};
var JestAsymmetricMatchers = (chai, utils) => {
  utils.addMethod(chai.expect, "anything", () => new Anything());
  utils.addMethod(chai.expect, "any", (expected) => new Any(expected));
  utils.addMethod(chai.expect, "stringContaining", (expected) => new StringContaining(expected));
  utils.addMethod(chai.expect, "objectContaining", (expected) => new ObjectContaining(expected));
  utils.addMethod(chai.expect, "arrayContaining", (expected) => new ArrayContaining(expected));
  utils.addMethod(chai.expect, "stringMatching", (expected) => new StringMatching(expected));
  utils.addMethod(chai.expect, "closeTo", (expected, precision) => new CloseTo(expected, precision));
  utils.addMethod(chai.expect, "schemaMatching", (expected) => new SchemaMatching(expected));
  chai.expect.not = {
    stringContaining: (expected) => new StringContaining(expected, true),
    objectContaining: (expected) => new ObjectContaining(expected, true),
    arrayContaining: (expected) => new ArrayContaining(expected, true),
    stringMatching: (expected) => new StringMatching(expected, true),
    closeTo: (expected, precision) => new CloseTo(expected, precision, true),
    schemaMatching: (expected) => new SchemaMatching(expected, true)
  };
};
function createAssertionMessage(util, assertion, hasArgs) {
  const soft = util.flag(assertion, "soft") ? ".soft" : "";
  const not = util.flag(assertion, "negate") ? "not." : "";
  const name = `${util.flag(assertion, "_name")}(${hasArgs ? "expected" : ""})`;
  const promiseName = util.flag(assertion, "promise");
  const promise = promiseName ? `.${promiseName}` : "";
  return `expect${soft}(actual)${promise}.${not}${name}`;
}
function recordAsyncExpect(_test2, promise, assertion, error, isSoft) {
  const test5 = _test2;
  if (test5 && promise instanceof Promise) {
    promise = promise.finally(() => {
      if (!test5.promises) {
        return;
      }
      const index2 = test5.promises.indexOf(promise);
      if (index2 !== -1) {
        test5.promises.splice(index2, 1);
      }
    });
    if (!test5.promises) {
      test5.promises = [];
    }
    if (isSoft) {
      promise = promise.then(noop, (err) => {
        handleTestError(test5, err);
      });
    }
    test5.promises.push(promise);
    let resolved = false;
    test5.onFinished ??= [];
    test5.onFinished.push(() => {
      if (!resolved) {
        const processor = globalThis.__vitest_worker__?.onFilterStackTrace || ((s2) => s2 || "");
        const stack = processor(error.stack);
        console.warn([
          `Promise returned by \`${assertion}\` was not awaited. `,
          "Vitest currently auto-awaits hanging assertions at the end of the test, but this will cause the test to fail in the next Vitest major. ",
          "Please remember to await the assertion.\n",
          stack
        ].join(""));
      }
    });
    return {
      then(onFulfilled, onRejected) {
        resolved = true;
        return promise.then(onFulfilled, onRejected);
      },
      catch(onRejected) {
        resolved = true;
        return promise.catch(onRejected);
      },
      finally(onFinally) {
        resolved = true;
        return promise.finally(onFinally);
      },
      [Symbol.toStringTag]: "Promise"
    };
  }
  return promise;
}
function handleTestError(test5, err) {
  test5.result ||= { state: "fail" };
  test5.result.state = "fail";
  test5.result.errors ||= [];
  test5.result.errors.push(processError(err));
}
function wrapAssertion(utils, name, fn2) {
  return function(...args) {
    if (name !== "withTest") {
      utils.flag(this, "_name", name);
    }
    if (!utils.flag(this, "soft")) {
      try {
        return fn2.apply(this, args);
      } finally {
      }
    }
    const test5 = utils.flag(this, "vitest-test");
    if (!test5) {
      throw new Error("expect.soft() can only be used inside a test");
    }
    try {
      const result = fn2.apply(this, args);
      if (result && typeof result === "object" && typeof result.then === "function") {
        return result.then(noop, (err) => {
          handleTestError(test5, err);
        });
      }
      return result;
    } catch (err) {
      handleTestError(test5, err);
    }
  };
}
var JestChaiExpect = (chai, utils) => {
  const { AssertionError: AssertionError2 } = chai;
  const customTesters = getCustomEqualityTesters();
  function def(name, fn2) {
    const addMethod2 = (n2) => {
      const softWrapper = wrapAssertion(utils, n2, fn2);
      utils.addMethod(chai.Assertion.prototype, n2, softWrapper);
      utils.addMethod(globalThis[JEST_MATCHERS_OBJECT].matchers, n2, softWrapper);
    };
    if (Array.isArray(name)) {
      name.forEach((n2) => addMethod2(n2));
    } else {
      addMethod2(name);
    }
  }
  [
    "throw",
    "throws",
    "Throw"
  ].forEach((m2) => {
    utils.overwriteMethod(chai.Assertion.prototype, m2, (_super) => {
      return function(...args) {
        const promise = utils.flag(this, "promise");
        const object2 = utils.flag(this, "object");
        const isNot = utils.flag(this, "negate");
        if (promise === "rejects") {
          utils.flag(this, "object", () => {
            throw object2;
          });
        } else if (promise === "resolves" && typeof object2 !== "function") {
          if (!isNot) {
            const message = utils.flag(this, "message") || "expected promise to throw an error, but it didn't";
            const error = { showDiff: false };
            throw new AssertionError2(message, error, utils.flag(this, "ssfi"));
          } else {
            return;
          }
        }
        _super.apply(this, args);
      };
    });
  });
  def("withTest", function(test5) {
    utils.flag(this, "vitest-test", test5);
    return this;
  });
  def("toEqual", function(expected) {
    const actual = utils.flag(this, "object");
    const equal = equals(actual, expected, [...customTesters, iterableEquality]);
    return this.assert(equal, "expected #{this} to deeply equal #{exp}", "expected #{this} to not deeply equal #{exp}", expected, actual);
  });
  def("toStrictEqual", function(expected) {
    const obj = utils.flag(this, "object");
    const equal = equals(obj, expected, [
      ...customTesters,
      iterableEquality,
      typeEquality,
      sparseArrayEquality,
      arrayBufferEquality
    ], true);
    return this.assert(equal, "expected #{this} to strictly equal #{exp}", "expected #{this} to not strictly equal #{exp}", expected, obj);
  });
  def("toBe", function(expected) {
    const actual = this._obj;
    const pass = Object.is(actual, expected);
    let deepEqualityName = "";
    if (!pass) {
      const toStrictEqualPass = equals(actual, expected, [
        ...customTesters,
        iterableEquality,
        typeEquality,
        sparseArrayEquality,
        arrayBufferEquality
      ], true);
      if (toStrictEqualPass) {
        deepEqualityName = "toStrictEqual";
      } else {
        const toEqualPass = equals(actual, expected, [...customTesters, iterableEquality]);
        if (toEqualPass) {
          deepEqualityName = "toEqual";
        }
      }
    }
    return this.assert(pass, generateToBeMessage(deepEqualityName), "expected #{this} not to be #{exp} // Object.is equality", expected, actual);
  });
  def("toMatchObject", function(expected) {
    const actual = this._obj;
    const pass = equals(actual, expected, [
      ...customTesters,
      iterableEquality,
      subsetEquality
    ]);
    const isNot = utils.flag(this, "negate");
    const { subset: actualSubset, stripped } = getObjectSubset(actual, expected, customTesters);
    if (pass && isNot || !pass && !isNot) {
      const msg = utils.getMessage(this, [
        pass,
        "expected #{this} to match object #{exp}",
        "expected #{this} to not match object #{exp}",
        expected,
        actualSubset,
        false
      ]);
      const message = stripped === 0 ? msg : `${msg}
(${stripped} matching ${stripped === 1 ? "property" : "properties"} omitted from actual)`;
      throw new AssertionError2(message, {
        showDiff: true,
        expected,
        actual: actualSubset
      });
    }
  });
  def("toMatch", function(expected) {
    const actual = this._obj;
    if (typeof actual !== "string") {
      throw new TypeError(`.toMatch() expects to receive a string, but got ${typeof actual}`);
    }
    return this.assert(typeof expected === "string" ? actual.includes(expected) : actual.match(expected), `expected #{this} to match #{exp}`, `expected #{this} not to match #{exp}`, expected, actual);
  });
  def("toContain", function(item) {
    const actual = this._obj;
    if (typeof Node !== "undefined" && actual instanceof Node) {
      if (!(item instanceof Node)) {
        throw new TypeError(`toContain() expected a DOM node as the argument, but got ${typeof item}`);
      }
      return this.assert(actual.contains(item), "expected #{this} to contain element #{exp}", "expected #{this} not to contain element #{exp}", item, actual);
    }
    if (typeof DOMTokenList !== "undefined" && actual instanceof DOMTokenList) {
      assertTypes(item, "class name", ["string"]);
      const isNot = utils.flag(this, "negate");
      const expectedClassList = isNot ? actual.value.replace(item, "").trim() : `${actual.value} ${item}`;
      return this.assert(actual.contains(item), `expected "${actual.value}" to contain "${item}"`, `expected "${actual.value}" not to contain "${item}"`, expectedClassList, actual.value);
    }
    if (typeof actual === "string" && typeof item === "string") {
      return this.assert(actual.includes(item), `expected #{this} to contain #{exp}`, `expected #{this} not to contain #{exp}`, item, actual);
    }
    if (actual != null && typeof actual !== "string") {
      utils.flag(this, "object", Array.from(actual));
    }
    return this.contain(item);
  });
  def("toContainEqual", function(expected) {
    const obj = utils.flag(this, "object");
    const index2 = Array.from(obj).findIndex((item) => {
      return equals(item, expected, customTesters);
    });
    this.assert(index2 !== -1, "expected #{this} to deep equally contain #{exp}", "expected #{this} to not deep equally contain #{exp}", expected);
  });
  def("toBeTruthy", function() {
    const obj = utils.flag(this, "object");
    this.assert(Boolean(obj), "expected #{this} to be truthy", "expected #{this} to not be truthy", true, obj);
  });
  def("toBeFalsy", function() {
    const obj = utils.flag(this, "object");
    this.assert(!obj, "expected #{this} to be falsy", "expected #{this} to not be falsy", false, obj);
  });
  def("toBeGreaterThan", function(expected) {
    const actual = this._obj;
    assertTypes(actual, "actual", ["number", "bigint"]);
    assertTypes(expected, "expected", ["number", "bigint"]);
    return this.assert(actual > expected, `expected ${actual} to be greater than ${expected}`, `expected ${actual} to be not greater than ${expected}`, expected, actual, false);
  });
  def("toBeGreaterThanOrEqual", function(expected) {
    const actual = this._obj;
    assertTypes(actual, "actual", ["number", "bigint"]);
    assertTypes(expected, "expected", ["number", "bigint"]);
    return this.assert(actual >= expected, `expected ${actual} to be greater than or equal to ${expected}`, `expected ${actual} to be not greater than or equal to ${expected}`, expected, actual, false);
  });
  def("toBeLessThan", function(expected) {
    const actual = this._obj;
    assertTypes(actual, "actual", ["number", "bigint"]);
    assertTypes(expected, "expected", ["number", "bigint"]);
    return this.assert(actual < expected, `expected ${actual} to be less than ${expected}`, `expected ${actual} to be not less than ${expected}`, expected, actual, false);
  });
  def("toBeLessThanOrEqual", function(expected) {
    const actual = this._obj;
    assertTypes(actual, "actual", ["number", "bigint"]);
    assertTypes(expected, "expected", ["number", "bigint"]);
    return this.assert(actual <= expected, `expected ${actual} to be less than or equal to ${expected}`, `expected ${actual} to be not less than or equal to ${expected}`, expected, actual, false);
  });
  def("toBeNaN", function() {
    const obj = utils.flag(this, "object");
    this.assert(Number.isNaN(obj), "expected #{this} to be NaN", "expected #{this} not to be NaN", Number.NaN, obj);
  });
  def("toBeUndefined", function() {
    const obj = utils.flag(this, "object");
    this.assert(void 0 === obj, "expected #{this} to be undefined", "expected #{this} not to be undefined", void 0, obj);
  });
  def("toBeNull", function() {
    const obj = utils.flag(this, "object");
    this.assert(obj === null, "expected #{this} to be null", "expected #{this} not to be null", null, obj);
  });
  def("toBeNullable", function() {
    const obj = utils.flag(this, "object");
    this.assert(obj == null, "expected #{this} to be nullish", "expected #{this} not to be nullish", null, obj);
  });
  def("toBeDefined", function() {
    const obj = utils.flag(this, "object");
    this.assert(typeof obj !== "undefined", "expected #{this} to be defined", "expected #{this} to be undefined", obj);
  });
  def("toBeTypeOf", function(expected) {
    const actual = typeof this._obj;
    const equal = expected === actual;
    return this.assert(equal, "expected #{this} to be type of #{exp}", "expected #{this} not to be type of #{exp}", expected, actual);
  });
  def("toBeInstanceOf", function(obj) {
    return this.instanceOf(obj);
  });
  def("toHaveLength", function(length) {
    return this.have.length(length);
  });
  def("toHaveProperty", function(...args) {
    if (Array.isArray(args[0])) {
      args[0] = args[0].map((key) => String(key).replace(/([.[\]])/g, "\\$1")).join(".");
    }
    const actual = this._obj;
    const [propertyName, expected] = args;
    const getValue = () => {
      const hasOwn = Object.hasOwn(actual, propertyName);
      if (hasOwn) {
        return {
          value: actual[propertyName],
          exists: true
        };
      }
      return utils.getPathInfo(actual, propertyName);
    };
    const { value, exists } = getValue();
    const pass = exists && (args.length === 1 || equals(expected, value, customTesters));
    const valueString = args.length === 1 ? "" : ` with value ${utils.objDisplay(expected)}`;
    return this.assert(pass, `expected #{this} to have property "${propertyName}"${valueString}`, `expected #{this} to not have property "${propertyName}"${valueString}`, expected, exists ? value : void 0);
  });
  def("toBeCloseTo", function(received, precision = 2) {
    const expected = this._obj;
    let pass = false;
    let expectedDiff = 0;
    let receivedDiff = 0;
    if (received === Number.POSITIVE_INFINITY && expected === Number.POSITIVE_INFINITY) {
      pass = true;
    } else if (received === Number.NEGATIVE_INFINITY && expected === Number.NEGATIVE_INFINITY) {
      pass = true;
    } else {
      expectedDiff = 10 ** -precision / 2;
      receivedDiff = Math.abs(expected - received);
      pass = receivedDiff < expectedDiff;
    }
    return this.assert(pass, `expected #{this} to be close to #{exp}, received difference is ${receivedDiff}, but expected ${expectedDiff}`, `expected #{this} to not be close to #{exp}, received difference is ${receivedDiff}, but expected ${expectedDiff}`, received, expected, false);
  });
  function assertIsMock(assertion) {
    if (!isMockFunction(assertion._obj)) {
      throw new TypeError(`${utils.inspect(assertion._obj)} is not a spy or a call to a spy!`);
    }
  }
  function getSpy(assertion) {
    assertIsMock(assertion);
    return assertion._obj;
  }
  def(["toHaveBeenCalledTimes", "toBeCalledTimes"], function(number) {
    const spy = getSpy(this);
    const spyName = spy.getMockName();
    const callCount = spy.mock.calls.length;
    return this.assert(callCount === number, `expected "${spyName}" to be called #{exp} times, but got ${callCount} times`, `expected "${spyName}" to not be called #{exp} times`, number, callCount, false);
  });
  def("toHaveBeenCalledOnce", function() {
    const spy = getSpy(this);
    const spyName = spy.getMockName();
    const callCount = spy.mock.calls.length;
    return this.assert(callCount === 1, `expected "${spyName}" to be called once, but got ${callCount} times`, `expected "${spyName}" to not be called once`, 1, callCount, false);
  });
  def(["toHaveBeenCalled", "toBeCalled"], function() {
    const spy = getSpy(this);
    const spyName = spy.getMockName();
    const callCount = spy.mock.calls.length;
    const called = callCount > 0;
    const isNot = utils.flag(this, "negate");
    let msg = utils.getMessage(this, [
      called,
      `expected "${spyName}" to be called at least once`,
      `expected "${spyName}" to not be called at all, but actually been called ${callCount} times`,
      true,
      called
    ]);
    if (called && isNot) {
      msg = formatCalls(spy, msg);
    }
    if (called && isNot || !called && !isNot) {
      throw new AssertionError2(msg);
    }
  });
  function equalsArgumentArray(a2, b3) {
    return a2.length === b3.length && a2.every((aItem, i3) => equals(aItem, b3[i3], [...customTesters, iterableEquality]));
  }
  def(["toHaveBeenCalledWith", "toBeCalledWith"], function(...args) {
    const spy = getSpy(this);
    const spyName = spy.getMockName();
    const pass = spy.mock.calls.some((callArg) => equalsArgumentArray(callArg, args));
    const isNot = utils.flag(this, "negate");
    const msg = utils.getMessage(this, [
      pass,
      `expected "${spyName}" to be called with arguments: #{exp}`,
      `expected "${spyName}" to not be called with arguments: #{exp}`,
      args
    ]);
    if (pass && isNot || !pass && !isNot) {
      throw new AssertionError2(formatCalls(spy, msg, args));
    }
  });
  def("toHaveBeenCalledExactlyOnceWith", function(...args) {
    const spy = getSpy(this);
    const spyName = spy.getMockName();
    const callCount = spy.mock.calls.length;
    const hasCallWithArgs = spy.mock.calls.some((callArg) => equalsArgumentArray(callArg, args));
    const pass = hasCallWithArgs && callCount === 1;
    const isNot = utils.flag(this, "negate");
    const msg = utils.getMessage(this, [
      pass,
      `expected "${spyName}" to be called once with arguments: #{exp}`,
      `expected "${spyName}" to not be called once with arguments: #{exp}`,
      args
    ]);
    if (pass && isNot || !pass && !isNot) {
      throw new AssertionError2(formatCalls(spy, msg, args));
    }
  });
  def("toHaveBeenNthCalledWith", function(times, ...args) {
    const spy = getSpy(this);
    const spyName = spy.getMockName();
    const nthCall = spy.mock.calls[times - 1];
    const callCount = spy.mock.calls.length;
    const isCalled = times <= callCount;
    this.assert(nthCall && equalsArgumentArray(nthCall, args), `expected ${ordinal(times)} "${spyName}" call to have been called with #{exp}${isCalled ? `` : `, but called only ${callCount} times`}`, `expected ${ordinal(times)} "${spyName}" call to not have been called with #{exp}`, args, nthCall, isCalled);
  });
  def("toHaveBeenLastCalledWith", function(...args) {
    const spy = getSpy(this);
    const spyName = spy.getMockName();
    const lastCall = spy.mock.calls.at(-1);
    this.assert(lastCall && equalsArgumentArray(lastCall, args), `expected last "${spyName}" call to have been called with #{exp}`, `expected last "${spyName}" call to not have been called with #{exp}`, args, lastCall);
  });
  function isSpyCalledBeforeAnotherSpy(beforeSpy, afterSpy, failIfNoFirstInvocation) {
    const beforeInvocationCallOrder = beforeSpy.mock.invocationCallOrder;
    const afterInvocationCallOrder = afterSpy.mock.invocationCallOrder;
    if (beforeInvocationCallOrder.length === 0) {
      return !failIfNoFirstInvocation;
    }
    if (afterInvocationCallOrder.length === 0) {
      return false;
    }
    return beforeInvocationCallOrder[0] < afterInvocationCallOrder[0];
  }
  def(["toHaveBeenCalledBefore"], function(resultSpy, failIfNoFirstInvocation = true) {
    const expectSpy = getSpy(this);
    if (!isMockFunction(resultSpy)) {
      throw new TypeError(`${utils.inspect(resultSpy)} is not a spy or a call to a spy`);
    }
    this.assert(isSpyCalledBeforeAnotherSpy(expectSpy, resultSpy, failIfNoFirstInvocation), `expected "${expectSpy.getMockName()}" to have been called before "${resultSpy.getMockName()}"`, `expected "${expectSpy.getMockName()}" to not have been called before "${resultSpy.getMockName()}"`, resultSpy, expectSpy);
  });
  def(["toHaveBeenCalledAfter"], function(resultSpy, failIfNoFirstInvocation = true) {
    const expectSpy = getSpy(this);
    if (!isMockFunction(resultSpy)) {
      throw new TypeError(`${utils.inspect(resultSpy)} is not a spy or a call to a spy`);
    }
    this.assert(isSpyCalledBeforeAnotherSpy(resultSpy, expectSpy, failIfNoFirstInvocation), `expected "${expectSpy.getMockName()}" to have been called after "${resultSpy.getMockName()}"`, `expected "${expectSpy.getMockName()}" to not have been called after "${resultSpy.getMockName()}"`, resultSpy, expectSpy);
  });
  def(["toThrow", "toThrowError"], function(expected) {
    if (typeof expected === "string" || typeof expected === "undefined" || expected instanceof RegExp) {
      return this.throws(expected === "" ? /^$/ : expected);
    }
    const obj = this._obj;
    const promise = utils.flag(this, "promise");
    const isNot = utils.flag(this, "negate");
    let thrown = null;
    if (promise === "rejects") {
      thrown = obj;
    } else if (promise === "resolves" && typeof obj !== "function") {
      if (!isNot) {
        const message = utils.flag(this, "message") || "expected promise to throw an error, but it didn't";
        const error = { showDiff: false };
        throw new AssertionError2(message, error, utils.flag(this, "ssfi"));
      } else {
        return;
      }
    } else {
      let isThrow = false;
      try {
        obj();
      } catch (err) {
        isThrow = true;
        thrown = err;
      }
      if (!isThrow && !isNot) {
        const message = utils.flag(this, "message") || "expected function to throw an error, but it didn't";
        const error = { showDiff: false };
        throw new AssertionError2(message, error, utils.flag(this, "ssfi"));
      }
    }
    if (typeof expected === "function") {
      const name = expected.name || expected.prototype.constructor.name;
      return this.assert(thrown && thrown instanceof expected, `expected error to be instance of ${name}`, `expected error not to be instance of ${name}`, expected, thrown);
    }
    if (isError(expected)) {
      const equal2 = equals(thrown, expected, [...customTesters, iterableEquality]);
      return this.assert(equal2, "expected a thrown error to be #{exp}", "expected a thrown error not to be #{exp}", expected, thrown);
    }
    if (typeof expected === "object" && "asymmetricMatch" in expected && typeof expected.asymmetricMatch === "function") {
      const matcher = expected;
      return this.assert(thrown && matcher.asymmetricMatch(thrown), "expected error to match asymmetric matcher", "expected error not to match asymmetric matcher", matcher, thrown);
    }
    const equal = equals(thrown, expected, [...customTesters, iterableEquality]);
    return this.assert(equal, "expected a thrown value to equal #{exp}", "expected a thrown value not to equal #{exp}", expected, thrown);
  });
  [{
    name: "toHaveResolved",
    condition: (spy) => spy.mock.settledResults.length > 0 && spy.mock.settledResults.some(({ type: type3 }) => type3 === "fulfilled"),
    action: "resolved"
  }, {
    name: ["toHaveReturned", "toReturn"],
    condition: (spy) => spy.mock.calls.length > 0 && spy.mock.results.some(({ type: type3 }) => type3 !== "throw"),
    action: "called"
  }].forEach(({ name, condition, action }) => {
    def(name, function() {
      const spy = getSpy(this);
      const spyName = spy.getMockName();
      const pass = condition(spy);
      this.assert(pass, `expected "${spyName}" to be successfully ${action} at least once`, `expected "${spyName}" to not be successfully ${action}`, pass, !pass, false);
    });
  });
  [{
    name: "toHaveResolvedTimes",
    condition: (spy, times) => spy.mock.settledResults.reduce((s2, { type: type3 }) => type3 === "fulfilled" ? ++s2 : s2, 0) === times,
    action: "resolved"
  }, {
    name: ["toHaveReturnedTimes", "toReturnTimes"],
    condition: (spy, times) => spy.mock.results.reduce((s2, { type: type3 }) => type3 === "throw" ? s2 : ++s2, 0) === times,
    action: "called"
  }].forEach(({ name, condition, action }) => {
    def(name, function(times) {
      const spy = getSpy(this);
      const spyName = spy.getMockName();
      const pass = condition(spy, times);
      this.assert(pass, `expected "${spyName}" to be successfully ${action} ${times} times`, `expected "${spyName}" to not be successfully ${action} ${times} times`, `expected resolved times: ${times}`, `received resolved times: ${pass}`, false);
    });
  });
  [{
    name: "toHaveResolvedWith",
    condition: (spy, value) => spy.mock.settledResults.some(({ type: type3, value: result }) => type3 === "fulfilled" && equals(value, result)),
    action: "resolve"
  }, {
    name: ["toHaveReturnedWith", "toReturnWith"],
    condition: (spy, value) => spy.mock.results.some(({ type: type3, value: result }) => type3 === "return" && equals(value, result)),
    action: "return"
  }].forEach(({ name, condition, action }) => {
    def(name, function(value) {
      const spy = getSpy(this);
      const pass = condition(spy, value);
      const isNot = utils.flag(this, "negate");
      if (pass && isNot || !pass && !isNot) {
        const spyName = spy.getMockName();
        const msg = utils.getMessage(this, [
          pass,
          `expected "${spyName}" to ${action} with: #{exp} at least once`,
          `expected "${spyName}" to not ${action} with: #{exp}`,
          value
        ]);
        const results = action === "return" ? spy.mock.results : spy.mock.settledResults;
        throw new AssertionError2(formatReturns(spy, results, msg, value));
      }
    });
  });
  [{
    name: "toHaveLastResolvedWith",
    condition: (spy, value) => {
      const result = spy.mock.settledResults.at(-1);
      return Boolean(result && result.type === "fulfilled" && equals(result.value, value));
    },
    action: "resolve"
  }, {
    name: "toHaveLastReturnedWith",
    condition: (spy, value) => {
      const result = spy.mock.results.at(-1);
      return Boolean(result && result.type === "return" && equals(result.value, value));
    },
    action: "return"
  }].forEach(({ name, condition, action }) => {
    def(name, function(value) {
      const spy = getSpy(this);
      const results = action === "return" ? spy.mock.results : spy.mock.settledResults;
      const result = results.at(-1);
      const spyName = spy.getMockName();
      this.assert(condition(spy, value), `expected last "${spyName}" call to ${action} #{exp}`, `expected last "${spyName}" call to not ${action} #{exp}`, value, result?.value);
    });
  });
  [{
    name: "toHaveNthResolvedWith",
    condition: (spy, index2, value) => {
      const result = spy.mock.settledResults[index2 - 1];
      return result && result.type === "fulfilled" && equals(result.value, value);
    },
    action: "resolve"
  }, {
    name: "toHaveNthReturnedWith",
    condition: (spy, index2, value) => {
      const result = spy.mock.results[index2 - 1];
      return result && result.type === "return" && equals(result.value, value);
    },
    action: "return"
  }].forEach(({ name, condition, action }) => {
    def(name, function(nthCall, value) {
      const spy = getSpy(this);
      const spyName = spy.getMockName();
      const results = action === "return" ? spy.mock.results : spy.mock.settledResults;
      const result = results[nthCall - 1];
      const ordinalCall = `${ordinal(nthCall)} call`;
      this.assert(condition(spy, nthCall, value), `expected ${ordinalCall} "${spyName}" call to ${action} #{exp}`, `expected ${ordinalCall} "${spyName}" call to not ${action} #{exp}`, value, result?.value);
    });
  });
  def("withContext", function(context) {
    for (const key in context) {
      utils.flag(this, key, context[key]);
    }
    return this;
  });
  utils.addProperty(chai.Assertion.prototype, "resolves", function __VITEST_RESOLVES__() {
    const error = new Error("resolves");
    utils.flag(this, "promise", "resolves");
    utils.flag(this, "error", error);
    const test5 = utils.flag(this, "vitest-test");
    const obj = utils.flag(this, "object");
    if (utils.flag(this, "poll")) {
      throw new SyntaxError(`expect.poll() is not supported in combination with .resolves`);
    }
    if (typeof obj?.then !== "function") {
      throw new TypeError(`You must provide a Promise to expect() when using .resolves, not '${typeof obj}'.`);
    }
    const proxy = new Proxy(this, { get: (target, key, receiver) => {
      const result = Reflect.get(target, key, receiver);
      if (typeof result !== "function") {
        return result instanceof chai.Assertion ? proxy : result;
      }
      return (...args) => {
        utils.flag(this, "_name", key);
        const promise = Promise.resolve(obj).then((value) => {
          utils.flag(this, "object", value);
          return result.call(this, ...args);
        }, (err) => {
          const _error = new AssertionError2(`promise rejected "${utils.inspect(err)}" instead of resolving`, { showDiff: false });
          _error.cause = err;
          throw _error;
        }).catch((err) => {
          if (isError(err) && error.stack) {
            err.stack = error.stack.replace(error.message, err.message);
          }
          throw err;
        });
        return recordAsyncExpect(test5, promise, createAssertionMessage(utils, this, !!args.length), error, utils.flag(this, "soft"));
      };
    } });
    return proxy;
  });
  utils.addProperty(chai.Assertion.prototype, "rejects", function __VITEST_REJECTS__() {
    const error = new Error("rejects");
    utils.flag(this, "promise", "rejects");
    utils.flag(this, "error", error);
    const test5 = utils.flag(this, "vitest-test");
    const obj = utils.flag(this, "object");
    const wrapper = typeof obj === "function" ? obj() : obj;
    if (utils.flag(this, "poll")) {
      throw new SyntaxError(`expect.poll() is not supported in combination with .rejects`);
    }
    if (typeof wrapper?.then !== "function") {
      throw new TypeError(`You must provide a Promise to expect() when using .rejects, not '${typeof wrapper}'.`);
    }
    const proxy = new Proxy(this, { get: (target, key, receiver) => {
      const result = Reflect.get(target, key, receiver);
      if (typeof result !== "function") {
        return result instanceof chai.Assertion ? proxy : result;
      }
      return (...args) => {
        utils.flag(this, "_name", key);
        const promise = Promise.resolve(wrapper).then((value) => {
          const _error = new AssertionError2(`promise resolved "${utils.inspect(value)}" instead of rejecting`, {
            showDiff: true,
            expected: new Error("rejected promise"),
            actual: value
          });
          throw _error;
        }, (err) => {
          utils.flag(this, "object", err);
          return result.call(this, ...args);
        }).catch((err) => {
          if (isError(err) && error.stack) {
            err.stack = error.stack.replace(error.message, err.message);
          }
          throw err;
        });
        return recordAsyncExpect(test5, promise, createAssertionMessage(utils, this, !!args.length), error, utils.flag(this, "soft"));
      };
    } });
    return proxy;
  });
};
function formatCalls(spy, msg, showActualCall) {
  if (spy.mock.calls.length) {
    msg += y.gray(`

Received:

${spy.mock.calls.map((callArg, i3) => {
      let methodCall = y.bold(`  ${ordinal(i3 + 1)} ${spy.getMockName()} call:

`);
      if (showActualCall) {
        methodCall += diff(showActualCall, callArg, { omitAnnotationLines: true });
      } else {
        methodCall += stringify2(callArg).split("\n").map((line) => `    ${line}`).join("\n");
      }
      methodCall += "\n";
      return methodCall;
    }).join("\n")}`);
  }
  msg += y.gray(`

Number of calls: ${y.bold(spy.mock.calls.length)}
`);
  return msg;
}
function formatReturns(spy, results, msg, showActualReturn) {
  if (results.length) {
    msg += y.gray(`

Received:

${results.map((callReturn, i3) => {
      let methodCall = y.bold(`  ${ordinal(i3 + 1)} ${spy.getMockName()} call return:

`);
      if (showActualReturn) {
        methodCall += diff(showActualReturn, callReturn.value, { omitAnnotationLines: true });
      } else {
        methodCall += stringify2(callReturn).split("\n").map((line) => `    ${line}`).join("\n");
      }
      methodCall += "\n";
      return methodCall;
    }).join("\n")}`);
  }
  msg += y.gray(`

Number of calls: ${y.bold(spy.mock.calls.length)}
`);
  return msg;
}
function getMatcherState(assertion, expect2) {
  const obj = assertion._obj;
  const isNot = utils_exports.flag(assertion, "negate");
  const promise = utils_exports.flag(assertion, "promise") || "";
  const customMessage = utils_exports.flag(assertion, "message");
  const jestUtils = {
    ...getMatcherUtils(),
    diff,
    stringify: stringify2,
    iterableEquality,
    subsetEquality
  };
  let task = utils_exports.flag(assertion, "vitest-test");
  const currentTestName = task?.fullTestName ?? "";
  if (task?.type !== "test") {
    task = void 0;
  }
  const matcherState = {
    ...getState(expect2),
    task,
    currentTestName,
    customTesters: getCustomEqualityTesters(),
    isNot,
    utils: jestUtils,
    promise,
    equals,
    suppressedErrors: [],
    soft: utils_exports.flag(assertion, "soft"),
    poll: utils_exports.flag(assertion, "poll")
  };
  return {
    state: matcherState,
    isNot,
    obj,
    customMessage
  };
}
var JestExtendError = class extends Error {
  constructor(message, actual, expected, context) {
    super(message);
    this.actual = actual;
    this.expected = expected;
    this.context = context;
  }
};
function JestExtendPlugin(c2, expect2, matchers) {
  return (_2, utils) => {
    Object.entries(matchers).forEach(([expectAssertionName, expectAssertion]) => {
      function expectWrapper(...args) {
        const { state, isNot, obj, customMessage } = getMatcherState(this, expect2);
        const result = expectAssertion.call(state, obj, ...args);
        if (result && typeof result === "object" && typeof result.then === "function") {
          const thenable = result;
          return thenable.then(({ pass: pass2, message: message2, actual: actual2, expected: expected2, meta: meta2 }) => {
            if (pass2 && isNot || !pass2 && !isNot) {
              const errorMessage = customMessage != null ? customMessage : message2();
              throw new JestExtendError(errorMessage, actual2, expected2, {
                assertionName: expectAssertionName,
                meta: meta2
              });
            }
          });
        }
        const { pass, message, actual, expected, meta } = result;
        if (pass && isNot || !pass && !isNot) {
          const errorMessage = customMessage != null ? customMessage : message();
          throw new JestExtendError(errorMessage, actual, expected, {
            assertionName: expectAssertionName,
            meta
          });
        }
      }
      const softWrapper = wrapAssertion(utils, expectAssertionName, expectWrapper);
      utils.addMethod(globalThis[JEST_MATCHERS_OBJECT].matchers, expectAssertionName, softWrapper);
      utils.addMethod(c2.Assertion.prototype, expectAssertionName, softWrapper);
      class CustomMatcher extends AsymmetricMatcher3 {
        constructor(inverse = false, ...sample) {
          super(sample, inverse);
        }
        asymmetricMatch(other) {
          const { pass } = expectAssertion.call(this.getMatcherContext(expect2), other, ...this.sample);
          return this.inverse ? !pass : pass;
        }
        toString() {
          return `${this.inverse ? "not." : ""}${expectAssertionName}`;
        }
        getExpectedType() {
          return "any";
        }
        toAsymmetricMatcher() {
          return `${this.toString()}<${this.sample.map((item) => stringify2(item)).join(", ")}>`;
        }
      }
      const customMatcher = (...sample) => new CustomMatcher(false, ...sample);
      Object.defineProperty(expect2, expectAssertionName, {
        configurable: true,
        enumerable: true,
        value: customMatcher,
        writable: true
      });
      Object.defineProperty(expect2.not, expectAssertionName, {
        configurable: true,
        enumerable: true,
        value: (...sample) => new CustomMatcher(true, ...sample),
        writable: true
      });
      Object.defineProperty(globalThis[ASYMMETRIC_MATCHERS_OBJECT], expectAssertionName, {
        configurable: true,
        enumerable: true,
        value: customMatcher,
        writable: true
      });
    });
  };
}
var JestExtend = (chai, utils) => {
  utils.addMethod(chai.expect, "extend", (expect2, expects) => {
    use(JestExtendPlugin(chai, expect2, expects));
  });
};

// ../../node_modules/.pnpm/@vitest+utils@4.1.2/node_modules/@vitest/utils/dist/offset.js
var lineSplitRE = /\r?\n/;
function positionToOffset(source, lineNumber, columnNumber) {
  const lines = source.split(lineSplitRE);
  const nl = /\r\n/.test(source) ? 2 : 1;
  let start = 0;
  if (lineNumber > lines.length) {
    return source.length;
  }
  for (let i3 = 0; i3 < lineNumber - 1; i3++) {
    start += lines[i3].length + nl;
  }
  return start + columnNumber;
}
function offsetToLineNumber(source, offset) {
  if (offset > source.length) {
    throw new Error(`offset is longer than source length! offset ${offset} > length ${source.length}`);
  }
  const lines = source.split(lineSplitRE);
  const nl = /\r\n/.test(source) ? 2 : 1;
  let counted = 0;
  let line = 0;
  for (; line < lines.length; line++) {
    const lineLength = lines[line].length + nl;
    if (counted + lineLength >= offset) {
      break;
    }
    counted += lineLength;
  }
  return line + 1;
}

// ../../node_modules/.pnpm/@vitest+snapshot@4.1.2/node_modules/@vitest/snapshot/dist/index.js
async function saveInlineSnapshots(environment, snapshots) {
  const MagicString = (await import("./magic-string.es-KVSW34UD.js")).default;
  const files = new Set(snapshots.map((i3) => i3.file));
  await Promise.all(Array.from(files).map(async (file) => {
    const snaps = snapshots.filter((i3) => i3.file === file);
    const code = await environment.readSnapshotFile(file);
    if (code == null) {
      throw new Error(`cannot read ${file} when saving inline snapshot`);
    }
    const s2 = new MagicString(code);
    for (const snap of snaps) {
      const index2 = positionToOffset(code, snap.line, snap.column);
      replaceInlineSnap(code, s2, index2, snap.snapshot);
    }
    const transformed = s2.toString();
    if (transformed !== code) {
      await environment.saveSnapshotFile(file, transformed);
    }
  }));
}
var startObjectRegex = /(?:toMatchInlineSnapshot|toThrowErrorMatchingInlineSnapshot)\s*\(\s*(?:\/\*[\s\S]*\*\/\s*|\/\/.*(?:[\n\r\u2028\u2029]\s*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]))*\{/;
function replaceObjectSnap(code, s2, index2, newSnap) {
  let _code = code.slice(index2);
  const startMatch = startObjectRegex.exec(_code);
  if (!startMatch) {
    return false;
  }
  _code = _code.slice(startMatch.index);
  let callEnd = getCallLastIndex(_code);
  if (callEnd === null) {
    return false;
  }
  callEnd += index2 + startMatch.index;
  const shapeStart = index2 + startMatch.index + startMatch[0].length;
  const shapeEnd = getObjectShapeEndIndex(code, shapeStart);
  const snap = `, ${prepareSnapString(newSnap, code, index2)}`;
  if (shapeEnd === callEnd) {
    s2.appendLeft(callEnd, snap);
  } else {
    s2.overwrite(shapeEnd, callEnd, snap);
  }
  return true;
}
function getObjectShapeEndIndex(code, index2) {
  let startBraces = 1;
  let endBraces = 0;
  while (startBraces !== endBraces && index2 < code.length) {
    const s2 = code[index2++];
    if (s2 === "{") {
      startBraces++;
    } else if (s2 === "}") {
      endBraces++;
    }
  }
  return index2;
}
function prepareSnapString(snap, source, index2) {
  const lineNumber = offsetToLineNumber(source, index2);
  const line = source.split(lineSplitRE)[lineNumber - 1];
  const indent = line.match(/^\s*/)[0] || "";
  const indentNext = indent.includes("	") ? `${indent}	` : `${indent}  `;
  const lines = snap.trim().replace(/\\/g, "\\\\").split(/\n/g);
  const isOneline = lines.length <= 1;
  const quote = "`";
  if (isOneline) {
    return `${quote}${lines.join("\n").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}${quote}`;
  }
  return `${quote}
${lines.map((i3) => i3 ? indentNext + i3 : "").join("\n").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}
${indent}${quote}`;
}
var toMatchInlineName = "toMatchInlineSnapshot";
var toThrowErrorMatchingInlineName = "toThrowErrorMatchingInlineSnapshot";
function getCodeStartingAtIndex(code, index2) {
  const indexInline = index2 - toMatchInlineName.length;
  if (code.slice(indexInline, index2) === toMatchInlineName) {
    return {
      code: code.slice(indexInline),
      index: indexInline
    };
  }
  const indexThrowInline = index2 - toThrowErrorMatchingInlineName.length;
  if (code.slice(index2 - indexThrowInline, index2) === toThrowErrorMatchingInlineName) {
    return {
      code: code.slice(index2 - indexThrowInline),
      index: index2 - indexThrowInline
    };
  }
  return {
    code: code.slice(index2),
    index: index2
  };
}
var startRegex = /(?:toMatchInlineSnapshot|toThrowErrorMatchingInlineSnapshot)\s*\(\s*(?:\/\*[\s\S]*\*\/\s*|\/\/.*(?:[\n\r\u2028\u2029]\s*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]))*[\w$]*(['"`)])/;
function replaceInlineSnap(code, s2, currentIndex, newSnap) {
  const { code: codeStartingAtIndex, index: index2 } = getCodeStartingAtIndex(code, currentIndex);
  const startMatch = startRegex.exec(codeStartingAtIndex);
  const firstKeywordMatch = /toMatchInlineSnapshot|toThrowErrorMatchingInlineSnapshot/.exec(codeStartingAtIndex);
  if (!startMatch || startMatch.index !== firstKeywordMatch?.index) {
    return replaceObjectSnap(code, s2, index2, newSnap);
  }
  const quote = startMatch[1];
  const startIndex = index2 + startMatch.index + startMatch[0].length;
  const snapString = prepareSnapString(newSnap, code, index2);
  if (quote === ")") {
    s2.appendRight(startIndex - 1, snapString);
    return true;
  }
  const quoteEndRE = new RegExp(`(?:^|[^\\\\])${quote}`);
  const endMatch = quoteEndRE.exec(code.slice(startIndex));
  if (!endMatch) {
    return false;
  }
  const endIndex = startIndex + endMatch.index + endMatch[0].length;
  s2.overwrite(startIndex - 1, endIndex, snapString);
  return true;
}
var INDENTATION_REGEX = /^([^\S\n]*)\S/m;
function stripSnapshotIndentation(inlineSnapshot) {
  const match = inlineSnapshot.match(INDENTATION_REGEX);
  if (!match || !match[1]) {
    return inlineSnapshot;
  }
  const indentation = match[1];
  const lines = inlineSnapshot.split(/\n/g);
  if (lines.length <= 2) {
    return inlineSnapshot;
  }
  if (lines[0].trim() !== "" || lines.at(-1)?.trim() !== "") {
    return inlineSnapshot;
  }
  for (let i3 = 1; i3 < lines.length - 1; i3++) {
    if (lines[i3] !== "") {
      if (lines[i3].indexOf(indentation) !== 0) {
        return inlineSnapshot;
      }
      lines[i3] = lines[i3].substring(indentation.length);
    }
  }
  lines[lines.length - 1] = "";
  inlineSnapshot = lines.join("\n");
  return inlineSnapshot;
}
async function saveRawSnapshots(environment, snapshots) {
  await Promise.all(snapshots.map(async (snap) => {
    if (!snap.readonly) {
      await environment.saveSnapshotFile(snap.file, snap.snapshot);
    }
  }));
}
function getDefaultExportFromCjs3(x2) {
  return x2 && x2.__esModule && Object.prototype.hasOwnProperty.call(x2, "default") ? x2["default"] : x2;
}
var naturalCompare$1 = { exports: {} };
var hasRequiredNaturalCompare;
function requireNaturalCompare() {
  if (hasRequiredNaturalCompare) return naturalCompare$1.exports;
  hasRequiredNaturalCompare = 1;
  var naturalCompare2 = function(a2, b3) {
    var i3, codeA, codeB = 1, posA = 0, posB = 0, alphabet = String.alphabet;
    function getCode(str, pos, code) {
      if (code) {
        for (i3 = pos; code = getCode(str, i3), code < 76 && code > 65; ) ++i3;
        return +str.slice(pos - 1, i3);
      }
      code = alphabet && alphabet.indexOf(str.charAt(pos));
      return code > -1 ? code + 76 : (code = str.charCodeAt(pos) || 0, code < 45 || code > 127) ? code : code < 46 ? 65 : code < 48 ? code - 1 : code < 58 ? code + 18 : code < 65 ? code - 11 : code < 91 ? code + 11 : code < 97 ? code - 37 : code < 123 ? code + 5 : code - 63;
    }
    if ((a2 += "") != (b3 += "")) for (; codeB; ) {
      codeA = getCode(a2, posA++);
      codeB = getCode(b3, posB++);
      if (codeA < 76 && codeB < 76 && codeA > 66 && codeB > 66) {
        codeA = getCode(a2, posA, posA);
        codeB = getCode(b3, posB, posA = i3);
        posB = i3;
      }
      if (codeA != codeB) return codeA < codeB ? -1 : 1;
    }
    return 0;
  };
  try {
    naturalCompare$1.exports = naturalCompare2;
  } catch (e3) {
    String.naturalCompare = naturalCompare2;
  }
  return naturalCompare$1.exports;
}
var naturalCompareExports = requireNaturalCompare();
var naturalCompare = /* @__PURE__ */ getDefaultExportFromCjs3(naturalCompareExports);
var serialize$12 = (val, config2, indentation, depth, refs, printer2) => {
  const name = val.getMockName();
  const nameString = name === "vi.fn()" ? "" : ` ${name}`;
  let callsString = "";
  if (val.mock.calls.length !== 0) {
    const indentationNext = indentation + config2.indent;
    callsString = ` {${config2.spacingOuter}${indentationNext}"calls": ${printer2(val.mock.calls, config2, indentationNext, depth, refs)}${config2.min ? ", " : ","}${config2.spacingOuter}${indentationNext}"results": ${printer2(val.mock.results, config2, indentationNext, depth, refs)}${config2.min ? "" : ","}${config2.spacingOuter}${indentation}}`;
  }
  return `[MockFunction${nameString}]${callsString}`;
};
var test4 = (val) => val && !!val._isMockFunction;
var plugin2 = {
  serialize: serialize$12,
  test: test4
};
var { DOMCollection: DOMCollection3, DOMElement: DOMElement3, Immutable: Immutable3, ReactElement: ReactElement3, ReactTestComponent: ReactTestComponent3, AsymmetricMatcher: AsymmetricMatcher4 } = plugins;
var PLUGINS3 = [
  ReactTestComponent3,
  ReactElement3,
  DOMElement3,
  DOMCollection3,
  Immutable3,
  AsymmetricMatcher4,
  plugin2
];
function addSerializer(plugin3) {
  PLUGINS3 = [plugin3].concat(PLUGINS3);
}
function getSerializers() {
  return PLUGINS3;
}
function testNameToKey(testName2, count) {
  return `${testName2} ${count}`;
}
function keyToTestName(key) {
  if (!/ \d+$/.test(key)) {
    throw new Error("Snapshot keys must end with a number.");
  }
  return key.replace(/ \d+$/, "");
}
function getSnapshotData(content, options) {
  const update = options.updateSnapshot;
  const data = /* @__PURE__ */ Object.create(null);
  let snapshotContents = "";
  let dirty = false;
  if (content != null) {
    try {
      snapshotContents = content;
      const populate = new Function("exports", snapshotContents);
      populate(data);
    } catch {
    }
  }
  const isInvalid = snapshotContents;
  if ((update === "all" || update === "new") && isInvalid) {
    dirty = true;
  }
  return {
    data,
    dirty
  };
}
function addExtraLineBreaks(string2) {
  return string2.includes("\n") ? `
${string2}
` : string2;
}
function removeExtraLineBreaks(string2) {
  return string2.length > 2 && string2[0] === "\n" && string2.endsWith("\n") ? string2.slice(1, -1) : string2;
}
var escapeRegex = true;
var printFunctionName = false;
function serialize2(val, indent = 2, formatOverrides = {}) {
  return normalizeNewlines(format(val, {
    escapeRegex,
    indent,
    plugins: getSerializers(),
    printFunctionName,
    ...formatOverrides
  }));
}
function escapeBacktickString(str) {
  return str.replace(/`|\\|\$\{/g, "\\$&");
}
function printBacktickString(str) {
  return `\`${escapeBacktickString(str)}\``;
}
function normalizeNewlines(string2) {
  return string2.replace(/\r\n|\r/g, "\n");
}
async function saveSnapshotFile(environment, snapshotData, snapshotPath) {
  const snapshots = Object.keys(snapshotData).sort(naturalCompare).map((key) => `exports[${printBacktickString(key)}] = ${printBacktickString(normalizeNewlines(snapshotData[key]))};`);
  const content = `${environment.getHeader()}

${snapshots.join("\n\n")}
`;
  const oldContent = await environment.readSnapshotFile(snapshotPath);
  const skipWriting = oldContent != null && oldContent === content;
  if (skipWriting) {
    return;
  }
  await environment.saveSnapshotFile(snapshotPath, content);
}
function deepMergeArray(target = [], source = []) {
  const mergedOutput = Array.from(target);
  source.forEach((sourceElement, index2) => {
    const targetElement = mergedOutput[index2];
    if (Array.isArray(target[index2])) {
      mergedOutput[index2] = deepMergeArray(target[index2], sourceElement);
    } else if (isObject(targetElement)) {
      mergedOutput[index2] = deepMergeSnapshot(target[index2], sourceElement);
    } else {
      mergedOutput[index2] = sourceElement;
    }
  });
  return mergedOutput;
}
function deepMergeSnapshot(target, source) {
  if (isObject(target) && isObject(source)) {
    const mergedOutput = { ...target };
    Object.keys(source).forEach((key) => {
      if (isObject(source[key]) && !source[key].$$typeof) {
        if (!(key in target)) {
          Object.assign(mergedOutput, { [key]: source[key] });
        } else {
          mergedOutput[key] = deepMergeSnapshot(target[key], source[key]);
        }
      } else if (Array.isArray(source[key])) {
        mergedOutput[key] = deepMergeArray(target[key], source[key]);
      } else {
        Object.assign(mergedOutput, { [key]: source[key] });
      }
    });
    return mergedOutput;
  } else if (Array.isArray(target) && Array.isArray(source)) {
    return deepMergeArray(target, source);
  }
  return target;
}
var DefaultMap = class extends Map {
  constructor(defaultFn, entries) {
    super(entries);
    this.defaultFn = defaultFn;
  }
  get(key) {
    if (!this.has(key)) {
      this.set(key, this.defaultFn(key));
    }
    return super.get(key);
  }
};
var CounterMap = class extends DefaultMap {
  constructor() {
    super(() => 0);
  }
  // compat for jest-image-snapshot https://github.com/vitest-dev/vitest/issues/7322
  // `valueOf` and `Snapshot.added` setter allows
  //   snapshotState.added = snapshotState.added + 1
  // to function as
  //   snapshotState.added.total_ = snapshotState.added.total() + 1
  _total;
  valueOf() {
    return this._total = this.total();
  }
  increment(key) {
    if (typeof this._total !== "undefined") {
      this._total++;
    }
    this.set(key, this.get(key) + 1);
  }
  total() {
    if (typeof this._total !== "undefined") {
      return this._total;
    }
    let total = 0;
    for (const x2 of this.values()) {
      total += x2;
    }
    return total;
  }
};
function isSameStackPosition(x2, y3) {
  return x2.file === y3.file && x2.column === y3.column && x2.line === y3.line;
}
var SnapshotState = class _SnapshotState {
  _counters = new CounterMap();
  _dirty;
  _updateSnapshot;
  _snapshotData;
  _initialData;
  _inlineSnapshots;
  _inlineSnapshotStacks;
  _testIdToKeys = new DefaultMap(() => []);
  _rawSnapshots;
  _uncheckedKeys;
  _snapshotFormat;
  _environment;
  _fileExists;
  expand;
  // getter/setter for jest-image-snapshot compat
  // https://github.com/vitest-dev/vitest/issues/7322
  _added = new CounterMap();
  _matched = new CounterMap();
  _unmatched = new CounterMap();
  _updated = new CounterMap();
  get added() {
    return this._added;
  }
  set added(value) {
    this._added._total = value;
  }
  get matched() {
    return this._matched;
  }
  set matched(value) {
    this._matched._total = value;
  }
  get unmatched() {
    return this._unmatched;
  }
  set unmatched(value) {
    this._unmatched._total = value;
  }
  get updated() {
    return this._updated;
  }
  set updated(value) {
    this._updated._total = value;
  }
  constructor(testFilePath, snapshotPath, snapshotContent, options) {
    this.testFilePath = testFilePath;
    this.snapshotPath = snapshotPath;
    const { data, dirty } = getSnapshotData(snapshotContent, options);
    this._fileExists = snapshotContent != null;
    this._initialData = { ...data };
    this._snapshotData = { ...data };
    this._dirty = dirty;
    this._inlineSnapshots = [];
    this._inlineSnapshotStacks = [];
    this._rawSnapshots = [];
    this._uncheckedKeys = new Set(Object.keys(this._snapshotData));
    this.expand = options.expand || false;
    this._updateSnapshot = options.updateSnapshot;
    this._snapshotFormat = {
      printBasicPrototype: false,
      escapeString: false,
      ...options.snapshotFormat
    };
    this._environment = options.snapshotEnvironment;
  }
  static async create(testFilePath, options) {
    const snapshotPath = await options.snapshotEnvironment.resolvePath(testFilePath);
    const content = await options.snapshotEnvironment.readSnapshotFile(snapshotPath);
    return new _SnapshotState(testFilePath, snapshotPath, content, options);
  }
  get environment() {
    return this._environment;
  }
  markSnapshotsAsCheckedForTest(testName2) {
    this._uncheckedKeys.forEach((uncheckedKey) => {
      if (/ \d+$| > /.test(uncheckedKey.slice(testName2.length))) {
        this._uncheckedKeys.delete(uncheckedKey);
      }
    });
  }
  clearTest(testId) {
    this._inlineSnapshots = this._inlineSnapshots.filter((s2) => s2.testId !== testId);
    this._inlineSnapshotStacks = this._inlineSnapshotStacks.filter((s2) => s2.testId !== testId);
    for (const key of this._testIdToKeys.get(testId)) {
      const name = keyToTestName(key);
      const count = this._counters.get(name);
      if (count > 0) {
        if (key in this._snapshotData || key in this._initialData) {
          this._snapshotData[key] = this._initialData[key];
        }
        this._counters.set(name, count - 1);
      }
    }
    this._testIdToKeys.delete(testId);
    this.added.delete(testId);
    this.updated.delete(testId);
    this.matched.delete(testId);
    this.unmatched.delete(testId);
  }
  _inferInlineSnapshotStack(stacks) {
    const promiseIndex = stacks.findIndex((i3) => i3.method.match(/__VITEST_(RESOLVES|REJECTS)__/));
    if (promiseIndex !== -1) {
      return stacks[promiseIndex + 3];
    }
    for (let i3 = 0; i3 < stacks.length; i3++) {
      const match = stacks[i3].method.match(/__INLINE_SNAPSHOT_OFFSET_(\d+)__/);
      if (match) {
        return stacks[i3 + Number(match[1])] ?? null;
      }
    }
    const stackIndex = stacks.findIndex((i3) => i3.method.includes("__INLINE_SNAPSHOT__"));
    return stackIndex !== -1 ? stacks[stackIndex + 2] : null;
  }
  _addSnapshot(key, receivedSerialized, options) {
    this._dirty = true;
    if (options.stack) {
      this._inlineSnapshots.push({
        snapshot: receivedSerialized,
        testId: options.testId,
        ...options.stack
      });
    } else if (options.rawSnapshot) {
      this._rawSnapshots.push({
        ...options.rawSnapshot,
        snapshot: receivedSerialized
      });
    } else {
      this._snapshotData[key] = receivedSerialized;
    }
  }
  async save() {
    const hasExternalSnapshots = Object.keys(this._snapshotData).length;
    const hasInlineSnapshots = this._inlineSnapshots.length;
    const hasRawSnapshots = this._rawSnapshots.length;
    const isEmpty = !hasExternalSnapshots && !hasInlineSnapshots && !hasRawSnapshots;
    const status = {
      deleted: false,
      saved: false
    };
    if ((this._dirty || this._uncheckedKeys.size) && !isEmpty) {
      if (hasExternalSnapshots) {
        await saveSnapshotFile(this._environment, this._snapshotData, this.snapshotPath);
        this._fileExists = true;
      }
      if (hasInlineSnapshots) {
        await saveInlineSnapshots(this._environment, this._inlineSnapshots);
      }
      if (hasRawSnapshots) {
        await saveRawSnapshots(this._environment, this._rawSnapshots);
      }
      status.saved = true;
    } else if (!hasExternalSnapshots && this._fileExists) {
      if (this._updateSnapshot === "all") {
        await this._environment.removeSnapshotFile(this.snapshotPath);
        this._fileExists = false;
      }
      status.deleted = true;
    }
    return status;
  }
  getUncheckedCount() {
    return this._uncheckedKeys.size || 0;
  }
  getUncheckedKeys() {
    return Array.from(this._uncheckedKeys);
  }
  removeUncheckedKeys() {
    if (this._updateSnapshot === "all" && this._uncheckedKeys.size) {
      this._dirty = true;
      this._uncheckedKeys.forEach((key) => delete this._snapshotData[key]);
      this._uncheckedKeys.clear();
    }
  }
  match({ testId, testName: testName2, received, key, inlineSnapshot, isInline, error, rawSnapshot }) {
    this._counters.increment(testName2);
    const count = this._counters.get(testName2);
    if (!key) {
      key = testNameToKey(testName2, count);
    }
    this._testIdToKeys.get(testId).push(key);
    if (!(isInline && this._snapshotData[key] !== void 0)) {
      this._uncheckedKeys.delete(key);
    }
    let receivedSerialized = rawSnapshot && typeof received === "string" ? received : serialize2(received, void 0, this._snapshotFormat);
    if (!rawSnapshot) {
      receivedSerialized = addExtraLineBreaks(receivedSerialized);
    }
    if (rawSnapshot) {
      if (rawSnapshot.content && rawSnapshot.content.match(/\r\n/) && !receivedSerialized.match(/\r\n/)) {
        rawSnapshot.content = normalizeNewlines(rawSnapshot.content);
      }
    }
    const expected = isInline ? inlineSnapshot : rawSnapshot ? rawSnapshot.content : this._snapshotData[key];
    const expectedTrimmed = rawSnapshot ? expected : expected?.trim();
    const pass = expectedTrimmed === (rawSnapshot ? receivedSerialized : receivedSerialized.trim());
    const hasSnapshot = expected !== void 0;
    const snapshotIsPersisted = isInline || this._fileExists || rawSnapshot && rawSnapshot.content != null;
    if (pass && !isInline && !rawSnapshot) {
      this._snapshotData[key] = receivedSerialized;
    }
    let stack;
    if (isInline) {
      const stacks = parseErrorStacktrace(error || new Error("snapshot"), { ignoreStackEntries: [] });
      const _stack = this._inferInlineSnapshotStack(stacks);
      if (!_stack) {
        throw new Error(`@vitest/snapshot: Couldn't infer stack frame for inline snapshot.
${JSON.stringify(stacks)}`);
      }
      stack = this.environment.processStackTrace?.(_stack) || _stack;
      stack.column--;
      const snapshotsWithSameStack = this._inlineSnapshotStacks.filter((s2) => isSameStackPosition(s2, stack));
      if (snapshotsWithSameStack.length > 0) {
        this._inlineSnapshots = this._inlineSnapshots.filter((s2) => !isSameStackPosition(s2, stack));
        const differentSnapshot = snapshotsWithSameStack.find((s2) => s2.snapshot !== receivedSerialized);
        if (differentSnapshot) {
          throw Object.assign(new Error("toMatchInlineSnapshot with different snapshots cannot be called at the same location"), {
            actual: receivedSerialized,
            expected: differentSnapshot.snapshot
          });
        }
      }
      this._inlineSnapshotStacks.push({
        ...stack,
        testId,
        snapshot: receivedSerialized
      });
    }
    if (hasSnapshot && this._updateSnapshot === "all" || (!hasSnapshot || !snapshotIsPersisted) && (this._updateSnapshot === "new" || this._updateSnapshot === "all")) {
      if (this._updateSnapshot === "all") {
        if (!pass) {
          if (hasSnapshot) {
            this.updated.increment(testId);
          } else {
            this.added.increment(testId);
          }
          this._addSnapshot(key, receivedSerialized, {
            stack,
            testId,
            rawSnapshot
          });
        } else {
          this.matched.increment(testId);
        }
      } else {
        this._addSnapshot(key, receivedSerialized, {
          stack,
          testId,
          rawSnapshot
        });
        this.added.increment(testId);
      }
      return {
        actual: "",
        count,
        expected: "",
        key,
        pass: true
      };
    } else {
      if (!pass) {
        this.unmatched.increment(testId);
        return {
          actual: rawSnapshot ? receivedSerialized : removeExtraLineBreaks(receivedSerialized),
          count,
          expected: expectedTrimmed !== void 0 ? rawSnapshot ? expectedTrimmed : removeExtraLineBreaks(expectedTrimmed) : void 0,
          key,
          pass: false
        };
      } else {
        this.matched.increment(testId);
        return {
          actual: "",
          count,
          expected: "",
          key,
          pass: true
        };
      }
    }
  }
  async pack() {
    const snapshot = {
      filepath: this.testFilePath,
      added: 0,
      fileDeleted: false,
      matched: 0,
      unchecked: 0,
      uncheckedKeys: [],
      unmatched: 0,
      updated: 0
    };
    const uncheckedCount = this.getUncheckedCount();
    const uncheckedKeys = this.getUncheckedKeys();
    if (uncheckedCount) {
      this.removeUncheckedKeys();
    }
    const status = await this.save();
    snapshot.fileDeleted = status.deleted;
    snapshot.added = this.added.total();
    snapshot.matched = this.matched.total();
    snapshot.unmatched = this.unmatched.total();
    snapshot.updated = this.updated.total();
    snapshot.unchecked = !status.deleted ? uncheckedCount : 0;
    snapshot.uncheckedKeys = Array.from(uncheckedKeys);
    return snapshot;
  }
};
function createMismatchError(message, expand, actual, expected) {
  const error = new Error(message);
  Object.defineProperty(error, "actual", {
    value: actual,
    enumerable: true,
    configurable: true,
    writable: true
  });
  Object.defineProperty(error, "expected", {
    value: expected,
    enumerable: true,
    configurable: true,
    writable: true
  });
  Object.defineProperty(error, "diffOptions", { value: { expand } });
  return error;
}
var SnapshotClient = class {
  snapshotStateMap = /* @__PURE__ */ new Map();
  constructor(options = {}) {
    this.options = options;
  }
  async setup(filepath, options) {
    if (this.snapshotStateMap.has(filepath)) {
      return;
    }
    this.snapshotStateMap.set(filepath, await SnapshotState.create(filepath, options));
  }
  async finish(filepath) {
    const state = this.getSnapshotState(filepath);
    const result = await state.pack();
    this.snapshotStateMap.delete(filepath);
    return result;
  }
  skipTest(filepath, testName2) {
    const state = this.getSnapshotState(filepath);
    state.markSnapshotsAsCheckedForTest(testName2);
  }
  clearTest(filepath, testId) {
    const state = this.getSnapshotState(filepath);
    state.clearTest(testId);
  }
  getSnapshotState(filepath) {
    const state = this.snapshotStateMap.get(filepath);
    if (!state) {
      throw new Error(`The snapshot state for '${filepath}' is not found. Did you call 'SnapshotClient.setup()'?`);
    }
    return state;
  }
  assert(options) {
    const { filepath, name, testId = name, message, isInline = false, properties, inlineSnapshot, error, errorMessage, rawSnapshot } = options;
    let { received } = options;
    if (!filepath) {
      throw new Error("Snapshot cannot be used outside of test");
    }
    const snapshotState = this.getSnapshotState(filepath);
    if (typeof properties === "object") {
      if (typeof received !== "object" || !received) {
        throw new Error("Received value must be an object when the matcher has properties");
      }
      try {
        const pass2 = this.options.isEqual?.(received, properties) ?? false;
        if (!pass2) {
          throw createMismatchError("Snapshot properties mismatched", snapshotState.expand, received, properties);
        } else {
          received = deepMergeSnapshot(received, properties);
        }
      } catch (err) {
        err.message = errorMessage || "Snapshot mismatched";
        throw err;
      }
    }
    const testName2 = [name, ...message ? [message] : []].join(" > ");
    const { actual, expected, key, pass } = snapshotState.match({
      testId,
      testName: testName2,
      received,
      isInline,
      error,
      inlineSnapshot,
      rawSnapshot
    });
    if (!pass) {
      throw createMismatchError(`Snapshot \`${key || "unknown"}\` mismatched`, snapshotState.expand, rawSnapshot ? actual : actual?.trim(), rawSnapshot ? expected : expected?.trim());
    }
  }
  async assertRaw(options) {
    if (!options.rawSnapshot) {
      throw new Error("Raw snapshot is required");
    }
    const { filepath, rawSnapshot } = options;
    if (rawSnapshot.content == null) {
      if (!filepath) {
        throw new Error("Snapshot cannot be used outside of test");
      }
      const snapshotState = this.getSnapshotState(filepath);
      options.filepath ||= filepath;
      rawSnapshot.file = await snapshotState.environment.resolveRawPath(filepath, rawSnapshot.file);
      rawSnapshot.content = await snapshotState.environment.readSnapshotFile(rawSnapshot.file) ?? void 0;
    }
    return this.assert(options);
  }
  clear() {
    this.snapshotStateMap.clear();
  }
};

// ../../node_modules/.pnpm/vitest@4.1.2_@opentelemetry+api@1.9.0_@types+node@25.5.1_vite@7.3.1_@types+node@25.5.1__db5ed10e0f1f36c7c04da8d42b6dbc45/node_modules/vitest/dist/chunks/_commonjsHelpers.D26ty3Ew.js
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};

// ../../node_modules/.pnpm/vitest@4.1.2_@opentelemetry+api@1.9.0_@types+node@25.5.1_vite@7.3.1_@types+node@25.5.1__db5ed10e0f1f36c7c04da8d42b6dbc45/node_modules/vitest/dist/chunks/rpc.MzXet3jl.js
var RealDate = Date;
var now2 = null;
var MockDate = class _MockDate extends RealDate {
  constructor(y3, m2, d3, h2, M2, s2, ms) {
    super();
    let date;
    switch (arguments.length) {
      case 0:
        if (now2 !== null) date = new RealDate(now2.valueOf());
        else date = new RealDate();
        break;
      case 1:
        date = new RealDate(y3);
        break;
      default:
        d3 = typeof d3 === "undefined" ? 1 : d3;
        h2 = h2 || 0;
        M2 = M2 || 0;
        s2 = s2 || 0;
        ms = ms || 0;
        date = new RealDate(y3, m2, d3, h2, M2, s2, ms);
        break;
    }
    Object.setPrototypeOf(date, _MockDate.prototype);
    return date;
  }
};
MockDate.UTC = RealDate.UTC;
MockDate.now = function() {
  return new MockDate().valueOf();
};
MockDate.parse = function(dateString) {
  return RealDate.parse(dateString);
};
MockDate.toString = function() {
  return RealDate.toString();
};
function mockDate(date) {
  const dateObj = new RealDate(date.valueOf());
  if (Number.isNaN(dateObj.getTime())) throw new TypeError(`mockdate: The time set is an invalid date: ${date}`);
  globalThis.Date = MockDate;
  now2 = dateObj.valueOf();
}
function resetDate() {
  globalThis.Date = RealDate;
}
var { get: get2 } = Reflect;

// ../../node_modules/.pnpm/vitest@4.1.2_@opentelemetry+api@1.9.0_@types+node@25.5.1_vite@7.3.1_@types+node@25.5.1__db5ed10e0f1f36c7c04da8d42b6dbc45/node_modules/vitest/dist/chunks/test.p_J6dB8a.js
var unsupported = [
  "matchSnapshot",
  "toMatchSnapshot",
  "toMatchInlineSnapshot",
  "toThrowErrorMatchingSnapshot",
  "toThrowErrorMatchingInlineSnapshot",
  "throws",
  "Throw",
  "throw",
  "toThrow",
  "toThrowError"
];
function throwWithCause(error, source) {
  if (error.cause == null) error.cause = /* @__PURE__ */ new Error("Matcher did not succeed in time.");
  throw copyStackTrace$1(error, source);
}
function createExpectPoll(expect2) {
  return function poll(fn2, options = {}) {
    const defaults = getWorkerState().config.expect?.poll ?? {};
    const { interval = defaults.interval ?? 50, timeout = defaults.timeout ?? 1e3, message } = options;
    const assertion = expect2(null, message).withContext({ poll: true });
    fn2 = fn2.bind(assertion);
    const test5 = chai_exports.util.flag(assertion, "vitest-test");
    if (!test5) throw new Error("expect.poll() must be called inside a test");
    const proxy = new Proxy(assertion, { get(target, key, receiver) {
      const assertionFunction = Reflect.get(target, key, receiver);
      if (typeof assertionFunction !== "function") return assertionFunction instanceof chai_exports.Assertion ? proxy : assertionFunction;
      if (key === "assert") return assertionFunction;
      if (typeof key === "string" && unsupported.includes(key)) throw new SyntaxError(`expect.poll() is not supported in combination with .${key}(). Use vi.waitFor() if your assertion condition is unstable.`);
      return function(...args) {
        const STACK_TRACE_ERROR = /* @__PURE__ */ new Error("STACK_TRACE_ERROR");
        const promise = async () => {
          const { setTimeout: setTimeout3, clearTimeout: clearTimeout3 } = getSafeTimers();
          let executionPhase = "fn";
          let hasTimedOut = false;
          const timerId = setTimeout3(() => {
            hasTimedOut = true;
          }, timeout);
          chai_exports.util.flag(assertion, "_name", key);
          const onSettled = chai_exports.util.flag(assertion, "_poll.onSettled");
          try {
            while (true) {
              const isLastAttempt = hasTimedOut;
              if (isLastAttempt) chai_exports.util.flag(assertion, "_isLastPollAttempt", true);
              try {
                executionPhase = "fn";
                const obj = await fn2();
                chai_exports.util.flag(assertion, "object", obj);
                executionPhase = "assertion";
                const output = await assertionFunction.call(assertion, ...args);
                await onSettled?.({
                  assertion,
                  status: "pass"
                });
                return output;
              } catch (err) {
                if (isLastAttempt || executionPhase === "assertion" && chai_exports.util.flag(assertion, "_poll.assert_once")) {
                  await onSettled?.({
                    assertion,
                    status: "fail"
                  });
                  throwWithCause(err, STACK_TRACE_ERROR);
                }
                await delay(interval, setTimeout3);
              }
            }
          } finally {
            clearTimeout3(timerId);
          }
        };
        let awaited = false;
        test5.onFinished ??= [];
        test5.onFinished.push(() => {
          if (!awaited) {
            const negated = chai_exports.util.flag(assertion, "negate") ? "not." : "";
            const assertionString = `expect.${chai_exports.util.flag(assertion, "_poll.element") ? "element(locator)" : "poll(assertion)"}.${negated}${String(key)}()`;
            throw copyStackTrace$1(/* @__PURE__ */ new Error(`${assertionString} was not awaited. This assertion is asynchronous and must be awaited; otherwise, it is not executed to avoid unhandled rejections:

await ${assertionString}
`), STACK_TRACE_ERROR);
          }
        });
        let resultPromise;
        return {
          then(onFulfilled, onRejected) {
            awaited = true;
            return (resultPromise ||= promise()).then(onFulfilled, onRejected);
          },
          catch(onRejected) {
            awaited = true;
            return (resultPromise ||= promise()).catch(onRejected);
          },
          finally(onFinally) {
            awaited = true;
            return (resultPromise ||= promise()).finally(onFinally);
          },
          [Symbol.toStringTag]: "Promise"
        };
      };
    } });
    return proxy;
  };
}
function copyStackTrace$1(target, source) {
  if (source.stack !== void 0) target.stack = source.stack.replace(source.message, target.message);
  return target;
}
var _client;
function getSnapshotClient() {
  if (!_client) _client = new SnapshotClient({ isEqual: (received, expected) => {
    return equals(received, expected, [iterableEquality, subsetEquality]);
  } });
  return _client;
}
function getError(expected, promise) {
  if (typeof expected !== "function") {
    if (!promise) throw new Error(`expected must be a function, received ${typeof expected}`);
    return expected;
  }
  try {
    expected();
  } catch (e3) {
    return e3;
  }
  throw new Error("snapshot function didn't throw");
}
function getTestNames(test5) {
  return {
    filepath: test5.file.filepath,
    name: getNames(test5).slice(1).join(" > "),
    testId: test5.id
  };
}
var SnapshotPlugin = (chai, utils) => {
  function getTest(assertionName, obj) {
    const test5 = utils.flag(obj, "vitest-test");
    if (!test5) throw new Error(`'${assertionName}' cannot be used without test context`);
    return test5;
  }
  for (const key of ["matchSnapshot", "toMatchSnapshot"]) utils.addMethod(chai.Assertion.prototype, key, wrapAssertion(utils, key, function(properties, message) {
    utils.flag(this, "_name", key);
    if (utils.flag(this, "negate")) throw new Error(`${key} cannot be used with "not"`);
    const expected = utils.flag(this, "object");
    const test5 = getTest(key, this);
    if (typeof properties === "string" && typeof message === "undefined") {
      message = properties;
      properties = void 0;
    }
    const errorMessage = utils.flag(this, "message");
    getSnapshotClient().assert({
      received: expected,
      message,
      isInline: false,
      properties,
      errorMessage,
      ...getTestNames(test5)
    });
  }));
  utils.addMethod(chai.Assertion.prototype, "toMatchFileSnapshot", function(file, message) {
    utils.flag(this, "_name", "toMatchFileSnapshot");
    if (utils.flag(this, "negate")) throw new Error('toMatchFileSnapshot cannot be used with "not"');
    const error = /* @__PURE__ */ new Error("resolves");
    const expected = utils.flag(this, "object");
    const test5 = getTest("toMatchFileSnapshot", this);
    const errorMessage = utils.flag(this, "message");
    return recordAsyncExpect(test5, getSnapshotClient().assertRaw({
      received: expected,
      message,
      isInline: false,
      rawSnapshot: { file },
      errorMessage,
      ...getTestNames(test5)
    }), createAssertionMessage(utils, this, true), error, utils.flag(this, "soft"));
  });
  utils.addMethod(chai.Assertion.prototype, "toMatchInlineSnapshot", wrapAssertion(utils, "toMatchInlineSnapshot", function __INLINE_SNAPSHOT_OFFSET_3__(properties, inlineSnapshot, message) {
    utils.flag(this, "_name", "toMatchInlineSnapshot");
    if (utils.flag(this, "negate")) throw new Error('toMatchInlineSnapshot cannot be used with "not"');
    const test5 = getTest("toMatchInlineSnapshot", this);
    const expected = utils.flag(this, "object");
    const error = utils.flag(this, "error");
    if (typeof properties === "string") {
      message = inlineSnapshot;
      inlineSnapshot = properties;
      properties = void 0;
    }
    if (inlineSnapshot) inlineSnapshot = stripSnapshotIndentation(inlineSnapshot);
    const errorMessage = utils.flag(this, "message");
    getSnapshotClient().assert({
      received: expected,
      message,
      isInline: true,
      properties,
      inlineSnapshot,
      error,
      errorMessage,
      ...getTestNames(test5)
    });
  }));
  utils.addMethod(chai.Assertion.prototype, "toThrowErrorMatchingSnapshot", wrapAssertion(utils, "toThrowErrorMatchingSnapshot", function(properties, message) {
    utils.flag(this, "_name", "toThrowErrorMatchingSnapshot");
    if (utils.flag(this, "negate")) throw new Error('toThrowErrorMatchingSnapshot cannot be used with "not"');
    const expected = utils.flag(this, "object");
    const test5 = getTest("toThrowErrorMatchingSnapshot", this);
    const promise = utils.flag(this, "promise");
    const errorMessage = utils.flag(this, "message");
    getSnapshotClient().assert({
      received: getError(expected, promise),
      message,
      errorMessage,
      ...getTestNames(test5)
    });
  }));
  utils.addMethod(chai.Assertion.prototype, "toThrowErrorMatchingInlineSnapshot", wrapAssertion(utils, "toThrowErrorMatchingInlineSnapshot", function __INLINE_SNAPSHOT_OFFSET_3__(inlineSnapshot, message) {
    if (utils.flag(this, "negate")) throw new Error('toThrowErrorMatchingInlineSnapshot cannot be used with "not"');
    const test5 = getTest("toThrowErrorMatchingInlineSnapshot", this);
    const expected = utils.flag(this, "object");
    const error = utils.flag(this, "error");
    const promise = utils.flag(this, "promise");
    const errorMessage = utils.flag(this, "message");
    if (inlineSnapshot) inlineSnapshot = stripSnapshotIndentation(inlineSnapshot);
    getSnapshotClient().assert({
      received: getError(expected, promise),
      message,
      inlineSnapshot,
      isInline: true,
      error,
      errorMessage,
      ...getTestNames(test5)
    });
  }));
  utils.addMethod(chai.expect, "addSnapshotSerializer", addSerializer);
};
chai_exports.use(JestExtend);
chai_exports.use(JestChaiExpect);
chai_exports.use(ChaiStyleAssertions);
chai_exports.use(SnapshotPlugin);
chai_exports.use(JestAsymmetricMatchers);
function createExpect(test5) {
  const expect2 = ((value, message) => {
    const { assertionCalls } = getState(expect2);
    setState({ assertionCalls: assertionCalls + 1 }, expect2);
    const assert5 = chai_exports.expect(value, message);
    const _test2 = test5 || getCurrentTest();
    if (_test2)
      return assert5.withTest(_test2);
    else return assert5;
  });
  Object.assign(expect2, chai_exports.expect);
  Object.assign(expect2, globalThis[ASYMMETRIC_MATCHERS_OBJECT]);
  expect2.getState = () => getState(expect2);
  expect2.setState = (state) => setState(state, expect2);
  const globalState = getState(globalThis[GLOBAL_EXPECT]) || {};
  setState({
    ...globalState,
    assertionCalls: 0,
    isExpectingAssertions: false,
    isExpectingAssertionsError: null,
    expectedAssertionsNumber: null,
    expectedAssertionsNumberErrorGen: null,
    get testPath() {
      return getWorkerState().filepath;
    },
    currentTestName: test5 ? test5.fullTestName ?? "" : globalState.currentTestName
  }, expect2);
  expect2.assert = chai_exports.assert;
  expect2.extend = (matchers) => chai_exports.expect.extend(expect2, matchers);
  expect2.addEqualityTesters = (customTesters) => addCustomEqualityTesters(customTesters);
  expect2.soft = (...args) => {
    return expect2(...args).withContext({ soft: true });
  };
  expect2.poll = createExpectPoll(expect2);
  expect2.unreachable = (message) => {
    chai_exports.assert.fail(`expected${message ? ` "${message}" ` : " "}not to be reached`);
  };
  function assertions(expected) {
    const errorGen = () => /* @__PURE__ */ new Error(`expected number of assertions to be ${expected}, but got ${expect2.getState().assertionCalls}`);
    if (Error.captureStackTrace) Error.captureStackTrace(errorGen(), assertions);
    expect2.setState({
      expectedAssertionsNumber: expected,
      expectedAssertionsNumberErrorGen: errorGen
    });
  }
  function hasAssertions() {
    const error = /* @__PURE__ */ new Error("expected any number of assertion, but got none");
    if (Error.captureStackTrace) Error.captureStackTrace(error, hasAssertions);
    expect2.setState({
      isExpectingAssertions: true,
      isExpectingAssertionsError: error
    });
  }
  chai_exports.util.addMethod(expect2, "assertions", assertions);
  chai_exports.util.addMethod(expect2, "hasAssertions", hasAssertions);
  expect2.extend(customMatchers);
  return expect2;
}
var globalExpect = createExpect();
Object.defineProperty(globalThis, GLOBAL_EXPECT, {
  value: globalExpect,
  writable: true,
  configurable: true
});
var assert4 = chai_exports.assert;
var should2 = chai_exports.should;
var fakeTimersSrc = {};
var global2;
var hasRequiredGlobal;
function requireGlobal() {
  if (hasRequiredGlobal) return global2;
  hasRequiredGlobal = 1;
  var globalObject;
  if (typeof commonjsGlobal !== "undefined") {
    globalObject = commonjsGlobal;
  } else if (typeof window !== "undefined") {
    globalObject = window;
  } else {
    globalObject = self;
  }
  global2 = globalObject;
  return global2;
}
var throwsOnProto_1;
var hasRequiredThrowsOnProto;
function requireThrowsOnProto() {
  if (hasRequiredThrowsOnProto) return throwsOnProto_1;
  hasRequiredThrowsOnProto = 1;
  let throwsOnProto;
  try {
    const object2 = {};
    object2.__proto__;
    throwsOnProto = false;
  } catch (_2) {
    throwsOnProto = true;
  }
  throwsOnProto_1 = throwsOnProto;
  return throwsOnProto_1;
}
var copyPrototypeMethods;
var hasRequiredCopyPrototypeMethods;
function requireCopyPrototypeMethods() {
  if (hasRequiredCopyPrototypeMethods) return copyPrototypeMethods;
  hasRequiredCopyPrototypeMethods = 1;
  var call2 = Function.call;
  var throwsOnProto = requireThrowsOnProto();
  var disallowedProperties = [
    // ignore size because it throws from Map
    "size",
    "caller",
    "callee",
    "arguments"
  ];
  if (throwsOnProto) {
    disallowedProperties.push("__proto__");
  }
  copyPrototypeMethods = function copyPrototypeMethods2(prototype) {
    return Object.getOwnPropertyNames(prototype).reduce(
      function(result, name) {
        if (disallowedProperties.includes(name)) {
          return result;
        }
        if (typeof prototype[name] !== "function") {
          return result;
        }
        result[name] = call2.bind(prototype[name]);
        return result;
      },
      /* @__PURE__ */ Object.create(null)
    );
  };
  return copyPrototypeMethods;
}
var array;
var hasRequiredArray;
function requireArray() {
  if (hasRequiredArray) return array;
  hasRequiredArray = 1;
  var copyPrototype = requireCopyPrototypeMethods();
  array = copyPrototype(Array.prototype);
  return array;
}
var calledInOrder_1;
var hasRequiredCalledInOrder;
function requireCalledInOrder() {
  if (hasRequiredCalledInOrder) return calledInOrder_1;
  hasRequiredCalledInOrder = 1;
  var every2 = requireArray().every;
  function hasCallsLeft(callMap, spy) {
    if (callMap[spy.id] === void 0) {
      callMap[spy.id] = 0;
    }
    return callMap[spy.id] < spy.callCount;
  }
  function checkAdjacentCalls(callMap, spy, index2, spies) {
    var calledBeforeNext = true;
    if (index2 !== spies.length - 1) {
      calledBeforeNext = spy.calledBefore(spies[index2 + 1]);
    }
    if (hasCallsLeft(callMap, spy) && calledBeforeNext) {
      callMap[spy.id] += 1;
      return true;
    }
    return false;
  }
  function calledInOrder(spies) {
    var callMap = {};
    var _spies = arguments.length > 1 ? arguments : spies;
    return every2(_spies, checkAdjacentCalls.bind(null, callMap));
  }
  calledInOrder_1 = calledInOrder;
  return calledInOrder_1;
}
var className_1;
var hasRequiredClassName;
function requireClassName() {
  if (hasRequiredClassName) return className_1;
  hasRequiredClassName = 1;
  function className(value) {
    const name = value.constructor && value.constructor.name;
    return name || null;
  }
  className_1 = className;
  return className_1;
}
var deprecated = {};
var hasRequiredDeprecated;
function requireDeprecated() {
  if (hasRequiredDeprecated) return deprecated;
  hasRequiredDeprecated = 1;
  (function(exports$1) {
    exports$1.wrap = function(func, msg) {
      var wrapped = function() {
        exports$1.printWarning(msg);
        return func.apply(this, arguments);
      };
      if (func.prototype) {
        wrapped.prototype = func.prototype;
      }
      return wrapped;
    };
    exports$1.defaultMsg = function(packageName, funcName) {
      return `${packageName}.${funcName} is deprecated and will be removed from the public API in a future version of ${packageName}.`;
    };
    exports$1.printWarning = function(msg) {
      if (typeof process === "object" && process.emitWarning) {
        process.emitWarning(msg);
      } else if (console.info) {
        console.info(msg);
      } else {
        console.log(msg);
      }
    };
  })(deprecated);
  return deprecated;
}
var every;
var hasRequiredEvery;
function requireEvery() {
  if (hasRequiredEvery) return every;
  hasRequiredEvery = 1;
  every = function every2(obj, fn2) {
    var pass = true;
    try {
      obj.forEach(function() {
        if (!fn2.apply(this, arguments)) {
          throw new Error();
        }
      });
    } catch (e3) {
      pass = false;
    }
    return pass;
  };
  return every;
}
var functionName;
var hasRequiredFunctionName;
function requireFunctionName() {
  if (hasRequiredFunctionName) return functionName;
  hasRequiredFunctionName = 1;
  functionName = function functionName2(func) {
    if (!func) {
      return "";
    }
    try {
      return func.displayName || func.name || // Use function decomposition as a last resort to get function
      // name. Does not rely on function decomposition to work - if it
      // doesn't debugging will be slightly less informative
      // (i.e. toString will say 'spy' rather than 'myFunc').
      (String(func).match(/function ([^\s(]+)/) || [])[1];
    } catch (e3) {
      return "";
    }
  };
  return functionName;
}
var orderByFirstCall_1;
var hasRequiredOrderByFirstCall;
function requireOrderByFirstCall() {
  if (hasRequiredOrderByFirstCall) return orderByFirstCall_1;
  hasRequiredOrderByFirstCall = 1;
  var sort2 = requireArray().sort;
  var slice = requireArray().slice;
  function comparator(a2, b3) {
    var aCall = a2.getCall(0);
    var bCall = b3.getCall(0);
    var aId = aCall && aCall.callId || -1;
    var bId = bCall && bCall.callId || -1;
    return aId < bId ? -1 : 1;
  }
  function orderByFirstCall(spies) {
    return sort2(slice(spies), comparator);
  }
  orderByFirstCall_1 = orderByFirstCall;
  return orderByFirstCall_1;
}
var _function;
var hasRequired_function;
function require_function() {
  if (hasRequired_function) return _function;
  hasRequired_function = 1;
  var copyPrototype = requireCopyPrototypeMethods();
  _function = copyPrototype(Function.prototype);
  return _function;
}
var map;
var hasRequiredMap;
function requireMap() {
  if (hasRequiredMap) return map;
  hasRequiredMap = 1;
  var copyPrototype = requireCopyPrototypeMethods();
  map = copyPrototype(Map.prototype);
  return map;
}
var object;
var hasRequiredObject;
function requireObject() {
  if (hasRequiredObject) return object;
  hasRequiredObject = 1;
  var copyPrototype = requireCopyPrototypeMethods();
  object = copyPrototype(Object.prototype);
  return object;
}
var set2;
var hasRequiredSet;
function requireSet() {
  if (hasRequiredSet) return set2;
  hasRequiredSet = 1;
  var copyPrototype = requireCopyPrototypeMethods();
  set2 = copyPrototype(Set.prototype);
  return set2;
}
var string;
var hasRequiredString;
function requireString() {
  if (hasRequiredString) return string;
  hasRequiredString = 1;
  var copyPrototype = requireCopyPrototypeMethods();
  string = copyPrototype(String.prototype);
  return string;
}
var prototypes;
var hasRequiredPrototypes;
function requirePrototypes() {
  if (hasRequiredPrototypes) return prototypes;
  hasRequiredPrototypes = 1;
  prototypes = {
    array: requireArray(),
    function: require_function(),
    map: requireMap(),
    object: requireObject(),
    set: requireSet(),
    string: requireString()
  };
  return prototypes;
}
var typeDetect$1 = { exports: {} };
var typeDetect = typeDetect$1.exports;
var hasRequiredTypeDetect;
function requireTypeDetect() {
  if (hasRequiredTypeDetect) return typeDetect$1.exports;
  hasRequiredTypeDetect = 1;
  (function(module, exports$1) {
    (function(global3, factory) {
      module.exports = factory();
    })(typeDetect, (function() {
      var promiseExists = typeof Promise === "function";
      var globalObject = typeof self === "object" ? self : commonjsGlobal;
      var symbolExists = typeof Symbol !== "undefined";
      var mapExists = typeof Map !== "undefined";
      var setExists = typeof Set !== "undefined";
      var weakMapExists = typeof WeakMap !== "undefined";
      var weakSetExists = typeof WeakSet !== "undefined";
      var dataViewExists = typeof DataView !== "undefined";
      var symbolIteratorExists = symbolExists && typeof Symbol.iterator !== "undefined";
      var symbolToStringTagExists = symbolExists && typeof Symbol.toStringTag !== "undefined";
      var setEntriesExists = setExists && typeof Set.prototype.entries === "function";
      var mapEntriesExists = mapExists && typeof Map.prototype.entries === "function";
      var setIteratorPrototype = setEntriesExists && Object.getPrototypeOf((/* @__PURE__ */ new Set()).entries());
      var mapIteratorPrototype = mapEntriesExists && Object.getPrototypeOf((/* @__PURE__ */ new Map()).entries());
      var arrayIteratorExists = symbolIteratorExists && typeof Array.prototype[Symbol.iterator] === "function";
      var arrayIteratorPrototype = arrayIteratorExists && Object.getPrototypeOf([][Symbol.iterator]());
      var stringIteratorExists = symbolIteratorExists && typeof String.prototype[Symbol.iterator] === "function";
      var stringIteratorPrototype = stringIteratorExists && Object.getPrototypeOf(""[Symbol.iterator]());
      var toStringLeftSliceLength = 8;
      var toStringRightSliceLength = -1;
      function typeDetect2(obj) {
        var typeofObj = typeof obj;
        if (typeofObj !== "object") {
          return typeofObj;
        }
        if (obj === null) {
          return "null";
        }
        if (obj === globalObject) {
          return "global";
        }
        if (Array.isArray(obj) && (symbolToStringTagExists === false || !(Symbol.toStringTag in obj))) {
          return "Array";
        }
        if (typeof window === "object" && window !== null) {
          if (typeof window.location === "object" && obj === window.location) {
            return "Location";
          }
          if (typeof window.document === "object" && obj === window.document) {
            return "Document";
          }
          if (typeof window.navigator === "object") {
            if (typeof window.navigator.mimeTypes === "object" && obj === window.navigator.mimeTypes) {
              return "MimeTypeArray";
            }
            if (typeof window.navigator.plugins === "object" && obj === window.navigator.plugins) {
              return "PluginArray";
            }
          }
          if ((typeof window.HTMLElement === "function" || typeof window.HTMLElement === "object") && obj instanceof window.HTMLElement) {
            if (obj.tagName === "BLOCKQUOTE") {
              return "HTMLQuoteElement";
            }
            if (obj.tagName === "TD") {
              return "HTMLTableDataCellElement";
            }
            if (obj.tagName === "TH") {
              return "HTMLTableHeaderCellElement";
            }
          }
        }
        var stringTag = symbolToStringTagExists && obj[Symbol.toStringTag];
        if (typeof stringTag === "string") {
          return stringTag;
        }
        var objPrototype = Object.getPrototypeOf(obj);
        if (objPrototype === RegExp.prototype) {
          return "RegExp";
        }
        if (objPrototype === Date.prototype) {
          return "Date";
        }
        if (promiseExists && objPrototype === Promise.prototype) {
          return "Promise";
        }
        if (setExists && objPrototype === Set.prototype) {
          return "Set";
        }
        if (mapExists && objPrototype === Map.prototype) {
          return "Map";
        }
        if (weakSetExists && objPrototype === WeakSet.prototype) {
          return "WeakSet";
        }
        if (weakMapExists && objPrototype === WeakMap.prototype) {
          return "WeakMap";
        }
        if (dataViewExists && objPrototype === DataView.prototype) {
          return "DataView";
        }
        if (mapExists && objPrototype === mapIteratorPrototype) {
          return "Map Iterator";
        }
        if (setExists && objPrototype === setIteratorPrototype) {
          return "Set Iterator";
        }
        if (arrayIteratorExists && objPrototype === arrayIteratorPrototype) {
          return "Array Iterator";
        }
        if (stringIteratorExists && objPrototype === stringIteratorPrototype) {
          return "String Iterator";
        }
        if (objPrototype === null) {
          return "Object";
        }
        return Object.prototype.toString.call(obj).slice(toStringLeftSliceLength, toStringRightSliceLength);
      }
      return typeDetect2;
    }));
  })(typeDetect$1);
  return typeDetect$1.exports;
}
var typeOf;
var hasRequiredTypeOf;
function requireTypeOf() {
  if (hasRequiredTypeOf) return typeOf;
  hasRequiredTypeOf = 1;
  var type3 = requireTypeDetect();
  typeOf = function typeOf2(value) {
    return type3(value).toLowerCase();
  };
  return typeOf;
}
var valueToString_1;
var hasRequiredValueToString;
function requireValueToString() {
  if (hasRequiredValueToString) return valueToString_1;
  hasRequiredValueToString = 1;
  function valueToString(value) {
    if (value && value.toString) {
      return value.toString();
    }
    return String(value);
  }
  valueToString_1 = valueToString;
  return valueToString_1;
}
var lib;
var hasRequiredLib;
function requireLib() {
  if (hasRequiredLib) return lib;
  hasRequiredLib = 1;
  lib = {
    global: requireGlobal(),
    calledInOrder: requireCalledInOrder(),
    className: requireClassName(),
    deprecated: requireDeprecated(),
    every: requireEvery(),
    functionName: requireFunctionName(),
    orderByFirstCall: requireOrderByFirstCall(),
    prototypes: requirePrototypes(),
    typeOf: requireTypeOf(),
    valueToString: requireValueToString()
  };
  return lib;
}
var hasRequiredFakeTimersSrc;
function requireFakeTimersSrc() {
  if (hasRequiredFakeTimersSrc) return fakeTimersSrc;
  hasRequiredFakeTimersSrc = 1;
  const globalObject = requireLib().global;
  let timersModule, timersPromisesModule;
  if (typeof __vitest_required__ !== "undefined") {
    try {
      timersModule = __vitest_required__.timers;
    } catch (e3) {
    }
    try {
      timersPromisesModule = __vitest_required__.timersPromises;
    } catch (e3) {
    }
  }
  function withGlobal(_global) {
    const maxTimeout = Math.pow(2, 31) - 1;
    const idCounterStart = 1e12;
    const NOOP = function() {
      return void 0;
    };
    const NOOP_ARRAY = function() {
      return [];
    };
    const isPresent = {};
    let timeoutResult, addTimerReturnsObject = false;
    if (_global.setTimeout) {
      isPresent.setTimeout = true;
      timeoutResult = _global.setTimeout(NOOP, 0);
      addTimerReturnsObject = typeof timeoutResult === "object";
    }
    isPresent.clearTimeout = Boolean(_global.clearTimeout);
    isPresent.setInterval = Boolean(_global.setInterval);
    isPresent.clearInterval = Boolean(_global.clearInterval);
    isPresent.hrtime = _global.process && typeof _global.process.hrtime === "function";
    isPresent.hrtimeBigint = isPresent.hrtime && typeof _global.process.hrtime.bigint === "function";
    isPresent.nextTick = _global.process && typeof _global.process.nextTick === "function";
    const utilPromisify = _global.process && _global.__vitest_required__ && _global.__vitest_required__.util.promisify;
    isPresent.performance = _global.performance && typeof _global.performance.now === "function";
    const hasPerformancePrototype = _global.Performance && (typeof _global.Performance).match(/^(function|object)$/);
    const hasPerformanceConstructorPrototype = _global.performance && _global.performance.constructor && _global.performance.constructor.prototype;
    isPresent.queueMicrotask = _global.hasOwnProperty("queueMicrotask");
    isPresent.requestAnimationFrame = _global.requestAnimationFrame && typeof _global.requestAnimationFrame === "function";
    isPresent.cancelAnimationFrame = _global.cancelAnimationFrame && typeof _global.cancelAnimationFrame === "function";
    isPresent.requestIdleCallback = _global.requestIdleCallback && typeof _global.requestIdleCallback === "function";
    isPresent.cancelIdleCallbackPresent = _global.cancelIdleCallback && typeof _global.cancelIdleCallback === "function";
    isPresent.setImmediate = _global.setImmediate && typeof _global.setImmediate === "function";
    isPresent.clearImmediate = _global.clearImmediate && typeof _global.clearImmediate === "function";
    isPresent.Intl = _global.Intl && typeof _global.Intl === "object";
    if (_global.clearTimeout) {
      _global.clearTimeout(timeoutResult);
    }
    const NativeDate = _global.Date;
    const NativeIntl = isPresent.Intl ? Object.defineProperties(
      /* @__PURE__ */ Object.create(null),
      Object.getOwnPropertyDescriptors(_global.Intl)
    ) : void 0;
    let uniqueTimerId = idCounterStart;
    if (NativeDate === void 0) {
      throw new Error(
        "The global scope doesn't have a `Date` object (see https://github.com/sinonjs/sinon/issues/1852#issuecomment-419622780)"
      );
    }
    isPresent.Date = true;
    class FakePerformanceEntry {
      constructor(name, entryType, startTime, duration) {
        this.name = name;
        this.entryType = entryType;
        this.startTime = startTime;
        this.duration = duration;
      }
      toJSON() {
        return JSON.stringify({ ...this });
      }
    }
    function isNumberFinite(num) {
      if (Number.isFinite) {
        return Number.isFinite(num);
      }
      return isFinite(num);
    }
    let isNearInfiniteLimit = false;
    function checkIsNearInfiniteLimit(clock, i3) {
      if (clock.loopLimit && i3 === clock.loopLimit - 1) {
        isNearInfiniteLimit = true;
      }
    }
    function resetIsNearInfiniteLimit() {
      isNearInfiniteLimit = false;
    }
    function parseTime(str) {
      if (!str) {
        return 0;
      }
      const strings = str.split(":");
      const l2 = strings.length;
      let i3 = l2;
      let ms = 0;
      let parsed;
      if (l2 > 3 || !/^(\d\d:){0,2}\d\d?$/.test(str)) {
        throw new Error(
          "tick only understands numbers, 'm:s' and 'h:m:s'. Each part must be two digits"
        );
      }
      while (i3--) {
        parsed = parseInt(strings[i3], 10);
        if (parsed >= 60) {
          throw new Error(`Invalid time ${str}`);
        }
        ms += parsed * Math.pow(60, l2 - i3 - 1);
      }
      return ms * 1e3;
    }
    function nanoRemainder(msFloat) {
      const modulo = 1e6;
      const remainder = msFloat * 1e6 % modulo;
      const positiveRemainder = remainder < 0 ? remainder + modulo : remainder;
      return Math.floor(positiveRemainder);
    }
    function getEpoch(epoch) {
      if (!epoch) {
        return 0;
      }
      if (typeof epoch.getTime === "function") {
        return epoch.getTime();
      }
      if (typeof epoch === "number") {
        return epoch;
      }
      throw new TypeError("now should be milliseconds since UNIX epoch");
    }
    function inRange(from, to, timer) {
      return timer && timer.callAt >= from && timer.callAt <= to;
    }
    function getInfiniteLoopError(clock, job) {
      const infiniteLoopError = new Error(
        `Aborting after running ${clock.loopLimit} timers, assuming an infinite loop!`
      );
      if (!job.error) {
        return infiniteLoopError;
      }
      const computedTargetPattern = /target\.*[<|(|[].*?[>|\]|)]\s*/;
      let clockMethodPattern = new RegExp(
        String(Object.keys(clock).join("|"))
      );
      if (addTimerReturnsObject) {
        clockMethodPattern = new RegExp(
          `\\s+at (Object\\.)?(?:${Object.keys(clock).join("|")})\\s+`
        );
      }
      let matchedLineIndex = -1;
      job.error.stack.split("\n").some(function(line, i3) {
        const matchedComputedTarget = line.match(computedTargetPattern);
        if (matchedComputedTarget) {
          matchedLineIndex = i3;
          return true;
        }
        const matchedClockMethod = line.match(clockMethodPattern);
        if (matchedClockMethod) {
          matchedLineIndex = i3;
          return false;
        }
        return matchedLineIndex >= 0;
      });
      const stack = `${infiniteLoopError}
${job.type || "Microtask"} - ${job.func.name || "anonymous"}
${job.error.stack.split("\n").slice(matchedLineIndex + 1).join("\n")}`;
      try {
        Object.defineProperty(infiniteLoopError, "stack", {
          value: stack
        });
      } catch (e3) {
      }
      return infiniteLoopError;
    }
    function createDate() {
      class ClockDate extends NativeDate {
        /**
         * @param {number} year
         * @param {number} month
         * @param {number} date
         * @param {number} hour
         * @param {number} minute
         * @param {number} second
         * @param {number} ms
         * @returns void
         */
        // eslint-disable-next-line no-unused-vars
        constructor(year, month, date, hour, minute, second, ms) {
          if (arguments.length === 0) {
            super(ClockDate.clock.now);
          } else {
            super(...arguments);
          }
          Object.defineProperty(this, "constructor", {
            value: NativeDate,
            enumerable: false
          });
        }
        static [Symbol.hasInstance](instance) {
          return instance instanceof NativeDate;
        }
      }
      ClockDate.isFake = true;
      if (NativeDate.now) {
        ClockDate.now = function now3() {
          return ClockDate.clock.now;
        };
      }
      if (NativeDate.toSource) {
        ClockDate.toSource = function toSource() {
          return NativeDate.toSource();
        };
      }
      ClockDate.toString = function toString4() {
        return NativeDate.toString();
      };
      const ClockDateProxy = new Proxy(ClockDate, {
        // handler for [[Call]] invocations (i.e. not using `new`)
        apply() {
          if (this instanceof ClockDate) {
            throw new TypeError(
              "A Proxy should only capture `new` calls with the `construct` handler. This is not supposed to be possible, so check the logic."
            );
          }
          return new NativeDate(ClockDate.clock.now).toString();
        }
      });
      return ClockDateProxy;
    }
    function createIntl() {
      const ClockIntl = {};
      Object.getOwnPropertyNames(NativeIntl).forEach(
        (property) => ClockIntl[property] = NativeIntl[property]
      );
      ClockIntl.DateTimeFormat = function(...args) {
        const realFormatter = new NativeIntl.DateTimeFormat(...args);
        const formatter = {};
        ["formatRange", "formatRangeToParts", "resolvedOptions"].forEach(
          (method) => {
            formatter[method] = realFormatter[method].bind(realFormatter);
          }
        );
        ["format", "formatToParts"].forEach((method) => {
          formatter[method] = function(date) {
            return realFormatter[method](date || ClockIntl.clock.now);
          };
        });
        return formatter;
      };
      ClockIntl.DateTimeFormat.prototype = Object.create(
        NativeIntl.DateTimeFormat.prototype
      );
      ClockIntl.DateTimeFormat.supportedLocalesOf = NativeIntl.DateTimeFormat.supportedLocalesOf;
      return ClockIntl;
    }
    function enqueueJob(clock, job) {
      if (!clock.jobs) {
        clock.jobs = [];
      }
      clock.jobs.push(job);
    }
    function runJobs(clock) {
      if (!clock.jobs) {
        return;
      }
      for (let i3 = 0; i3 < clock.jobs.length; i3++) {
        const job = clock.jobs[i3];
        job.func.apply(null, job.args);
        checkIsNearInfiniteLimit(clock, i3);
        if (clock.loopLimit && i3 > clock.loopLimit) {
          throw getInfiniteLoopError(clock, job);
        }
      }
      resetIsNearInfiniteLimit();
      clock.jobs = [];
    }
    function addTimer(clock, timer) {
      if (timer.func === void 0) {
        throw new Error("Callback must be provided to timer calls");
      }
      if (addTimerReturnsObject) {
        if (typeof timer.func !== "function") {
          throw new TypeError(
            `[ERR_INVALID_CALLBACK]: Callback must be a function. Received ${timer.func} of type ${typeof timer.func}`
          );
        }
      }
      if (isNearInfiniteLimit) {
        timer.error = new Error();
      }
      timer.type = timer.immediate ? "Immediate" : "Timeout";
      if (timer.hasOwnProperty("delay")) {
        if (typeof timer.delay !== "number") {
          timer.delay = parseInt(timer.delay, 10);
        }
        if (!isNumberFinite(timer.delay)) {
          timer.delay = 0;
        }
        timer.delay = timer.delay > maxTimeout ? 1 : timer.delay;
        timer.delay = Math.max(0, timer.delay);
      }
      if (timer.hasOwnProperty("interval")) {
        timer.type = "Interval";
        timer.interval = timer.interval > maxTimeout ? 1 : timer.interval;
      }
      if (timer.hasOwnProperty("animation")) {
        timer.type = "AnimationFrame";
        timer.animation = true;
      }
      if (timer.hasOwnProperty("idleCallback")) {
        timer.type = "IdleCallback";
        timer.idleCallback = true;
      }
      if (!clock.timers) {
        clock.timers = {};
      }
      timer.id = uniqueTimerId++;
      timer.createdAt = clock.now;
      timer.callAt = clock.now + (parseInt(timer.delay) || (clock.duringTick ? 1 : 0));
      clock.timers[timer.id] = timer;
      if (addTimerReturnsObject) {
        const res = {
          refed: true,
          ref: function() {
            this.refed = true;
            return res;
          },
          unref: function() {
            this.refed = false;
            return res;
          },
          hasRef: function() {
            return this.refed;
          },
          refresh: function() {
            timer.callAt = clock.now + (parseInt(timer.delay) || (clock.duringTick ? 1 : 0));
            clock.timers[timer.id] = timer;
            return res;
          },
          [Symbol.toPrimitive]: function() {
            return timer.id;
          }
        };
        return res;
      }
      return timer.id;
    }
    function compareTimers(a2, b3) {
      if (a2.callAt < b3.callAt) {
        return -1;
      }
      if (a2.callAt > b3.callAt) {
        return 1;
      }
      if (a2.immediate && !b3.immediate) {
        return -1;
      }
      if (!a2.immediate && b3.immediate) {
        return 1;
      }
      if (a2.createdAt < b3.createdAt) {
        return -1;
      }
      if (a2.createdAt > b3.createdAt) {
        return 1;
      }
      if (a2.id < b3.id) {
        return -1;
      }
      if (a2.id > b3.id) {
        return 1;
      }
    }
    function firstTimerInRange(clock, from, to) {
      const timers2 = clock.timers;
      let timer = null;
      let id, isInRange;
      for (id in timers2) {
        if (timers2.hasOwnProperty(id)) {
          isInRange = inRange(from, to, timers2[id]);
          if (isInRange && (!timer || compareTimers(timer, timers2[id]) === 1)) {
            timer = timers2[id];
          }
        }
      }
      return timer;
    }
    function firstTimer(clock) {
      const timers2 = clock.timers;
      let timer = null;
      let id;
      for (id in timers2) {
        if (timers2.hasOwnProperty(id)) {
          if (!timer || compareTimers(timer, timers2[id]) === 1) {
            timer = timers2[id];
          }
        }
      }
      return timer;
    }
    function lastTimer(clock) {
      const timers2 = clock.timers;
      let timer = null;
      let id;
      for (id in timers2) {
        if (timers2.hasOwnProperty(id)) {
          if (!timer || compareTimers(timer, timers2[id]) === -1) {
            timer = timers2[id];
          }
        }
      }
      return timer;
    }
    function callTimer(clock, timer) {
      if (typeof timer.interval === "number") {
        clock.timers[timer.id].callAt += timer.interval;
      } else {
        delete clock.timers[timer.id];
      }
      if (typeof timer.func === "function") {
        timer.func.apply(null, timer.args);
      } else {
        const eval2 = eval;
        (function() {
          eval2(timer.func);
        })();
      }
    }
    function getClearHandler(ttype) {
      if (ttype === "IdleCallback" || ttype === "AnimationFrame") {
        return `cancel${ttype}`;
      }
      return `clear${ttype}`;
    }
    function getScheduleHandler(ttype) {
      if (ttype === "IdleCallback" || ttype === "AnimationFrame") {
        return `request${ttype}`;
      }
      return `set${ttype}`;
    }
    function createWarnOnce() {
      let calls = 0;
      return function(msg) {
        !calls++ && console.warn(msg);
      };
    }
    const warnOnce = createWarnOnce();
    function clearTimer(clock, timerId, ttype) {
      if (!timerId) {
        return;
      }
      if (!clock.timers) {
        clock.timers = {};
      }
      const id = Number(timerId);
      if (Number.isNaN(id) || id < idCounterStart) {
        const handlerName = getClearHandler(ttype);
        if (clock.shouldClearNativeTimers === true) {
          const nativeHandler = clock[`_${handlerName}`];
          return typeof nativeHandler === "function" ? nativeHandler(timerId) : void 0;
        }
        warnOnce(
          `FakeTimers: ${handlerName} was invoked to clear a native timer instead of one created by this library.
To automatically clean-up native timers, use \`shouldClearNativeTimers\`.`
        );
      }
      if (clock.timers.hasOwnProperty(id)) {
        const timer = clock.timers[id];
        if (timer.type === ttype || timer.type === "Timeout" && ttype === "Interval" || timer.type === "Interval" && ttype === "Timeout") {
          delete clock.timers[id];
        } else {
          const clear = getClearHandler(ttype);
          const schedule = getScheduleHandler(timer.type);
          throw new Error(
            `Cannot clear timer: timer created with ${schedule}() but cleared with ${clear}()`
          );
        }
      }
    }
    function uninstall(clock) {
      let method, i3, l2;
      const installedHrTime = "_hrtime";
      const installedNextTick = "_nextTick";
      for (i3 = 0, l2 = clock.methods.length; i3 < l2; i3++) {
        method = clock.methods[i3];
        if (method === "hrtime" && _global.process) {
          _global.process.hrtime = clock[installedHrTime];
        } else if (method === "nextTick" && _global.process) {
          _global.process.nextTick = clock[installedNextTick];
        } else if (method === "performance") {
          const originalPerfDescriptor = Object.getOwnPropertyDescriptor(
            clock,
            `_${method}`
          );
          if (originalPerfDescriptor && originalPerfDescriptor.get && !originalPerfDescriptor.set) {
            Object.defineProperty(
              _global,
              method,
              originalPerfDescriptor
            );
          } else if (originalPerfDescriptor.configurable) {
            _global[method] = clock[`_${method}`];
          }
        } else {
          if (_global[method] && _global[method].hadOwnProperty) {
            _global[method] = clock[`_${method}`];
          } else {
            try {
              delete _global[method];
            } catch (ignore) {
            }
          }
        }
        if (clock.timersModuleMethods !== void 0) {
          for (let j2 = 0; j2 < clock.timersModuleMethods.length; j2++) {
            const entry = clock.timersModuleMethods[j2];
            timersModule[entry.methodName] = entry.original;
          }
        }
        if (clock.timersPromisesModuleMethods !== void 0) {
          for (let j2 = 0; j2 < clock.timersPromisesModuleMethods.length; j2++) {
            const entry = clock.timersPromisesModuleMethods[j2];
            timersPromisesModule[entry.methodName] = entry.original;
          }
        }
      }
      clock.setTickMode("manual");
      clock.methods = [];
      for (const [listener, signal] of clock.abortListenerMap.entries()) {
        signal.removeEventListener("abort", listener);
        clock.abortListenerMap.delete(listener);
      }
      if (!clock.timers) {
        return [];
      }
      return Object.keys(clock.timers).map(function mapper(key) {
        return clock.timers[key];
      });
    }
    function hijackMethod(target, method, clock) {
      clock[method].hadOwnProperty = Object.prototype.hasOwnProperty.call(
        target,
        method
      );
      clock[`_${method}`] = target[method];
      if (method === "Date") {
        target[method] = clock[method];
      } else if (method === "Intl") {
        target[method] = clock[method];
      } else if (method === "performance") {
        const originalPerfDescriptor = Object.getOwnPropertyDescriptor(
          target,
          method
        );
        if (originalPerfDescriptor && originalPerfDescriptor.get && !originalPerfDescriptor.set) {
          Object.defineProperty(
            clock,
            `_${method}`,
            originalPerfDescriptor
          );
          const perfDescriptor = Object.getOwnPropertyDescriptor(
            clock,
            method
          );
          Object.defineProperty(target, method, perfDescriptor);
        } else {
          target[method] = clock[method];
        }
      } else {
        target[method] = function() {
          return clock[method].apply(clock, arguments);
        };
        Object.defineProperties(
          target[method],
          Object.getOwnPropertyDescriptors(clock[method])
        );
      }
      target[method].clock = clock;
    }
    function doIntervalTick(clock, advanceTimeDelta) {
      clock.tick(advanceTimeDelta);
    }
    const timers = {
      setTimeout: _global.setTimeout,
      clearTimeout: _global.clearTimeout,
      setInterval: _global.setInterval,
      clearInterval: _global.clearInterval,
      Date: _global.Date
    };
    if (isPresent.setImmediate) {
      timers.setImmediate = _global.setImmediate;
    }
    if (isPresent.clearImmediate) {
      timers.clearImmediate = _global.clearImmediate;
    }
    if (isPresent.hrtime) {
      timers.hrtime = _global.process.hrtime;
    }
    if (isPresent.nextTick) {
      timers.nextTick = _global.process.nextTick;
    }
    if (isPresent.performance) {
      timers.performance = _global.performance;
    }
    if (isPresent.requestAnimationFrame) {
      timers.requestAnimationFrame = _global.requestAnimationFrame;
    }
    if (isPresent.queueMicrotask) {
      timers.queueMicrotask = _global.queueMicrotask;
    }
    if (isPresent.cancelAnimationFrame) {
      timers.cancelAnimationFrame = _global.cancelAnimationFrame;
    }
    if (isPresent.requestIdleCallback) {
      timers.requestIdleCallback = _global.requestIdleCallback;
    }
    if (isPresent.cancelIdleCallback) {
      timers.cancelIdleCallback = _global.cancelIdleCallback;
    }
    if (isPresent.Intl) {
      timers.Intl = NativeIntl;
    }
    const originalSetTimeout = _global.setImmediate || _global.setTimeout;
    const originalClearInterval = _global.clearInterval;
    const originalSetInterval = _global.setInterval;
    function createClock(start, loopLimit) {
      start = Math.floor(getEpoch(start));
      loopLimit = loopLimit || 1e3;
      let nanos = 0;
      const adjustedSystemTime = [0, 0];
      const clock = {
        now: start,
        Date: createDate(),
        loopLimit,
        tickMode: { mode: "manual", counter: 0, delta: void 0 }
      };
      clock.Date.clock = clock;
      function getTimeToNextFrame() {
        return 16 - (clock.now - start) % 16;
      }
      function hrtime(prev) {
        const millisSinceStart = clock.now - adjustedSystemTime[0] - start;
        const secsSinceStart = Math.floor(millisSinceStart / 1e3);
        const remainderInNanos = (millisSinceStart - secsSinceStart * 1e3) * 1e6 + nanos - adjustedSystemTime[1];
        if (Array.isArray(prev)) {
          if (prev[1] > 1e9) {
            throw new TypeError(
              "Number of nanoseconds can't exceed a billion"
            );
          }
          const oldSecs = prev[0];
          let nanoDiff = remainderInNanos - prev[1];
          let secDiff = secsSinceStart - oldSecs;
          if (nanoDiff < 0) {
            nanoDiff += 1e9;
            secDiff -= 1;
          }
          return [secDiff, nanoDiff];
        }
        return [secsSinceStart, remainderInNanos];
      }
      function fakePerformanceNow() {
        const hrt = hrtime();
        const millis = hrt[0] * 1e3 + hrt[1] / 1e6;
        return millis;
      }
      if (isPresent.hrtimeBigint) {
        hrtime.bigint = function() {
          const parts = hrtime();
          return BigInt(parts[0]) * BigInt(1e9) + BigInt(parts[1]);
        };
      }
      if (isPresent.Intl) {
        clock.Intl = createIntl();
        clock.Intl.clock = clock;
      }
      clock.setTickMode = function(tickModeConfig) {
        const { mode: newMode, delta: newDelta } = tickModeConfig;
        const { mode: oldMode, delta: oldDelta } = clock.tickMode;
        if (newMode === oldMode && newDelta === oldDelta) {
          return;
        }
        if (oldMode === "interval") {
          originalClearInterval(clock.attachedInterval);
        }
        clock.tickMode = {
          counter: clock.tickMode.counter + 1,
          mode: newMode,
          delta: newDelta
        };
        if (newMode === "nextAsync") {
          advanceUntilModeChanges();
        } else if (newMode === "interval") {
          createIntervalTick(clock, newDelta || 20);
        }
      };
      async function advanceUntilModeChanges() {
        async function newMacrotask() {
          const channel = new MessageChannel();
          await new Promise((resolve2) => {
            channel.port1.onmessage = () => {
              resolve2();
              channel.port1.close();
            };
            channel.port2.postMessage(void 0);
          });
          channel.port1.close();
          channel.port2.close();
          await new Promise((resolve2) => {
            originalSetTimeout(resolve2);
          });
        }
        const { counter } = clock.tickMode;
        while (clock.tickMode.counter === counter) {
          await newMacrotask();
          if (clock.tickMode.counter !== counter) {
            return;
          }
          clock.next();
        }
      }
      function pauseAutoTickUntilFinished(promise) {
        if (clock.tickMode.mode !== "nextAsync") {
          return promise;
        }
        clock.setTickMode({ mode: "manual" });
        return promise.finally(() => {
          clock.setTickMode({ mode: "nextAsync" });
        });
      }
      clock.requestIdleCallback = function requestIdleCallback(func, timeout) {
        let timeToNextIdlePeriod = 0;
        if (clock.countTimers() > 0) {
          timeToNextIdlePeriod = 50;
        }
        const result = addTimer(clock, {
          func,
          args: Array.prototype.slice.call(arguments, 2),
          delay: typeof timeout === "undefined" ? timeToNextIdlePeriod : Math.min(timeout, timeToNextIdlePeriod),
          idleCallback: true
        });
        return Number(result);
      };
      clock.cancelIdleCallback = function cancelIdleCallback(timerId) {
        return clearTimer(clock, timerId, "IdleCallback");
      };
      clock.setTimeout = function setTimeout3(func, timeout) {
        return addTimer(clock, {
          func,
          args: Array.prototype.slice.call(arguments, 2),
          delay: timeout
        });
      };
      if (typeof _global.Promise !== "undefined" && utilPromisify) {
        clock.setTimeout[utilPromisify.custom] = function promisifiedSetTimeout(timeout, arg) {
          return new _global.Promise(function setTimeoutExecutor(resolve2) {
            addTimer(clock, {
              func: resolve2,
              args: [arg],
              delay: timeout
            });
          });
        };
      }
      clock.clearTimeout = function clearTimeout3(timerId) {
        return clearTimer(clock, timerId, "Timeout");
      };
      clock.nextTick = function nextTick2(func) {
        return enqueueJob(clock, {
          func,
          args: Array.prototype.slice.call(arguments, 1),
          error: isNearInfiniteLimit ? new Error() : null
        });
      };
      clock.queueMicrotask = function queueMicrotask(func) {
        return clock.nextTick(func);
      };
      clock.setInterval = function setInterval2(func, timeout) {
        timeout = parseInt(timeout, 10);
        return addTimer(clock, {
          func,
          args: Array.prototype.slice.call(arguments, 2),
          delay: timeout,
          interval: timeout
        });
      };
      clock.clearInterval = function clearInterval2(timerId) {
        return clearTimer(clock, timerId, "Interval");
      };
      if (isPresent.setImmediate) {
        clock.setImmediate = function setImmediate(func) {
          return addTimer(clock, {
            func,
            args: Array.prototype.slice.call(arguments, 1),
            immediate: true
          });
        };
        if (typeof _global.Promise !== "undefined" && utilPromisify) {
          clock.setImmediate[utilPromisify.custom] = function promisifiedSetImmediate(arg) {
            return new _global.Promise(
              function setImmediateExecutor(resolve2) {
                addTimer(clock, {
                  func: resolve2,
                  args: [arg],
                  immediate: true
                });
              }
            );
          };
        }
        clock.clearImmediate = function clearImmediate(timerId) {
          return clearTimer(clock, timerId, "Immediate");
        };
      }
      clock.countTimers = function countTimers() {
        return Object.keys(clock.timers || {}).length + (clock.jobs || []).length;
      };
      clock.requestAnimationFrame = function requestAnimationFrame(func) {
        const result = addTimer(clock, {
          func,
          delay: getTimeToNextFrame(),
          get args() {
            return [fakePerformanceNow()];
          },
          animation: true
        });
        return Number(result);
      };
      clock.cancelAnimationFrame = function cancelAnimationFrame(timerId) {
        return clearTimer(clock, timerId, "AnimationFrame");
      };
      clock.runMicrotasks = function runMicrotasks() {
        runJobs(clock);
      };
      function doTick(tickValue, isAsync, resolve2, reject) {
        const msFloat = typeof tickValue === "number" ? tickValue : parseTime(tickValue);
        const ms = Math.floor(msFloat);
        const remainder = nanoRemainder(msFloat);
        let nanosTotal = nanos + remainder;
        let tickTo = clock.now + ms;
        if (msFloat < 0) {
          throw new TypeError("Negative ticks are not supported");
        }
        if (nanosTotal >= 1e6) {
          tickTo += 1;
          nanosTotal -= 1e6;
        }
        nanos = nanosTotal;
        let tickFrom = clock.now;
        let previous = clock.now;
        let timer, firstException, oldNow, nextPromiseTick, compensationCheck, postTimerCall;
        clock.duringTick = true;
        oldNow = clock.now;
        runJobs(clock);
        if (oldNow !== clock.now) {
          tickFrom += clock.now - oldNow;
          tickTo += clock.now - oldNow;
        }
        function doTickInner() {
          timer = firstTimerInRange(clock, tickFrom, tickTo);
          while (timer && tickFrom <= tickTo) {
            if (clock.timers[timer.id]) {
              tickFrom = timer.callAt;
              clock.now = timer.callAt;
              oldNow = clock.now;
              try {
                runJobs(clock);
                callTimer(clock, timer);
              } catch (e3) {
                firstException = firstException || e3;
              }
              if (isAsync) {
                originalSetTimeout(nextPromiseTick);
                return;
              }
              compensationCheck();
            }
            postTimerCall();
          }
          oldNow = clock.now;
          runJobs(clock);
          if (oldNow !== clock.now) {
            tickFrom += clock.now - oldNow;
            tickTo += clock.now - oldNow;
          }
          clock.duringTick = false;
          timer = firstTimerInRange(clock, tickFrom, tickTo);
          if (timer) {
            try {
              clock.tick(tickTo - clock.now);
            } catch (e3) {
              firstException = firstException || e3;
            }
          } else {
            clock.now = tickTo;
            nanos = nanosTotal;
          }
          if (firstException) {
            throw firstException;
          }
          if (isAsync) {
            resolve2(clock.now);
          } else {
            return clock.now;
          }
        }
        nextPromiseTick = isAsync && function() {
          try {
            compensationCheck();
            postTimerCall();
            doTickInner();
          } catch (e3) {
            reject(e3);
          }
        };
        compensationCheck = function() {
          if (oldNow !== clock.now) {
            tickFrom += clock.now - oldNow;
            tickTo += clock.now - oldNow;
            previous += clock.now - oldNow;
          }
        };
        postTimerCall = function() {
          timer = firstTimerInRange(clock, previous, tickTo);
          previous = tickFrom;
        };
        return doTickInner();
      }
      clock.tick = function tick(tickValue) {
        return doTick(tickValue, false);
      };
      if (typeof _global.Promise !== "undefined") {
        clock.tickAsync = function tickAsync(tickValue) {
          return pauseAutoTickUntilFinished(
            new _global.Promise(function(resolve2, reject) {
              originalSetTimeout(function() {
                try {
                  doTick(tickValue, true, resolve2, reject);
                } catch (e3) {
                  reject(e3);
                }
              });
            })
          );
        };
      }
      clock.next = function next() {
        runJobs(clock);
        const timer = firstTimer(clock);
        if (!timer) {
          return clock.now;
        }
        clock.duringTick = true;
        try {
          clock.now = timer.callAt;
          callTimer(clock, timer);
          runJobs(clock);
          return clock.now;
        } finally {
          clock.duringTick = false;
        }
      };
      if (typeof _global.Promise !== "undefined") {
        clock.nextAsync = function nextAsync() {
          return pauseAutoTickUntilFinished(
            new _global.Promise(function(resolve2, reject) {
              originalSetTimeout(function() {
                try {
                  const timer = firstTimer(clock);
                  if (!timer) {
                    resolve2(clock.now);
                    return;
                  }
                  let err;
                  clock.duringTick = true;
                  clock.now = timer.callAt;
                  try {
                    callTimer(clock, timer);
                  } catch (e3) {
                    err = e3;
                  }
                  clock.duringTick = false;
                  originalSetTimeout(function() {
                    if (err) {
                      reject(err);
                    } else {
                      resolve2(clock.now);
                    }
                  });
                } catch (e3) {
                  reject(e3);
                }
              });
            })
          );
        };
      }
      clock.runAll = function runAll() {
        let numTimers, i3;
        runJobs(clock);
        for (i3 = 0; i3 < clock.loopLimit; i3++) {
          if (!clock.timers) {
            resetIsNearInfiniteLimit();
            return clock.now;
          }
          numTimers = Object.keys(clock.timers).length;
          if (numTimers === 0) {
            resetIsNearInfiniteLimit();
            return clock.now;
          }
          clock.next();
          checkIsNearInfiniteLimit(clock, i3);
        }
        const excessJob = firstTimer(clock);
        throw getInfiniteLoopError(clock, excessJob);
      };
      clock.runToFrame = function runToFrame() {
        return clock.tick(getTimeToNextFrame());
      };
      if (typeof _global.Promise !== "undefined") {
        clock.runAllAsync = function runAllAsync() {
          return pauseAutoTickUntilFinished(
            new _global.Promise(function(resolve2, reject) {
              let i3 = 0;
              function doRun() {
                originalSetTimeout(function() {
                  try {
                    runJobs(clock);
                    let numTimers;
                    if (i3 < clock.loopLimit) {
                      if (!clock.timers) {
                        resetIsNearInfiniteLimit();
                        resolve2(clock.now);
                        return;
                      }
                      numTimers = Object.keys(
                        clock.timers
                      ).length;
                      if (numTimers === 0) {
                        resetIsNearInfiniteLimit();
                        resolve2(clock.now);
                        return;
                      }
                      clock.next();
                      i3++;
                      doRun();
                      checkIsNearInfiniteLimit(clock, i3);
                      return;
                    }
                    const excessJob = firstTimer(clock);
                    reject(
                      getInfiniteLoopError(clock, excessJob)
                    );
                  } catch (e3) {
                    reject(e3);
                  }
                });
              }
              doRun();
            })
          );
        };
      }
      clock.runToLast = function runToLast() {
        const timer = lastTimer(clock);
        if (!timer) {
          runJobs(clock);
          return clock.now;
        }
        return clock.tick(timer.callAt - clock.now);
      };
      if (typeof _global.Promise !== "undefined") {
        clock.runToLastAsync = function runToLastAsync() {
          return pauseAutoTickUntilFinished(
            new _global.Promise(function(resolve2, reject) {
              originalSetTimeout(function() {
                try {
                  const timer = lastTimer(clock);
                  if (!timer) {
                    runJobs(clock);
                    resolve2(clock.now);
                  }
                  resolve2(
                    clock.tickAsync(timer.callAt - clock.now)
                  );
                } catch (e3) {
                  reject(e3);
                }
              });
            })
          );
        };
      }
      clock.reset = function reset() {
        nanos = 0;
        clock.timers = {};
        clock.jobs = [];
        clock.now = start;
      };
      clock.setSystemTime = function setSystemTime(systemTime) {
        const newNow = getEpoch(systemTime);
        const difference = newNow - clock.now;
        let id, timer;
        adjustedSystemTime[0] = adjustedSystemTime[0] + difference;
        adjustedSystemTime[1] = adjustedSystemTime[1] + nanos;
        clock.now = newNow;
        nanos = 0;
        for (id in clock.timers) {
          if (clock.timers.hasOwnProperty(id)) {
            timer = clock.timers[id];
            timer.createdAt += difference;
            timer.callAt += difference;
          }
        }
      };
      clock.jump = function jump(tickValue) {
        const msFloat = typeof tickValue === "number" ? tickValue : parseTime(tickValue);
        const ms = Math.floor(msFloat);
        for (const timer of Object.values(clock.timers)) {
          if (clock.now + ms > timer.callAt) {
            timer.callAt = clock.now + ms;
          }
        }
        clock.tick(ms);
      };
      if (isPresent.performance) {
        clock.performance = /* @__PURE__ */ Object.create(null);
        clock.performance.now = fakePerformanceNow;
      }
      if (isPresent.hrtime) {
        clock.hrtime = hrtime;
      }
      return clock;
    }
    function createIntervalTick(clock, delta) {
      const intervalTick = doIntervalTick.bind(null, clock, delta);
      const intervalId = originalSetInterval(intervalTick, delta);
      clock.attachedInterval = intervalId;
    }
    function install(config2) {
      if (arguments.length > 1 || config2 instanceof Date || Array.isArray(config2) || typeof config2 === "number") {
        throw new TypeError(
          `FakeTimers.install called with ${String(
            config2
          )} install requires an object parameter`
        );
      }
      if (_global.Date.isFake === true) {
        throw new TypeError(
          "Can't install fake timers twice on the same global object."
        );
      }
      config2 = typeof config2 !== "undefined" ? config2 : {};
      config2.shouldAdvanceTime = config2.shouldAdvanceTime || false;
      config2.advanceTimeDelta = config2.advanceTimeDelta || 20;
      config2.shouldClearNativeTimers = config2.shouldClearNativeTimers || false;
      if (config2.target) {
        throw new TypeError(
          "config.target is no longer supported. Use `withGlobal(target)` instead."
        );
      }
      function handleMissingTimer(timer) {
        if (config2.ignoreMissingTimers) {
          return;
        }
        throw new ReferenceError(
          `non-existent timers and/or objects cannot be faked: '${timer}'`
        );
      }
      let i3, l2;
      const clock = createClock(config2.now, config2.loopLimit);
      clock.shouldClearNativeTimers = config2.shouldClearNativeTimers;
      clock.uninstall = function() {
        return uninstall(clock);
      };
      clock.abortListenerMap = /* @__PURE__ */ new Map();
      clock.methods = config2.toFake || [];
      if (clock.methods.length === 0) {
        clock.methods = Object.keys(timers);
      }
      if (config2.shouldAdvanceTime === true) {
        clock.setTickMode({
          mode: "interval",
          delta: config2.advanceTimeDelta
        });
      }
      if (clock.methods.includes("performance")) {
        const proto = (() => {
          if (hasPerformanceConstructorPrototype) {
            return _global.performance.constructor.prototype;
          }
          if (hasPerformancePrototype) {
            return _global.Performance.prototype;
          }
        })();
        if (proto) {
          Object.getOwnPropertyNames(proto).forEach(function(name) {
            if (name !== "now") {
              clock.performance[name] = name.indexOf("getEntries") === 0 ? NOOP_ARRAY : NOOP;
            }
          });
          clock.performance.mark = (name) => new FakePerformanceEntry(name, "mark", 0, 0);
          clock.performance.measure = (name) => new FakePerformanceEntry(name, "measure", 0, 100);
          clock.performance.timeOrigin = getEpoch(config2.now);
        } else if ((config2.toFake || []).includes("performance")) {
          return handleMissingTimer("performance");
        }
      }
      if (_global === globalObject && timersModule) {
        clock.timersModuleMethods = [];
      }
      if (_global === globalObject && timersPromisesModule) {
        clock.timersPromisesModuleMethods = [];
      }
      for (i3 = 0, l2 = clock.methods.length; i3 < l2; i3++) {
        const nameOfMethodToReplace = clock.methods[i3];
        if (!isPresent[nameOfMethodToReplace]) {
          handleMissingTimer(nameOfMethodToReplace);
          continue;
        }
        if (nameOfMethodToReplace === "hrtime") {
          if (_global.process && typeof _global.process.hrtime === "function") {
            hijackMethod(_global.process, nameOfMethodToReplace, clock);
          }
        } else if (nameOfMethodToReplace === "nextTick") {
          if (_global.process && typeof _global.process.nextTick === "function") {
            hijackMethod(_global.process, nameOfMethodToReplace, clock);
          }
        } else {
          hijackMethod(_global, nameOfMethodToReplace, clock);
        }
        if (clock.timersModuleMethods !== void 0 && timersModule[nameOfMethodToReplace]) {
          const original = timersModule[nameOfMethodToReplace];
          clock.timersModuleMethods.push({
            methodName: nameOfMethodToReplace,
            original
          });
          timersModule[nameOfMethodToReplace] = _global[nameOfMethodToReplace];
        }
        if (clock.timersPromisesModuleMethods !== void 0) {
          if (nameOfMethodToReplace === "setTimeout") {
            clock.timersPromisesModuleMethods.push({
              methodName: "setTimeout",
              original: timersPromisesModule.setTimeout
            });
            timersPromisesModule.setTimeout = (delay2, value, options = {}) => new Promise((resolve2, reject) => {
              const abort = () => {
                options.signal.removeEventListener(
                  "abort",
                  abort
                );
                clock.abortListenerMap.delete(abort);
                clock.clearTimeout(handle);
                reject(options.signal.reason);
              };
              const handle = clock.setTimeout(() => {
                if (options.signal) {
                  options.signal.removeEventListener(
                    "abort",
                    abort
                  );
                  clock.abortListenerMap.delete(abort);
                }
                resolve2(value);
              }, delay2);
              if (options.signal) {
                if (options.signal.aborted) {
                  abort();
                } else {
                  options.signal.addEventListener(
                    "abort",
                    abort
                  );
                  clock.abortListenerMap.set(
                    abort,
                    options.signal
                  );
                }
              }
            });
          } else if (nameOfMethodToReplace === "setImmediate") {
            clock.timersPromisesModuleMethods.push({
              methodName: "setImmediate",
              original: timersPromisesModule.setImmediate
            });
            timersPromisesModule.setImmediate = (value, options = {}) => new Promise((resolve2, reject) => {
              const abort = () => {
                options.signal.removeEventListener(
                  "abort",
                  abort
                );
                clock.abortListenerMap.delete(abort);
                clock.clearImmediate(handle);
                reject(options.signal.reason);
              };
              const handle = clock.setImmediate(() => {
                if (options.signal) {
                  options.signal.removeEventListener(
                    "abort",
                    abort
                  );
                  clock.abortListenerMap.delete(abort);
                }
                resolve2(value);
              });
              if (options.signal) {
                if (options.signal.aborted) {
                  abort();
                } else {
                  options.signal.addEventListener(
                    "abort",
                    abort
                  );
                  clock.abortListenerMap.set(
                    abort,
                    options.signal
                  );
                }
              }
            });
          } else if (nameOfMethodToReplace === "setInterval") {
            clock.timersPromisesModuleMethods.push({
              methodName: "setInterval",
              original: timersPromisesModule.setInterval
            });
            timersPromisesModule.setInterval = (delay2, value, options = {}) => ({
              [Symbol.asyncIterator]: () => {
                const createResolvable = () => {
                  let resolve2, reject;
                  const promise = new Promise((res, rej) => {
                    resolve2 = res;
                    reject = rej;
                  });
                  promise.resolve = resolve2;
                  promise.reject = reject;
                  return promise;
                };
                let done = false;
                let hasThrown = false;
                let returnCall;
                let nextAvailable = 0;
                const nextQueue = [];
                const handle = clock.setInterval(() => {
                  if (nextQueue.length > 0) {
                    nextQueue.shift().resolve();
                  } else {
                    nextAvailable++;
                  }
                }, delay2);
                const abort = () => {
                  options.signal.removeEventListener(
                    "abort",
                    abort
                  );
                  clock.abortListenerMap.delete(abort);
                  clock.clearInterval(handle);
                  done = true;
                  for (const resolvable of nextQueue) {
                    resolvable.resolve();
                  }
                };
                if (options.signal) {
                  if (options.signal.aborted) {
                    done = true;
                  } else {
                    options.signal.addEventListener(
                      "abort",
                      abort
                    );
                    clock.abortListenerMap.set(
                      abort,
                      options.signal
                    );
                  }
                }
                return {
                  next: async () => {
                    if (options.signal?.aborted && !hasThrown) {
                      hasThrown = true;
                      throw options.signal.reason;
                    }
                    if (done) {
                      return { done: true, value: void 0 };
                    }
                    if (nextAvailable > 0) {
                      nextAvailable--;
                      return { done: false, value };
                    }
                    const resolvable = createResolvable();
                    nextQueue.push(resolvable);
                    await resolvable;
                    if (returnCall && nextQueue.length === 0) {
                      returnCall.resolve();
                    }
                    if (options.signal?.aborted && !hasThrown) {
                      hasThrown = true;
                      throw options.signal.reason;
                    }
                    if (done) {
                      return { done: true, value: void 0 };
                    }
                    return { done: false, value };
                  },
                  return: async () => {
                    if (done) {
                      return { done: true, value: void 0 };
                    }
                    if (nextQueue.length > 0) {
                      returnCall = createResolvable();
                      await returnCall;
                    }
                    clock.clearInterval(handle);
                    done = true;
                    if (options.signal) {
                      options.signal.removeEventListener(
                        "abort",
                        abort
                      );
                      clock.abortListenerMap.delete(abort);
                    }
                    return { done: true, value: void 0 };
                  }
                };
              }
            });
          }
        }
      }
      return clock;
    }
    return {
      timers,
      createClock,
      install,
      withGlobal
    };
  }
  const defaultImplementation = withGlobal(globalObject);
  fakeTimersSrc.timers = defaultImplementation.timers;
  fakeTimersSrc.createClock = defaultImplementation.createClock;
  fakeTimersSrc.install = defaultImplementation.install;
  fakeTimersSrc.withGlobal = withGlobal;
  return fakeTimersSrc;
}
var fakeTimersSrcExports = requireFakeTimersSrc();
var FakeTimers = class {
  _global;
  _clock;
  // | _fakingTime | _fakingDate |
  // +-------------+-------------+
  // | false       | falsy       | initial
  // | false       | truthy      | vi.setSystemTime called first (for mocking only Date without fake timers)
  // | true        | falsy       | vi.useFakeTimers called first
  // | true        | truthy      | unreachable
  _fakingTime;
  _fakingDate;
  _fakeTimers;
  _userConfig;
  _now = RealDate.now;
  constructor({ global: global3, config: config2 }) {
    this._userConfig = config2;
    this._fakingDate = null;
    this._fakingTime = false;
    this._fakeTimers = fakeTimersSrcExports.withGlobal(global3);
    this._global = global3;
  }
  clearAllTimers() {
    if (this._fakingTime) this._clock.reset();
  }
  dispose() {
    this.useRealTimers();
  }
  runAllTimers() {
    if (this._checkFakeTimers()) this._clock.runAll();
  }
  async runAllTimersAsync() {
    if (this._checkFakeTimers()) await this._clock.runAllAsync();
  }
  runOnlyPendingTimers() {
    if (this._checkFakeTimers()) this._clock.runToLast();
  }
  async runOnlyPendingTimersAsync() {
    if (this._checkFakeTimers()) await this._clock.runToLastAsync();
  }
  advanceTimersToNextTimer(steps = 1) {
    if (this._checkFakeTimers()) for (let i3 = steps; i3 > 0; i3--) {
      this._clock.next();
      this._clock.tick(0);
      if (this._clock.countTimers() === 0) break;
    }
  }
  async advanceTimersToNextTimerAsync(steps = 1) {
    if (this._checkFakeTimers()) for (let i3 = steps; i3 > 0; i3--) {
      await this._clock.nextAsync();
      this._clock.tick(0);
      if (this._clock.countTimers() === 0) break;
    }
  }
  advanceTimersByTime(msToRun) {
    if (this._checkFakeTimers()) this._clock.tick(msToRun);
  }
  async advanceTimersByTimeAsync(msToRun) {
    if (this._checkFakeTimers()) await this._clock.tickAsync(msToRun);
  }
  advanceTimersToNextFrame() {
    if (this._checkFakeTimers()) this._clock.runToFrame();
  }
  runAllTicks() {
    if (this._checkFakeTimers()) this._clock.runMicrotasks();
  }
  useRealTimers() {
    if (this._fakingDate) {
      resetDate();
      this._fakingDate = null;
    }
    if (this._fakingTime) {
      this._clock.uninstall();
      this._fakingTime = false;
    }
  }
  useFakeTimers() {
    const fakeDate = this._fakingDate || Date.now();
    if (this._fakingDate) {
      resetDate();
      this._fakingDate = null;
    }
    if (this._fakingTime) this._clock.uninstall();
    const toFake = Object.keys(this._fakeTimers.timers).filter((timer) => timer !== "nextTick" && timer !== "queueMicrotask");
    if (this._userConfig?.toFake?.includes("nextTick") && isChildProcess()) throw new Error("process.nextTick cannot be mocked inside child_process");
    this._clock = this._fakeTimers.install({
      now: fakeDate,
      ...this._userConfig,
      toFake: this._userConfig?.toFake || toFake,
      ignoreMissingTimers: true
    });
    this._fakingTime = true;
  }
  reset() {
    if (this._checkFakeTimers()) {
      const { now: now3 } = this._clock;
      this._clock.reset();
      this._clock.setSystemTime(now3);
    }
  }
  setSystemTime(now3) {
    const date = typeof now3 === "undefined" || now3 instanceof Date ? now3 : new Date(now3);
    if (this._fakingTime) this._clock.setSystemTime(date);
    else {
      this._fakingDate = date ?? new Date(this.getRealSystemTime());
      mockDate(this._fakingDate);
    }
  }
  getMockedSystemTime() {
    return this._fakingTime ? new Date(this._clock.now) : this._fakingDate;
  }
  getRealSystemTime() {
    return this._now();
  }
  getTimerCount() {
    if (this._checkFakeTimers()) return this._clock.countTimers();
    return 0;
  }
  setTimerTickMode(mode, interval) {
    if (this._checkFakeTimers()) if (mode === "manual") this._clock.setTickMode({ mode: "manual" });
    else if (mode === "nextTimerAsync") this._clock.setTickMode({ mode: "nextAsync" });
    else if (mode === "interval") this._clock.setTickMode({
      mode: "interval",
      delta: interval
    });
    else throw new Error(`Invalid tick mode: ${mode}`);
  }
  configure(config2) {
    this._userConfig = config2;
  }
  isFakeTimers() {
    return this._fakingTime;
  }
  _checkFakeTimers() {
    if (!this._fakingTime) throw new Error("A function to advance timers was called but the timers APIs are not mocked. Call `vi.useFakeTimers()` in the test file first.");
    return this._fakingTime;
  }
};
function copyStackTrace(target, source) {
  if (source.stack !== void 0) target.stack = source.stack.replace(source.message, target.message);
  return target;
}
function waitFor(callback, options = {}) {
  const { setTimeout: setTimeout3, setInterval: setInterval2, clearTimeout: clearTimeout3, clearInterval: clearInterval2 } = getSafeTimers();
  const { interval = 50, timeout = 1e3 } = typeof options === "number" ? { timeout: options } : options;
  const STACK_TRACE_ERROR = /* @__PURE__ */ new Error("STACK_TRACE_ERROR");
  return new Promise((resolve2, reject) => {
    let lastError;
    let promiseStatus = "idle";
    let timeoutId;
    let intervalId;
    const onResolve = (result) => {
      if (timeoutId) clearTimeout3(timeoutId);
      if (intervalId) clearInterval2(intervalId);
      resolve2(result);
    };
    const handleTimeout = () => {
      if (intervalId) clearInterval2(intervalId);
      let error = lastError;
      if (!error) error = copyStackTrace(/* @__PURE__ */ new Error("Timed out in waitFor!"), STACK_TRACE_ERROR);
      reject(error);
    };
    const checkCallback = () => {
      if (vi.isFakeTimers()) vi.advanceTimersByTime(interval);
      if (promiseStatus === "pending") return;
      try {
        const result = callback();
        if (result !== null && typeof result === "object" && typeof result.then === "function") {
          const thenable = result;
          promiseStatus = "pending";
          thenable.then((resolvedValue) => {
            promiseStatus = "resolved";
            onResolve(resolvedValue);
          }, (rejectedValue) => {
            promiseStatus = "rejected";
            lastError = rejectedValue;
          });
        } else {
          onResolve(result);
          return true;
        }
      } catch (error) {
        lastError = error;
      }
    };
    if (checkCallback() === true) return;
    timeoutId = setTimeout3(handleTimeout, timeout);
    intervalId = setInterval2(checkCallback, interval);
  });
}
function waitUntil(callback, options = {}) {
  const { setTimeout: setTimeout3, setInterval: setInterval2, clearTimeout: clearTimeout3, clearInterval: clearInterval2 } = getSafeTimers();
  const { interval = 50, timeout = 1e3 } = typeof options === "number" ? { timeout: options } : options;
  const STACK_TRACE_ERROR = /* @__PURE__ */ new Error("STACK_TRACE_ERROR");
  return new Promise((resolve2, reject) => {
    let promiseStatus = "idle";
    let timeoutId;
    let intervalId;
    const onReject = (error) => {
      if (intervalId) clearInterval2(intervalId);
      if (!error) error = copyStackTrace(/* @__PURE__ */ new Error("Timed out in waitUntil!"), STACK_TRACE_ERROR);
      reject(error);
    };
    const onResolve = (result) => {
      if (!result) return;
      if (timeoutId) clearTimeout3(timeoutId);
      if (intervalId) clearInterval2(intervalId);
      resolve2(result);
      return true;
    };
    const checkCallback = () => {
      if (vi.isFakeTimers()) vi.advanceTimersByTime(interval);
      if (promiseStatus === "pending") return;
      try {
        const result = callback();
        if (result !== null && typeof result === "object" && typeof result.then === "function") {
          const thenable = result;
          promiseStatus = "pending";
          thenable.then((resolvedValue) => {
            promiseStatus = "resolved";
            onResolve(resolvedValue);
          }, (rejectedValue) => {
            promiseStatus = "rejected";
            onReject(rejectedValue);
          });
        } else return onResolve(result);
      } catch (error) {
        onReject(error);
      }
    };
    if (checkCallback() === true) return;
    timeoutId = setTimeout3(onReject, timeout);
    intervalId = setInterval2(checkCallback, interval);
  });
}
function createVitest() {
  let _config = null;
  const state = () => getWorkerState();
  let _timers;
  const timers = () => _timers ||= new FakeTimers({
    global: globalThis,
    config: state().config.fakeTimers
  });
  const _stubsGlobal = /* @__PURE__ */ new Map();
  const _stubsEnv = /* @__PURE__ */ new Map();
  const _envBooleans = [
    "PROD",
    "DEV",
    "SSR"
  ];
  const utils = {
    useFakeTimers(config2) {
      if (isChildProcess()) {
        if (config2?.toFake?.includes("nextTick") || state().config?.fakeTimers?.toFake?.includes("nextTick")) throw new Error('vi.useFakeTimers({ toFake: ["nextTick"] }) is not supported in node:child_process. Use --pool=threads if mocking nextTick is required.');
      }
      if (config2) timers().configure({
        ...state().config.fakeTimers,
        ...config2
      });
      else timers().configure(state().config.fakeTimers);
      timers().useFakeTimers();
      return utils;
    },
    isFakeTimers() {
      return timers().isFakeTimers();
    },
    useRealTimers() {
      timers().useRealTimers();
      return utils;
    },
    runOnlyPendingTimers() {
      timers().runOnlyPendingTimers();
      return utils;
    },
    async runOnlyPendingTimersAsync() {
      await timers().runOnlyPendingTimersAsync();
      return utils;
    },
    runAllTimers() {
      timers().runAllTimers();
      return utils;
    },
    async runAllTimersAsync() {
      await timers().runAllTimersAsync();
      return utils;
    },
    runAllTicks() {
      timers().runAllTicks();
      return utils;
    },
    advanceTimersByTime(ms) {
      timers().advanceTimersByTime(ms);
      return utils;
    },
    async advanceTimersByTimeAsync(ms) {
      await timers().advanceTimersByTimeAsync(ms);
      return utils;
    },
    advanceTimersToNextTimer() {
      timers().advanceTimersToNextTimer();
      return utils;
    },
    async advanceTimersToNextTimerAsync() {
      await timers().advanceTimersToNextTimerAsync();
      return utils;
    },
    advanceTimersToNextFrame() {
      timers().advanceTimersToNextFrame();
      return utils;
    },
    getTimerCount() {
      return timers().getTimerCount();
    },
    setSystemTime(time) {
      timers().setSystemTime(time);
      return utils;
    },
    getMockedSystemTime() {
      return timers().getMockedSystemTime();
    },
    getRealSystemTime() {
      return timers().getRealSystemTime();
    },
    clearAllTimers() {
      timers().clearAllTimers();
      return utils;
    },
    setTimerTickMode(mode, interval) {
      timers().setTimerTickMode(mode, interval);
      return utils;
    },
    spyOn,
    fn,
    waitFor,
    waitUntil,
    defineHelper: (fn2) => {
      return function __VITEST_HELPER__(...args) {
        const result = fn2(...args);
        if (result && typeof result === "object" && typeof result.then === "function") return (async function __VITEST_HELPER__2() {
          return await result;
        })();
        return result;
      };
    },
    hoisted(factory) {
      assertTypes(factory, '"vi.hoisted" factory', ["function"]);
      return factory();
    },
    mock(path, factory) {
      if (typeof path !== "string") throw new TypeError(`vi.mock() expects a string path, but received a ${typeof path}`);
      const importer = getImporter("mock");
      _mocker().queueMock(path, importer, typeof factory === "function" ? () => factory(() => _mocker().importActual(path, importer, _mocker().getMockContext().callstack)) : factory);
    },
    unmock(path) {
      if (typeof path !== "string") throw new TypeError(`vi.unmock() expects a string path, but received a ${typeof path}`);
      _mocker().queueUnmock(path, getImporter("unmock"));
    },
    doMock(path, factory) {
      if (typeof path !== "string") throw new TypeError(`vi.doMock() expects a string path, but received a ${typeof path}`);
      const importer = getImporter("doMock");
      _mocker().queueMock(path, importer, typeof factory === "function" ? () => factory(() => _mocker().importActual(path, importer, _mocker().getMockContext().callstack)) : factory);
      const rv = {};
      if (Symbol.dispose) rv[Symbol.dispose] = () => {
        _mocker().queueUnmock(path, importer);
      };
      return rv;
    },
    doUnmock(path) {
      if (typeof path !== "string") throw new TypeError(`vi.doUnmock() expects a string path, but received a ${typeof path}`);
      const importer = getImporter("doUnmock");
      _mocker().queueUnmock(path, importer);
    },
    async importActual(path) {
      const importer = getImporter("importActual");
      return _mocker().importActual(path, importer, _mocker().getMockContext().callstack);
    },
    async importMock(path) {
      const importer = getImporter("importMock");
      return _mocker().importMock(path, importer);
    },
    mockObject(value, options) {
      return _mocker().mockObject({ value }, void 0, options?.spy ? "autospy" : "automock").value;
    },
    mocked(item, _options = {}) {
      return item;
    },
    isMockFunction(fn2) {
      return isMockFunction(fn2);
    },
    clearAllMocks() {
      clearAllMocks();
      return utils;
    },
    resetAllMocks() {
      resetAllMocks();
      return utils;
    },
    restoreAllMocks() {
      restoreAllMocks();
      return utils;
    },
    stubGlobal(name, value) {
      if (!_stubsGlobal.has(name)) _stubsGlobal.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
      Object.defineProperty(globalThis, name, {
        value,
        writable: true,
        configurable: true,
        enumerable: true
      });
      return utils;
    },
    stubEnv(name, value) {
      const env = state().metaEnv;
      if (!_stubsEnv.has(name)) _stubsEnv.set(name, env[name]);
      if (_envBooleans.includes(name)) env[name] = value ? "1" : "";
      else if (value === void 0) delete env[name];
      else env[name] = String(value);
      return utils;
    },
    unstubAllGlobals() {
      _stubsGlobal.forEach((original, name) => {
        if (!original) Reflect.deleteProperty(globalThis, name);
        else Object.defineProperty(globalThis, name, original);
      });
      _stubsGlobal.clear();
      return utils;
    },
    unstubAllEnvs() {
      const env = state().metaEnv;
      _stubsEnv.forEach((original, name) => {
        if (original === void 0) delete env[name];
        else env[name] = original;
      });
      _stubsEnv.clear();
      return utils;
    },
    resetModules() {
      resetModules(state().evaluatedModules);
      return utils;
    },
    async dynamicImportSettled() {
      return waitForImportsToResolve();
    },
    setConfig(config2) {
      if (!_config) _config = { ...state().config };
      Object.assign(state().config, config2);
    },
    resetConfig() {
      if (_config) Object.assign(state().config, _config);
    }
  };
  return utils;
}
var vitest = createVitest();
var vi = vitest;
function _mocker() {
  return typeof __vitest_mocker__ !== "undefined" ? __vitest_mocker__ : new Proxy({}, { get(_2, name) {
    throw new Error(`Vitest mocker was not initialized in this environment. vi.${String(name)}() is forbidden.`);
  } });
}
function getImporter(name) {
  const stackArray = createSimpleStackTrace({ stackTraceLimit: 5 }).split("\n");
  return parseSingleStack(stackArray[stackArray.findLastIndex((stack) => {
    return stack.includes(` at Object.${name}`) || stack.includes(`${name}@`) || stack.includes(` at ${name} (`);
  }) + 1])?.file || "";
}

// ../../node_modules/.pnpm/vite@7.3.1_@types+node@25.5.1_stylus@0.59.0_terser@5.46.1_tsx@4.21.0_yaml@2.8.3/node_modules/vite/dist/node/module-runner.js
var SOURCEMAPPING_URL = "sourceMa";
SOURCEMAPPING_URL += "ppingURL";
var isWindows = typeof process < "u" && process.platform === "win32";
var AsyncFunction = async function() {
}.constructor;
var chars2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var intToChar2 = new Uint8Array(64);
var charToInt2 = new Uint8Array(128);
for (let i3 = 0; i3 < chars2.length; i3++) {
  let c2 = chars2.charCodeAt(i3);
  intToChar2[i3] = c2, charToInt2[c2] = i3;
}
var MODULE_RUNNER_SOURCEMAPPING_REGEXP = /* @__PURE__ */ RegExp(`//# ${SOURCEMAPPING_URL}=data:application/json;base64,(.+)`);
var retrieveFileHandlers = /* @__PURE__ */ new Set();
var retrieveSourceMapHandlers = /* @__PURE__ */ new Set();
var createExecHandlers = (handlers) => ((...args) => {
  for (let handler of handlers) {
    let result = handler(...args);
    if (result) return result;
  }
  return null;
});
var retrieveFileFromHandlers = createExecHandlers(retrieveFileHandlers);
var retrieveSourceMapFromHandlers = createExecHandlers(retrieveSourceMapHandlers);
var originalPrepare = Error.prepareStackTrace;
var customizationHookNamespace = "vite-module-runner:import-meta-resolve/v1/";
var customizationHooksModule = `

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(${JSON.stringify(customizationHookNamespace)})) {
    const data = specifier.slice(${JSON.stringify(customizationHookNamespace)}.length)
    const [parsedSpecifier, parsedImporter] = JSON.parse(data)
    specifier = parsedSpecifier
    context.parentURL = parsedImporter
  }
  return nextResolve(specifier, context)
}

`;
`${customizationHookNamespace}`;
var envProxy = new Proxy({}, { get(_2, p2) {
  throw Error(`[module runner] Dynamic access of "import.meta.env" is not supported. Please, use "import.meta.env.${String(p2)}" instead.`);
} });

// ../../node_modules/.pnpm/vitest@4.1.2_@opentelemetry+api@1.9.0_@types+node@25.5.1_vite@7.3.1_@types+node@25.5.1__db5ed10e0f1f36c7c04da8d42b6dbc45/node_modules/vitest/dist/index.js
var import_expect_type = __toESM(require_dist(), 1);

// ../../node_modules/.pnpm/aws-sdk-vitest-mock@1.0.55_@aws-sdk+core@3.973.26_vitest@4.1.2_@opentelemetry+api@1.9.0_564c9e47d957cbee0e9e478e77855009/node_modules/aws-sdk-vitest-mock/index.js
import { readFileSync as r } from "fs";
import i2 from "path";
import { Readable as a } from "stream";
var o = class e2 extends Error {
  constructor(t, n2, r2, i3) {
    super(t), this.name = n2, this.code = n2, this.statusCode = r2, this.retryable = i3, this.$metadata = { httpStatusCode: r2 }, Object.setPrototypeOf(this, e2.prototype);
  }
};
var s = (e3) => new o(e3 ? `The specified key does not exist. Key: ${e3}` : "The specified key does not exist.", "NoSuchKey", 404, false);
var c = (e3) => new o(e3 ? `The specified bucket does not exist. Bucket: ${e3}` : "The specified bucket does not exist.", "NoSuchBucket", 404, false);
var l = (e3) => new o(e3 ? `Access Denied for resource: ${e3}` : "Access Denied", "AccessDenied", 403, false);
var u = (e3) => new o(e3 ? `Requested resource not found: ${e3}` : "Requested resource not found", "ResourceNotFoundException", 400, false);
var d2 = () => new o("The conditional request failed", "ConditionalCheckFailedException", 400, false);
var f = () => new o("Rate exceeded", "Throttling", 400, true);
var p = () => new o("We encountered an internal error. Please try again.", "InternalServerError", 500, true);
var m = (e3) => {
  try {
    return JSON.stringify(e3, void 0, 2);
  } catch {
    return typeof e3 == "object" && e3 ? "[Complex Object]" : typeof e3 == "string" ? e3 : typeof e3 == "number" || typeof e3 == "boolean" ? String(e3) : "[Non-serializable value]";
  }
};
var h = (t, n2) => {
  let r2 = e.magenta("aws-sdk-vitest-mock(debug):");
  if (n2 === void 0) console.log(`${r2} ${t}`);
  else {
    let e3 = m(n2);
    console.log(`${r2} ${t}
${e3}`);
  }
};
var g = (e3 = false) => ({
  enabled: e3,
  explicitlySet: false,
  log(e4, t) {
    this.enabled && h(e4, t);
  },
  logDirect(e4, t) {
    h(e4, t);
  }
});
var _ = (e3) => {
  e3.enabled = true, e3.explicitlySet = true;
};
var v = (e3) => {
  e3.enabled = false, e3.explicitlySet = true;
};
var y2 = (e3) => e3 instanceof Error ? e3.message : typeof e3 == "string" ? e3 : "Unknown error";
var b2 = (e3, t) => {
  let n2 = Error(e3);
  return n2.cause = t, n2;
};
var x = (e3) => {
  if (!e3 || typeof e3 != "string") throw TypeError("filePath must be a non-empty string");
  let t = i2.resolve(e3);
  try {
    let n2 = r(t, "utf8");
    if (e3.endsWith(".json")) try {
      return JSON.parse(n2);
    } catch (e4) {
      throw b2(`Failed to parse JSON fixture at ${t}: ${y2(e4)}`, e4);
    }
    return n2;
  } catch (e4) {
    throw b2(`Failed to load fixture at ${t}: ${y2(e4)}`, e4);
  }
};
var S = (e3, t = {}) => {
  let { pageSize: n2 = 10, tokenKey: r2 = "NextToken", itemsKey: i3 = "Items" } = t;
  if (!Number.isInteger(n2) || n2 <= 0) throw TypeError("pageSize must be a positive integer");
  if (e3.length === 0) return [{ [i3]: [] }];
  let a2 = [];
  for (let t2 = 0; t2 < e3.length; t2 += n2) {
    let o2 = e3.slice(t2, t2 + n2), s2 = t2 + n2 < e3.length, c2 = { [i3]: o2 };
    if (s2) {
      let e4 = c2;
      e4[r2] = o2.at(-1);
    }
    a2.push(c2);
  }
  return a2;
};
var C2 = () => typeof process < "u" && process.versions?.node ? "node" : typeof process < "u" && process.versions?.bun ? "bun" : "browser";
var w = (e3) => {
  let t = typeof e3 == "string" ? Buffer.from(e3, "utf8") : Buffer.from(e3), n2 = false;
  return new a({ read() {
    n2 ||= (this.push(t), this.push(null), true);
  } });
};
var T = (e3) => {
  let t;
  return t = typeof e3 == "string" ? new TextEncoder().encode(e3) : e3 instanceof Buffer ? new Uint8Array(e3) : e3, new ReadableStream({ start(e4) {
    e4.enqueue(t), e4.close();
  } });
};
var E = (e3) => {
  if (e3 == null) throw TypeError("data must be a string, Buffer, or Uint8Array");
  let t = C2();
  return t === "node" || t === "bun" ? w(e3) : T(e3);
};
var D = false;
function k(e3) {
  return e3.explicitlySet ? e3.enabled : D;
}
function A(e3, t) {
  return Object.keys(t).every((n2) => {
    let r2 = t[n2], i3 = e3[n2];
    return Array.isArray(r2) ? !Array.isArray(i3) || r2.length > i3.length ? false : r2.every((e4, t2) => {
      let n3 = i3[t2];
      return e4 && typeof e4 == "object" && typeof n3 == "object" && n3 ? A(n3, e4) : n3 === e4;
    }) : r2 && typeof r2 == "object" && !Array.isArray(r2) ? typeof i3 != "object" || !i3 ? false : A(i3, r2) : i3 === r2;
  });
}
function j(e3, t) {
  if (e3 === t) return true;
  if (typeof e3 != "object" || !e3 || typeof t != "object" || !t) return e3 === t;
  if (Array.isArray(e3) && Array.isArray(t)) return e3.length === t.length ? e3.every((e4, n3) => {
    let r3 = t[n3];
    return typeof e4 == "object" && e4 && typeof r3 == "object" && r3 ? j(e4, r3) : e4 === r3;
  }) : false;
  if (Array.isArray(e3) !== Array.isArray(t)) return false;
  let n2 = Object.keys(e3), r2 = Object.keys(t);
  return n2.length === r2.length ? r2.every((n3) => {
    if (!Object.prototype.hasOwnProperty.call(e3, n3)) return false;
    let r3 = e3, i3 = t, a2 = r3[n3], o2 = i3[n3];
    return typeof a2 == "object" && a2 && typeof o2 == "object" && o2 ? j(a2, o2) : a2 === o2;
  }) : false;
}
function M(e3, t, n2) {
  let r2 = t.map((e4, t2) => {
    let n3 = e4.matcher ? JSON.stringify(e4.matcher, void 0, 2) : "any input", r3 = e4.strict ? " (strict mode)" : "";
    return `  Mock #${t2 + 1}: ${n3}${r3}`;
  }).join("\n"), i3 = JSON.stringify(n2, void 0, 2);
  return /* @__PURE__ */ Error(`No matching mock found for ${e3}.

Found ${t.length} mock(s) but none matched the input.

Configured mocks:
${r2}

Received input:
${i3}

Tip: Enable debug mode with enableDebug() for detailed matching information.`);
}
function N(e3, t) {
  let n2 = JSON.stringify(t, void 0, 2);
  return /* @__PURE__ */ Error(`No mock configured for command: ${e3}.

Received input:
${n2}

Did you forget to call mockClient.on(${e3})?`);
}
function P(e3, t) {
  return e3.findIndex((e4) => e4.strict ? e4.matcher && j(t, e4.matcher) : !e4.matcher || A(t, e4.matcher));
}
function F(e3) {
  return async function(t) {
    let n2 = () => this, r2 = k(e3.debugLogger), i3 = t.constructor.name;
    r2 && e3.debugLogger.logDirect(`Received command: ${i3}`, t.input);
    let a2 = e3.map.get(t.constructor);
    if (!a2) throw r2 && e3.debugLogger.logDirect(`No mocks configured for ${i3}`), N(i3, t.input);
    r2 && e3.debugLogger.logDirect(`Found ${a2.length} mock(s) for ${i3}`);
    let o2 = P(a2, t.input);
    if (o2 === -1) throw r2 && e3.debugLogger.logDirect(`No matching mock found for ${i3}`, t.input), M(i3, a2, t.input);
    let s2 = a2[o2];
    if (!s2) throw Error(`Mock at index ${o2} not found`);
    return r2 && e3.debugLogger.logDirect(`Using mock at index ${o2} for ${i3}`), s2.once && (a2.splice(o2, 1), r2 && e3.debugLogger.logDirect(`Removed one-time mock for ${i3}`)), s2.handler(t.input, n2());
  };
}
var I = (e3, t, n2) => ({
  reset() {
    k(e3.debugLogger) && e3.debugLogger.logDirect(n2.reset), t.mockClear();
  },
  restore() {
    k(e3.debugLogger) && e3.debugLogger.logDirect(n2.restore), t.mockRestore(), e3.map = /* @__PURE__ */ new WeakMap();
  },
  calls() {
    return t.mock.calls.map((e4) => e4[0]);
  },
  __rawCalls() {
    return t.mock.calls;
  },
  enableDebug() {
    _(e3.debugLogger);
  },
  disableDebug() {
    v(e3.debugLogger);
  }
});
function L(e3, t, n2, r2 = {}) {
  let i3 = (i4, a3, o2) => {
    let s2 = {
      matcher: n2,
      handler: i4,
      once: a3,
      strict: !!r2.strict
    }, c2 = e3.map.get(t) ?? [], l2 = k(e3.debugLogger);
    if (a3) {
      let i5 = c2.findIndex((e4) => !e4.once);
      i5 === -1 ? c2.push(s2) : c2.splice(i5, 0, s2), e3.map.set(t, c2), l2 && e3.debugLogger.logDirect(`Configured ${o2}Once for ${t.name}`, n2 ? {
        matcher: n2,
        strict: !!r2.strict
      } : void 0);
    } else {
      let i5 = c2.filter((e4) => e4.once || JSON.stringify(e4.matcher) !== JSON.stringify(n2));
      i5.push(s2), e3.map.set(t, i5), l2 && e3.debugLogger.logDirect(`Configured ${o2} for ${t.name}`, n2 ? {
        matcher: n2,
        strict: !!r2.strict
      } : void 0);
    }
  }, a2 = {
    resolves(e4) {
      return i3(() => Promise.resolve(e4), false, "resolves"), a2;
    },
    rejects(e4) {
      return i3(() => {
        let t2 = typeof e4 == "string" ? Error(e4) : e4;
        return Promise.reject(t2);
      }, false, "rejects"), a2;
    },
    callsFake(e4) {
      return i3(e4, false, "callsFake"), a2;
    },
    resolvesOnce(e4) {
      return i3(() => Promise.resolve(e4), true, "resolves"), a2;
    },
    rejectsOnce(e4) {
      return i3(() => {
        let t2 = typeof e4 == "string" ? Error(e4) : e4;
        return Promise.reject(t2);
      }, true, "rejects"), a2;
    },
    callsFakeOnce(e4) {
      return i3(e4, true, "callsFake"), a2;
    },
    resolvesStream(e4) {
      return i3(() => Promise.resolve({ Body: E(e4) }), false, "resolvesStream"), a2;
    },
    resolvesStreamOnce(e4) {
      return i3(() => Promise.resolve({ Body: E(e4) }), true, "resolvesStream"), a2;
    },
    resolvesWithDelay(e4, t2) {
      let n3 = (n4) => {
        setTimeout(() => n4(e4), t2);
      };
      return i3(() => new Promise(n3), false, "resolvesWithDelay"), a2;
    },
    rejectsWithDelay(e4, t2) {
      let n3 = typeof e4 == "string" ? Error(e4) : e4, r3 = (e5, r4) => {
        setTimeout(() => r4(n3), t2);
      };
      return i3(() => new Promise(r3), false, "rejectsWithDelay"), a2;
    },
    rejectsWithNoSuchKey(e4) {
      return i3(() => Promise.reject(s(e4)), false, "rejectsWithNoSuchKey"), a2;
    },
    rejectsWithNoSuchBucket(e4) {
      return i3(() => Promise.reject(c(e4)), false, "rejectsWithNoSuchBucket"), a2;
    },
    rejectsWithAccessDenied(e4) {
      return i3(() => Promise.reject(l(e4)), false, "rejectsWithAccessDenied"), a2;
    },
    rejectsWithResourceNotFound(e4) {
      return i3(() => Promise.reject(u(e4)), false, "rejectsWithResourceNotFound"), a2;
    },
    rejectsWithConditionalCheckFailed() {
      return i3(() => Promise.reject(d2()), false, "rejectsWithConditionalCheckFailed"), a2;
    },
    rejectsWithThrottling() {
      return i3(() => Promise.reject(f()), false, "rejectsWithThrottling"), a2;
    },
    rejectsWithInternalServerError() {
      return i3(() => Promise.reject(p()), false, "rejectsWithInternalServerError"), a2;
    },
    resolvesPaginated(n3, r3 = {}) {
      let o2 = S(n3, r3), s2 = 0;
      return e3.debugLogger.log(`Configured resolvesPaginated for ${t.name}`, {
        pageSize: r3.pageSize,
        itemsCount: n3.length
      }), i3((e4) => {
        let t2 = r3.tokenKey || "NextToken", n4 = e4[r3.inputTokenKey || t2];
        if (n4 != null) {
          let e5 = r3.itemsKey || "Items", t3 = 0;
          for (let r4 of o2) {
            let i5 = r4[e5];
            if (i5 && i5.length > 0) {
              let e6 = i5.at(-1);
              if (JSON.stringify(e6) === JSON.stringify(n4)) {
                s2 = t3 + 1;
                break;
              }
            }
            t3++;
          }
        } else s2 = 0;
        let i4 = o2[s2] || o2.at(-1) || o2[0];
        if (!i4) throw Error("No paginated responses available");
        return s2 = Math.min(s2 + 1, o2.length - 1), Promise.resolve(i4);
      }, false, "resolvesPaginated"), a2;
    },
    resolvesFromFile(n3) {
      return e3.debugLogger.log(`Configured resolvesFromFile for ${t.name}`, { filePath: n3 }), i3(() => {
        let e4 = x(n3);
        return Promise.resolve(e4);
      }, false, "resolvesFromFile"), a2;
    }
  };
  return a2;
}
var R = (e3) => {
  let t = {
    map: /* @__PURE__ */ new WeakMap(),
    debugLogger: g()
  }, r2 = e3.prototype;
  return {
    client: void 0,
    on: (e4, n2, r3) => L(t, e4, n2, r3),
    ...I(t, vi.spyOn(r2, "send").mockImplementation(F(t)), {
      reset: "Clearing call history (mocks preserved)",
      restore: "Restoring original client behavior and clearing all mocks"
    })
  };
};

// src/mock.ts
var globalList = {};
var mockEcs = (tasks) => {
  const alreadyMocked = Object.keys(globalList).length > 0;
  const list = mockObjectValues(tasks);
  Object.assign(globalList, list);
  if (alreadyMocked) {
    return list;
  }
  const client = R(ECSClient3);
  client.on(RunTaskCommand2).callsFake(async (input) => {
    const name = input.taskDefinition ?? "";
    const callback = globalList[name];
    if (!callback) {
      throw new TypeError(`ECS mock function not defined for: ${name}`);
    }
    const envVars = input.overrides?.containerOverrides?.[0]?.environment ?? [];
    const payloadEntry = envVars.find((e3) => e3.name === "PAYLOAD");
    const payload = payloadEntry?.value ? parse(payloadEntry.value) : void 0;
    await nextTick(callback, payload);
    return {
      tasks: [
        {
          taskArn: `arn:aws:ecs:us-east-1:000000000000:task/mock/${name}`
        }
      ],
      failures: []
    };
  });
  beforeEach && beforeEach(() => {
    Object.values(globalList).forEach((fn2) => {
      fn2.mockClear();
    });
  });
  return list;
};
export {
  ECSClient4 as ECSClient,
  ecsClient,
  mockEcs,
  runTask
};
/*! Bundled license information:

@vitest/pretty-format/dist/index.js:
  (**
   * @license React
   * react-is.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
  (**
   * @license React
   * react-is.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

@vitest/snapshot/dist/index.js:
  (*
   * @version    1.4.0
   * @date       2015-10-26
   * @stability  3 - Stable
   * @author     Lauri Rooden (https://github.com/litejs/natural-compare-lite)
   * @license    MIT License
   *)
*/
