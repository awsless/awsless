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
export {
  globalClient
};
