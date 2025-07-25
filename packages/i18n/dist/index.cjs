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
var index_exports = {};
__export(index_exports, {
  ai: () => ai,
  i18n: () => createI18nPlugin
});
module.exports = __toCommonJS(index_exports);

// src/cache.ts
var import_promises = require("fs/promises");
var import_path = require("path");
var loadCache = async (cwd) => {
  const file = (0, import_path.join)(cwd, "i18n.json");
  try {
    await (0, import_promises.stat)(file);
  } catch (error) {
    return new Cache();
  }
  const data = await (0, import_promises.readFile)(file, "utf8");
  return new Cache(JSON.parse(data));
};
var saveCache = async (cwd, cache) => {
  await (0, import_promises.writeFile)((0, import_path.join)(cwd, "i18n.json"), JSON.stringify(cache, void 0, 2));
};
var Cache = class {
  constructor(data = {}) {
    this.data = data;
  }
  set(source, locale, translation) {
    if (!this.data[source]) {
      this.data[source] = {};
    }
    if (!this.data[source][locale]) {
      this.data[source][locale] = translation;
    }
  }
  get(source, locale) {
    return this.data[source]?.[locale];
  }
  has(source, locale) {
    return typeof this.get(source, locale) === "string";
  }
  delete(source, locale) {
    if (this.data[source]?.[locale]) {
      delete this.data[source][locale];
    }
    if (this.data[source] && Object.keys(this.data[source]).length === 0) {
      delete this.data[source];
    }
  }
  *entries() {
    for (const [source, locales] of Object.entries(this.data)) {
      for (const [locale, translation] of Object.entries(locales)) {
        yield { source, locale, translation };
      }
    }
  }
  toJSON() {
    return this.data;
  }
};

// src/diff.ts
var findNewTranslations = (cache, sources, locales) => {
  const list = [];
  for (const source of sources) {
    for (const locale of locales) {
      if (!cache.has(source, locale)) {
        list.push({ source, locale });
      }
    }
  }
  return list;
};
var removeUnusedTranslations = (cache, sources, locales) => {
  for (const item of cache.entries()) {
    if (!locales.includes(item.locale) || !sources.includes(item.source)) {
      cache.delete(item.source, item.locale);
    }
  }
};

// src/find.ts
var import_promises2 = require("fs/promises");
var import_glob = require("glob");
var import_path2 = require("path");

// src/find/svelte.ts
var import_estree_walker = require("estree-walker");
var import_line_column = __toESM(require("line-column"), 1);
var import_compiler = require("svelte/compiler");
var findSvelteTranslatable = (code) => {
  const found = [];
  const origin = (0, import_line_column.default)(code);
  const ast = (0, import_compiler.parse)(code, {
    css: false
  });
  const enter = (node) => {
    if (node.type === "TaggedTemplateExpression" && node.tag.type === "MemberExpression" && node.tag.object.type === "Identifier" && node.tag.object.name === "lang" && node.tag.property.type === "Identifier" && node.tag.property.name === "t" && node.quasi.type === "TemplateLiteral" && node.quasi.loc) {
      const start = node.quasi.loc.start;
      const end = node.quasi.loc.end;
      const content = code.substring(
        origin.toIndex(start.line, start.column) + 2,
        origin.toIndex(end.line, end.column)
      );
      found.push(content);
    }
  };
  (0, import_estree_walker.walk)(ast.html, { enter });
  if (ast.instance) {
    (0, import_estree_walker.walk)(ast.instance.content, { enter });
  }
  if (ast.module) {
    (0, import_estree_walker.walk)(ast.module.content, { enter });
  }
  return found;
};

// src/find/typescript.ts
var import_core = require("@swc/core");
var import_swc_walk = require("swc-walk");
var findTypescriptTranslatable = async (code) => {
  const found = [];
  const ast = await (0, import_core.parse)(code, {
    syntax: "typescript"
  });
  (0, import_swc_walk.simple)(ast, {
    TaggedTemplateExpression(node) {
      if (node.tag.type === "MemberExpression" && node.tag.object.type === "Identifier" && node.tag.object.value === "lang" && node.tag.property.type === "Identifier" && node.tag.property.value === "t") {
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
    ignore: [
      //
      "**/node_modules/**",
      "**/.svelte-kit/**",
      "**/.*/**"
    ]
  });
  const found = [];
  for (const file of files) {
    const code = await (0, import_promises2.readFile)((0, import_path2.join)(cwd, file), "utf8");
    if (code.includes("lang.t`")) {
      if (file.endsWith(".svelte")) {
        found.push(...findSvelteTranslatable(code));
      } else {
        found.push(...await findTypescriptTranslatable(code));
      }
    }
  }
  return found;
};

// src/vite.ts
var createI18nPlugin = (props) => {
  let cache;
  return {
    name: "awsless/i18n",
    enforce: "pre",
    async buildStart() {
      const cwd = process.cwd();
      this.info("Finding all translatable text...");
      const sourceTexts = await findTranslatable(cwd);
      cache = await loadCache(cwd);
      removeUnusedTranslations(cache, sourceTexts, props.locales);
      const newSourceTexts = findNewTranslations(cache, sourceTexts, props.locales);
      if (newSourceTexts.length > 0) {
        this.info(`Translating ${newSourceTexts.length} new texts.`);
        const translations = await props.translate(props.default ?? "en", newSourceTexts);
        this.info(`Translated ${translations.length} texts.`);
        for (const item of translations) {
          cache.set(item.source, item.locale, item.translation);
        }
      }
      await saveCache(cwd, cache);
      this.info(`Translating done.`);
    },
    transform(code) {
      let replaced = false;
      if (code.includes("lang.t`")) {
        for (const item of cache.entries()) {
          code = code.replaceAll(`lang.t\`${item.source}\``, () => {
            replaced = true;
            return `lang.t.get(\`${item.source}\`, {${props.locales.map((locale) => {
              return `"${locale}":\`${cache.get(item.source, locale)}\``;
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
  };
};

// src/translate/ai.ts
var import_ai = require("ai");
var import_chunk = __toESM(require("chunk"), 1);
var import_zod = require("zod");
var ai = (props) => {
  return async (originalLocale, texts) => {
    const batches = (0, import_chunk.default)(texts, props.batchSize ?? 1e3);
    const translations = await Promise.all(
      batches.map(async (texts2) => {
        const result = await (0, import_ai.generateObject)({
          model: props.model,
          maxTokens: props.maxTokens,
          schema: import_zod.z.object({
            translations: import_zod.z.object({
              source: import_zod.z.string(),
              locale: import_zod.z.string(),
              translation: import_zod.z.string()
            }).array()
          }),
          prompt: [
            `You have to translate the text inside the JSON file below from "${originalLocale}" to the provided locale.`,
            ...props?.rules ?? [],
            "",
            `JSON FILE:`,
            JSON.stringify(texts2)
          ].join("\n"),
          system: "You are a helpful translator."
        });
        return result.object.translations;
      })
    );
    return translations.flat(3);
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ai,
  i18n
});
