"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  chatgpt: () => chatgpt,
  i18n: () => createI18nPlugin,
  mock: () => mock
});
module.exports = __toCommonJS(src_exports);

// src/cache.ts
var import_promises = require("fs/promises");
var import_path = require("path");
var loadCache = async (cwd) => {
  try {
    const data = await (0, import_promises.readFile)((0, import_path.join)(cwd, "i18n.json"), "utf8");
    return new Cache(JSON.parse(data));
  } catch (error) {
    return new Cache();
  }
};
var saveCache = async (cwd, cache) => {
  await (0, import_promises.writeFile)((0, import_path.join)(cwd, "i18n.json"), JSON.stringify(cache, void 0, 2));
};
var Cache = class {
  constructor(data = {}) {
    this.data = data;
  }
  set(original, locale, translation) {
    if (!this.data[original]) {
      this.data[original] = {};
    }
    if (!this.data[original][locale]) {
      this.data[original][locale] = translation;
    }
  }
  get(original, locale) {
    return this.data[original]?.[locale];
  }
  has(original, locale) {
    return typeof this.get(original, locale) === "string";
  }
  delete(original, locale) {
    if (this.data[original]?.[locale]) {
      delete this.data[original][locale];
    }
    if (this.data[original] && Object.keys(this.data[original]).length === 0) {
      delete this.data[original];
    }
  }
  *entries() {
    for (const [original, locales] of Object.entries(this.data)) {
      for (const [locale, translation] of Object.entries(locales)) {
        yield { original, locale, translation };
      }
    }
  }
  // *originals() {
  // 	for (const [original] of Object.entries(this.data)) {
  // 		yield original
  // 	}
  // }
  toJSON() {
    return this.data;
  }
};

// src/diff.ts
var findNewTranslations = (cache, originals, locales) => {
  const list = [];
  for (const original of originals) {
    for (const locale of locales) {
      if (!cache.has(original, locale)) {
        list.push({ original, locale });
      }
    }
  }
  return list;
};
var removeUnusedTranslations = (cache, originals, locales) => {
  for (const item of cache.entries()) {
    if (!locales.includes(item.locale) || !originals.includes(item.original)) {
      cache.delete(item.original, item.locale);
    }
  }
};

// src/find.ts
var import_promises2 = require("fs/promises");
var import_glob = require("glob");
var import_path2 = require("path");

// src/find/svelte.ts
var import_line_column = __toESM(require("line-column"), 1);
var import_compiler = require("svelte/compiler");
var findSvelteTranslatable = (code) => {
  const found = [];
  const origin = (0, import_line_column.default)(code);
  const ast = (0, import_compiler.parse)(code, {
    css: false
  });
  const enter = (node) => {
    if (
      //
      node.type === "TaggedTemplateExpression" && node.tag.type === "Identifier" && node.tag.name === "$t" && node.quasi.type === "TemplateLiteral" && node.quasi.loc
    ) {
      const start = node.quasi.loc.start;
      const end = node.quasi.loc.end;
      const content = code.substring(
        origin.toIndex(start.line, start.column) + 2,
        origin.toIndex(end.line, end.column)
      );
      found.push(content);
    }
  };
  (0, import_compiler.walk)(ast.html, { enter });
  if (ast.instance) {
    (0, import_compiler.walk)(ast.instance.content, { enter });
  }
  if (ast.module) {
    (0, import_compiler.walk)(ast.module.content, { enter });
  }
  return found;
};

// src/find/typescript.ts
var import_core = require("@swc/core");
var import_swc_walk = require("swc-walk");
var findTypescriptTranslatable = async (code) => {
  const found = [];
  const ast = await (0, import_core.parse)(code, {
    syntax: "typescript",
    script: true
  });
  (0, import_swc_walk.simple)(ast, {
    TaggedTemplateExpression(node) {
      if (node.tag.type === "CallExpression" && node.tag.callee.type === "Identifier" && node.tag.callee.value === "get" && node.template.type === "TemplateLiteral") {
        const content = code.substring(
          node.template.span.start - ast.span.start + 1,
          node.template.span.end - ast.span.start - 1
        );
        found.push(content);
      }
    }
  });
  return found;
};

