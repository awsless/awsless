// src/client.ts
var globalClient = (factory) => {
  let singleton;
  return {
    get() {
      if (!singleton) {
        singleton = factory();
      }
      return singleton;
    },
    set(client) {
      singleton = client;
    }
  };
};
export {
  globalClient
};
