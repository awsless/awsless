// src/port.ts
import net from "net";
import lockfile from "proper-lockfile";
import { unlink, access, constants, open } from "fs/promises";
var random = (min, max) => {
  return Math.floor(Math.random() * (max - min) + min);
};
var isAvailable = (port) => {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
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
    await access(file, constants.W_OK);
  } catch (error) {
    const handle = await open(file, "w");
    await handle.close();
  }
};
var lock = async (file, timeout) => {
  try {
    await prepareLockFile(file);
    await lockfile.lock(file, {
      stale: timeout,
      retries: 0
    });
  } catch (error) {
    return false;
  }
  return true;
};
var unlock = (file) => {
  return lockfile.unlock(file);
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
            await unlink(file);
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
export {
  asyncCall,
  mockFn,
  mockObjectValues,
  nextTick,
  requestPort
};
