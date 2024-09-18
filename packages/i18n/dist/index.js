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
import { readFile as readFile2 } from "fs/promises";
import { glob } from "glob";
import { extname, join as join2 } from "path";

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
    if (code.includes("$t`")) {
      if (extname(file) === ".svelte") {
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
            code = code.replaceAll(`$t\`${item.original}\``, () => {
              replaced = true;
              return `$t.get(\`${item.original}\`, {${props.locales.map((locale) => {
                return `"${locale}":\`${cache.get(item.original, locale)}\``;
              }).join(",")}})`;
            });
          }
        }
        if (code.includes(`get(t)\``)) {
          for (const item of cache.entries()) {
            code = code.replaceAll(`get(t)\`${item.original}\``, () => {
              replaced = true;
              return `get(t).get(\`${item.original}\`, {${props.locales.map((locale) => {
                return `"${locale}":\`${cache.get(item.original, locale)}\``;
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
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
var chatgpt = (props) => {
  const format = zodResponseFormat(
    z.object({
      translations: z.object({
        original: z.string(),
        locale: z.string(),
        translation: z.string()
      }).array()
    }),
    "final_schema"
  );
  return async (originalLocale, list) => {
    const client = new OpenAI(props);
    const response = await client.chat.completions.create({
      model: props?.model ?? "gpt-4o-2024-08-06",
      max_tokens: props?.maxTokens ?? 4095,
      response_format: format,
      messages: [
        { role: "system", content: "You are a helpful translator." },
        { role: "user", content: prompt(originalLocale, list, props?.rules) }
      ]
    });
    const json = response.choices[0]?.message.content;
    if (typeof json !== "string") {
      throw new Error("Invalid chat gpt response");
    }
    let data;
    try {
      data = JSON.parse(json);
    } catch (error) {
      throw new Error(`Invalid chat gpt json response: ${json}`);
    }
    return data.translations;
  };
};
var prompt = (originalLocale, list, rules) => {
  return `You have to translate the text inside the JSON file below from "${originalLocale}" to the provided locale.
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
export {
  chatgpt,
  createI18nPlugin as i18n,
  mock
};
