// src/vite.ts
import MagicString from "magic-string";

// src/cache.ts
import { readFile, stat, writeFile } from "fs/promises";
import { join } from "path";
var loadCache = async (cwd) => {
  const file = join(cwd, "i18n.json");
  try {
    await stat(file);
  } catch (error) {
    return new Cache();
  }
  const data = await readFile(file, "utf8");
  return new Cache(JSON.parse(data));
};
var saveCache = async (cwd, cache) => {
  await writeFile(join(cwd, "i18n.json"), JSON.stringify(cache, void 0, 2));
};
var Cache = class {
  constructor(data = {}) {
    this.data = data;
  }
  set(source, locale, translation) {
    if (!this.data[source]) {
      this.data[source] = {};
    }
    if (typeof this.data[source][locale] === "undefined") {
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
    if (typeof this.data[source]?.[locale] !== "undefined") {
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
import { readFile as readFile2 } from "fs/promises";
import { glob } from "glob";
import { join as join2 } from "path";

// src/find/svelte.ts
import { walk } from "estree-walker";
import lineColumn from "line-column";
import { parse as parseSvelte } from "svelte/compiler";
var findSvelteTranslatable = (code) => {
  const found = [];
  const origin = lineColumn(code);
  const ast = parseSvelte(code, {
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
  walk(ast.html, { enter });
  if (ast.instance) {
    walk(ast.instance.content, { enter });
  }
  if (ast.module) {
    walk(ast.module.content, { enter });
  }
  return found;
};

// src/find/typescript.ts
import { parse } from "@swc/core";
import { simple } from "swc-walk";
var findTypescriptTranslatable = async (code) => {
  const found = [];
  const ast = await parse(code, {
    syntax: "typescript"
  });
  simple(ast, {
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
  const files = await glob("**/*.{js,ts,svelte}", {
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
    const code = await readFile2(join2(cwd, file), "utf8");
    if (code.includes("lang.t`")) {
      if (file.endsWith(".svelte")) {
        found.push(...findSvelteTranslatable(code));
      } else {
        const entries = await findTypescriptTranslatable(code);
        found.push(...entries);
      }
    }
  }
  return found;
};

// src/vite.ts
var i18n = (props) => {
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
      if (code.includes("lang.t`")) {
        const transformedCode = new MagicString(code);
        for (const item of cache.entries()) {
          transformedCode.replaceAll(
            `lang.t\`${item.source}\``,
            `lang.t.get(\`${item.source}\`, {${props.locales.map((locale) => {
              const translation = cache.get(item.source, locale);
              if (translation === item.source) {
                return;
              }
              return `"${locale}":\`${translation}\``;
            }).filter((v) => !!v).join(",")}})`
          );
        }
        return {
          code: transformedCode.toString(),
          map: transformedCode.generateMap({
            hires: true
          })
        };
      }
      return;
    }
  };
};

// src/translate/ai.ts
import { generateObject } from "ai";
import chunk from "chunk";
import { z } from "zod";
var ai = (props) => {
  return async (originalLocale, texts) => {
    const batches = chunk(texts, props.batchSize ?? 1e3);
    const translations = await Promise.all(
      batches.map(async (texts2) => {
        const result = await generateObject({
          model: props.model,
          maxTokens: props.maxTokens,
          schema: z.object({
            translations: z.object({
              source: z.string(),
              locale: z.string(),
              translation: z.string()
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
export {
  ai,
  i18n
};
