// src/lib/proxy.ts
var createProxy = /* @__NO_SIDE_EFFECTS__ */ (cb) => {
  const cache = /* @__PURE__ */ new Map();
  return new Proxy(
    {},
    {
      get(_, name) {
        if (!cache.has(name)) {
          cache.set(name, cb(name));
        }
        return cache.get(name);
      }
    }
  );
};

export {
  createProxy
};
