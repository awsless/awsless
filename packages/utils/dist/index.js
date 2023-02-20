// src/client.ts
var globalClient = (factory) => {
  let singleton;
  const getter = () => {
    if (!singleton) {
      singleton = factory();
    }
    return singleton;
  };
  getter.set = (client) => {
    singleton = client;
  };
  return getter;
};

// src/mock.ts
var mockObjectValues = (object) => {
  const list = {};
  Object.entries(object).forEach(([key, value]) => {
    list[key] = mockFn(value);
  });
  return Object.freeze(list);
};
var mockFn = (fn) => {
  return vi ? vi.fn(fn) : fn;
};
var nextTick = (fn, ...args) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(fn(...args));
    }, 0);
  });
};
export {
  globalClient,
  mockFn,
  mockObjectValues,
  nextTick
};