// src/find.ts
var findTranslatable = async (cwd) => {
  const files = await (0, import_glob.glob)("**/*.{js,ts,svelte}", {
    cwd,
    ignore: ["**/node_modules"]
  });
  const found = [];
  for (const file of files) {
    const code = await (0, import_promises2.readFile)((0, import_path2.join)(cwd, file), "utf8");
    if (code.includes("$t`")) {
      if ((0, import_path2.extname)(file) === ".svelte") {
        found.push(...findSvelteTranslatable(code));
      }
    }
    if (code.includes("get(t)`")) {
      found.push(...await findTypescriptTranslatable(code));
    }
  }
  return found;
};

// src/vite.ts
var createI18nPlugin = (props) => {
  let cache;
  return [
    {
      name: "awsless/i18n",
      enforce: "pre",
      async buildStart() {
        const cwd = process.cwd();
        const originals = await findTranslatable(cwd);
        cache = await loadCache(cwd);
        removeUnusedTranslations(cache, originals, props.locales);
        const newOriginals = findNewTranslations(cache, originals, props.locales);
        if (newOriginals.length > 0) {
          const translations = await props.translate(props.default ?? "en", newOriginals);
          for (const item of translations) {
            cache.set(item.original, item.locale, item.translation);
          }
        }
        await saveCache(cwd, cache);
      },
      transform(code) {
        let replaced = false;
        if (code.includes(`$t\``)) {
          for (const item of cache.entries()) {
            code = code.replaceAll(`$t\`${item.original}\``, (_, original) => {
              replaced = true;
              return `$t.get(\`${original}\`, {${props.locales.map((locale) => {
                return `"${locale}":\`${cache.get(original, locale)}\``;
              }).join(",")}})`;
            });
          }
        }
        if (code.includes(`get(t)\``)) {
          for (const item of cache.entries()) {
            code = code.replaceAll(`get(t)\`${item.original}\``, (_, original) => {
              replaced = true;
              return `get(t).get(\`${original}\`, {${props.locales.map((locale) => {
                return `"${locale}":\`${cache.get(original, locale)}\``;
              }).join(",")}})`;
            });
          }
        }
        if (!replaced) {
          return;
        }
        return {
          code
        };
      }
    }
  ];
};

// src/translate/chat-gpt.ts
var import_openai = __toESM(require("openai"), 1);
var import_zod = require("openai/helpers/zod");
var import_zod2 = require("zod");
var chatgpt = (props) => {
  const format = (0, import_zod.zodResponseFormat)(
    import_zod2.z.object({
      translations: import_zod2.z.object({
        original: import_zod2.z.string(),
        locale: import_zod2.z.string(),
        translation: import_zod2.z.string()
      }).array()
    }),
    "final_schema"
  );
  return async (originalLocale, list) => {
    const client = new import_openai.default(props);
    const response = await client.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      max_tokens: 4095,
      n: 1,
      temperature: 1,
      response_format: format,
      messages: [
        { role: "system", content: "You are a helpful translator." },
        { role: "user", content: prompt(originalLocale, list, props?.rules) }
      ]
    });
    const json = response.choices[0]?.message.content;
    if (!json) {
      throw new Error("Invalid chat gpt response");
    }
    const data = JSON.parse(json);
    return data.translations;
  };
};
var prompt = (originalLocale, list, rules) => {
  return `You have to translate the text inside the JSON file below from ${originalLocale} to the provided locale.
${rules?.join("\n") ?? ""}

JSON FILE:
${JSON.stringify(list)}`;
};

// src/translate/mock.ts
var mock = (translation = "REPLACED") => {
  return (_, list) => {
    const response = [];
    for (const item of list) {
      response.push({ ...item, translation });
    }
    return response;
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  chatgpt,
  i18n,
  mock
});
