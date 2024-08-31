// src/framework/svelte.ts
import { derived, writable } from "svelte/store";
var locale = writable("en");
var t = derived([locale], ([locale2]) => {
  const api = (template, ...args) => {
    return String.raw({ raw: template.raw }, ...args);
  };
  api.get = (og, translations) => {
    return translations[locale2] ?? og;
  };
  return api;
});
export {
  locale,
  t
};
