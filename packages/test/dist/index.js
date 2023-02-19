"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  asyncCall: () => asyncCall,
  mockFn: () => mockFn,
  mockObjectValues: () => mockObjectValues,
  nextTick: () => nextTick,
  requestPort: () => requestPort
});
module.exports = __toCommonJS(src_exports);

// src/port.ts
var import_net = __toESM(require("net"));
var import_proper_lockfile = __toESM(require("proper-lockfile"));
var import_promises = require("fs/promises");
var random = (min, max) => {
  return Math.floor(Math.random() * (max - min) + min);
};
var isAvailable = (port) => {
  return new Promise((resolve, reject) => {
    const server = import_net.default.createServer();
    server.once("error", (error) => {
      error.code === "EADDRINUSE" ? resolve(false) : reject(error);
    });
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
};
var prepareLockFile = async (file) => {
  try {
    await (0, import_promises.access)(file, import_promises.constants.W_OK);
  } catch (error) {
    const handle = await (0, import_promises.open)(file, "w");
    await handle.close();
  }
};
var lock = async (file, timeout) => {
  try {
    await prepareLockFile(file);
    await import_proper_lockfile.default.lock(file, {
      stale: timeout,
      retries: 0
    });
  } catch (error) {
    return false;
  }
  return true;
};
var unlock = (file) => {
  return import_proper_lockfile.default.unlock(file);
};
var requestPort = async ({
  min = 32768,
  max = 65535,
  timeout = 1e3 * 60 * 5
} = {}) => {
  let times = 10;
  while (times--) {
    const port = random(min, max);
    const open2 = await isAvailable(port);
    if (!open2)
      continue;
    const file = `/var/tmp/port-${port}`;
    if (await lock(file, timeout)) {
      return [
        port,
        async () => {
          try {
            await unlock(file);
            await (0, import_promises.unlink)(file);
          } catch (error) {
            return;
          }
        }
      ];
    }
  }
  throw new Error("No port found");
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
var asyncCall = (fn, ...args) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(fn(...args));
    }, 0);
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  asyncCall,
  mockFn,
  mockObjectValues,
  nextTick,
  requestPort
});
