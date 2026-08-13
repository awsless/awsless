var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/proxy.ts
var RESERVED = /* @__PURE__ */ new Set(["then", "toJSON", "toString", "valueOf"]);
var createProxy = /* @__NO_SIDE_EFFECTS__ */ (cb) => {
  const cache = /* @__PURE__ */ new Map();
  return new Proxy(
    {},
    {
      get(_, name) {
        if (typeof name === "symbol" || RESERVED.has(name)) {
          return void 0;
        }
        if (!cache.has(name)) {
          cache.set(name, cb(name));
        }
        return cache.get(name);
      }
    }
  );
};

export {
  __export,
  createProxy
};
