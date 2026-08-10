"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/server/download.ts
var import_decompress = __toESM(require("decompress"), 1);
var import_find_cache_dir = __toESM(require("find-cache-dir"), 1);
var import_promises = require("fs/promises");
var import_path = require("path");
var getArchiveName = (version) => {
  switch (process.platform) {
    case "win32":
      return `opensearch-${version}-windows-arm64.zip`;
    default:
      return `opensearch-${version}-linux-x64.tar.gz`;
  }
};
var getDownloadPath = () => {
  return (0, import_path.resolve)(
    (0, import_find_cache_dir.default)({
      name: "@awsless/open-search",
      cwd: process.cwd()
    }) || ""
  );
};
var exists = async (path) => {
  try {
    await (0, import_promises.stat)(path);
  } catch (error) {
    return false;
  }
  return true;
};
var download = async (version) => {
  const path = getDownloadPath();
  const name = `opensearch-${version}`;
  const file = (0, import_path.join)(path, name);
  if (await exists(file)) {
    return file;
  }
  console.log(`Downloading OpenSearch ${version}`);
  const url = `https://artifacts.opensearch.org/releases/bundle/opensearch/${version}/${getArchiveName(version)}`;
  const response = await fetch(url, { method: "GET" });
  const data = await response.arrayBuffer();
  const buffer = Buffer.from(data);
  const temp = (0, import_path.join)(path, `.${name}-${process.pid}`);
  await (0, import_promises.rm)(temp, { recursive: true, force: true });
  await (0, import_promises.mkdir)(temp, { recursive: true, mode: "0777" });
  await (0, import_decompress.default)(buffer, temp);
  try {
    await (0, import_promises.rename)((0, import_path.join)(temp, name), file);
  } catch (error) {
    if (!await exists(file)) {
      throw error;
    }
  } finally {
    await (0, import_promises.rm)(temp, { recursive: true, force: true });
  }
  return file;
};

// src/server/jdk.ts
var import_decompress2 = __toESM(require("decompress"), 1);
var import_find_cache_dir2 = __toESM(require("find-cache-dir"), 1);
var import_promises2 = require("fs/promises");
var import_path2 = require("path");
var exists2 = async (path) => {
  try {
    await (0, import_promises2.stat)(path);
  } catch (error) {
    return false;
  }
  return true;
};
var findJavaHome = async (dir) => {
  const [root] = await (0, import_promises2.readdir)(dir);
  const base = (0, import_path2.join)(dir, root);
  const macHome = (0, import_path2.join)(base, "Contents", "Home");
  return await exists2(macHome) ? macHome : base;
};
var downloadJdk = async (version = 17) => {
  const path = (0, import_path2.resolve)(
    (0, import_find_cache_dir2.default)({
      name: "@awsless/open-search",
      cwd: process.cwd()
    }) || ""
  );
  const dir = (0, import_path2.join)(path, `jdk-${version}-${process.platform}-${process.arch}`);
  if (await exists2(dir)) {
    return findJavaHome(dir);
  }
  console.log(`Downloading JDK ${version}`);
  const os = process.platform === "darwin" ? "mac" : process.platform === "win32" ? "windows" : "linux";
  const arch = process.arch === "arm64" ? "aarch64" : "x64";
  const url = `https://api.adoptium.net/v3/binary/latest/${version}/ga/${os}/${arch}/jdk/hotspot/normal/eclipse`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Downloading JDK ${version} for ${os}-${arch} failed: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const temp = (0, import_path2.join)(path, `.jdk-${version}-${process.platform}-${process.arch}-${process.pid}`);
  await (0, import_promises2.rm)(temp, { recursive: true, force: true });
  await (0, import_promises2.mkdir)(temp, { recursive: true, mode: "0777" });
  await (0, import_decompress2.default)(buffer, temp);
  try {
    await (0, import_promises2.rename)(temp, dir);
  } catch (error) {
    if (!await exists2(dir)) {
      throw error;
    }
    await (0, import_promises2.rm)(temp, { recursive: true, force: true });
  }
  return findJavaHome(dir);
};

// src/server/version.ts
var VERSION_2_8_0 = {
  version: "2.8.0",
  started: (line) => line.includes("started"),
  settings: ({ port, host, cache }) => ({
    "discovery.type": "single-node",
    "http.host": host,
    "http.port": port,
    "path.data": `${cache}/data`,
    "path.logs": `${cache}/logs`,
    "plugins.security.disabled": true,
    // A local throwaway server must keep working on a nearly full
    // disk, instead of tripping the watermark index blocks.
    "cluster.routing.allocation.disk.threshold_enabled": false
  })
};

// src/install.ts
var main = async () => {
  if (process.env.AWSLESS_SKIP_OPENSEARCH_DOWNLOAD || process.env.CI) {
    return;
  }
  if (process.env.INIT_CWD) {
    process.chdir(process.env.INIT_CWD);
  }
  await download(VERSION_2_8_0.version);
  if (process.platform !== "linux" && process.platform !== "win32") {
    await downloadJdk();
  }
};
main().catch((error) => {
  console.warn(`Pre-downloading OpenSearch failed: ${error instanceof Error ? error.message : error}`);
  console.warn("The download will run on the first use instead.");
});
