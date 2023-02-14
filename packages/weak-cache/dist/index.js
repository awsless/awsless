// src/index.ts
var WeakCache = class {
  registry;
  cache;
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.registry = new FinalizationRegistry((key) => {
      this.cache.delete(key);
    });
  }
  set(key, value) {
    const item = { value };
    const ref = new WeakRef(item);
    this.cache.set(key, ref);
    this.registry.register(item, key, ref);
    return this;
  }
  get(key, defaultValue) {
    const ref = this.cache.get(key);
    if (ref) {
      const item = ref.deref();
      if (typeof item !== "undefined") {
        return item.value;
      }
    }
    return defaultValue;
  }
  has(key) {
    return typeof this.get(key) !== "undefined";
  }
  delete(key) {
    const ref = this.cache.get(key);
    if (ref) {
      this.cache.delete(key);
      this.registry.unregister(ref);
      return true;
    }
    return false;
  }
  clear() {
    for (const key of this.keys()) {
      this.delete(key);
    }
  }
  get size() {
    return this.cache.size;
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  keys() {
    return this.cache.keys();
  }
  *values() {
    for (const ref of this.cache.values()) {
      const item = ref.deref();
      if (item) {
        yield item.value;
      }
    }
  }
  *entries() {
    for (const [key, ref] of this.cache.entries()) {
      const item = ref.deref();
      if (item) {
        yield [key, item.value];
      }
    }
  }
};
export {
  WeakCache
};
