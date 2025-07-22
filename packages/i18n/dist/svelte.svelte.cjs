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

// src/framework/svelte.svelte.ts
var svelte_svelte_exports = {};
__export(svelte_svelte_exports, {
  lang: () => lang
});
module.exports = __toCommonJS(svelte_svelte_exports);
var locale = $state("en");
var t = $derived.by(() => {
  const api = (template, ...args) => {
    return String.raw({ raw: template.raw }, ...args);
  };
  api.get = (og, translations) => {
    return translations[locale] ?? og;
  };
  return api;
});
var lang = {
  /** Get the current locale.
   *
   * @example
   * console.log(lang.locale)
   */
  get locale() {
    return locale;
  },
  /** To change the locale that is being rendered simply change this property.
   *
   * @example
   * lang.locale = 'jp'
   */
  set locale(v) {
    locale = v;
  },
  /** Translate helper for translating template strings.
   * The i18n Vite plugin will find all instances where you want text
   * to be translated and automatically translate your text during build time.
   *
   * @example
   * lang.t`Hello world!`
   */
  get t() {
    return t;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  lang
});
