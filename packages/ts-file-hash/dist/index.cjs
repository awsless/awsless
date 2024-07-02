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
  generateFileHash: () => generateFileHash,
  generateFolderHash: () => generateFolderHash,
  loadPackageDependencyVersions: () => loadPackageDependencyVersions
});
module.exports = __toCommonJS(src_exports);
var import_promises3 = require("fs/promises");

// src/hash.ts
var import_crypto = require("crypto");
var import_promises2 = require("fs/promises");
var import_node_module = require("module");

// src/import.ts
var import_path = require("path");
var import_parse_static_imports = __toESM(require("parse-static-imports"), 1);
var findFileImports = async (file, code) => {
  const imports = await (0, import_parse_static_imports.default)(code);
  return imports.map((entry) => entry.moduleName).filter(Boolean).map((value) => {
    if (value.startsWith(".")) {
      return (0, import_path.resolve)((0, import_path.dirname)(file), value);
    }
    return value;
  });
};

// src/module.ts
var import_promises = require("fs/promises");
var import_path2 = require("path");
var findFile = async (files) => {
  for (const file of files) {
    try {
      const s = await (0, import_promises.stat)(file);
      if (s.isFile()) {
        return file;
      }
    } catch (_) {
      continue;
    }
  }
  throw new Error(`No such file: ${files.join(", ")}`);
};
var resolveModuleImportFile = (file, allowedExtensions) => {
  if (file.endsWith(".js") && allowedExtensions.includes("js") && allowedExtensions.includes("ts")) {
    return findFile([file, file.substring(0, file.length - 3) + ".ts"]);
  }
  if (!(0, import_path2.basename)(file).includes(".")) {
    return findFile([
      file,
      ...allowedExtensions.map((exp) => `${file}.${exp}`),
      ...allowedExtensions.map((exp) => (0, import_path2.join)(file, `/index.${exp}`))
    ]);
  }
  return file;
};
var isLocalCodeFile = (file) => {
  return file.startsWith("/") || file.startsWith(".");
};

// src/hash.ts
var generateRecursiveFileHashes = async (file, allowedExtensions, dependencyVersions, hashes) => {
  if (isLocalCodeFile(file)) {
    file = await resolveModuleImportFile(file, allowedExtensions);
  }
  if (hashes.has(file)) {
    return;
  }
  if (isLocalCodeFile(file)) {
    const code = await (0, import_promises2.readFile)(file, "utf8");
    const deps = await findFileImports(file, code);
    const hash = (0, import_crypto.createHash)("sha1").update(code).digest();
    hashes.set(file, hash);
    for (const dep of deps) {
      await generateRecursiveFileHashes(dep, allowedExtensions, dependencyVersions, hashes);
    }
    return;
  }
  if (file in dependencyVersions && dependencyVersions[file]) {
    const version = dependencyVersions[file];
    hashes.set(file, Buffer.from(`${file}:${version}`, "utf8"));
    return;
  }
  if (import_node_module.builtinModules.includes(file.replace(/^node\:/, ""))) {
    return;
  }
  throw new Error(`Can't find the dependency version for: ${file}`);
};
var mergeHashes = (hashes) => {
  const merge = Buffer.concat(Array.from(hashes.values()).sort());
  return (0, import_crypto.createHash)("sha1").update(merge).digest("hex");
};

// src/version.ts
var import_child_process = require("child_process");
var loadPackageDependencyVersions = (entry, packageManager) => {
  if (packageManager === "pnpm") {
    return new Promise((resolve3, reject) => {
      (0, import_child_process.execFile)(`pnpm`, ["list", "--json"], { cwd: entry }, (error, stdout) => {
        if (error) {
          return reject(error);
        }
        const versions = {};
        const data = JSON.parse(stdout);
        for (const [name, entry2] of Object.entries(data[0].dependencies)) {
          versions[name] = entry2.version;
        }
        resolve3(versions);
      });
    });
  }
  throw new Error(`Unsupported package manager: ${packageManager}`);
};

// src/index.ts
var import_path3 = require("path");
var defaultOptions = {
  extensions: ["js", "mjs", "jsx", "ts", "mts", "tsx"],
  packageManager: "pnpm"
};
var generateFileHash = async (file, opts = {}) => {
  const options = { ...defaultOptions, ...opts };
  const hashes = /* @__PURE__ */ new Map();
  const versions = opts.packageVersions ?? await loadPackageDependencyVersions((0, import_path3.dirname)(file), options.packageManager);
  await generateRecursiveFileHashes(file, options.extensions, versions, hashes);
  return mergeHashes(hashes);
};
var generateFolderHash = async (folder, opts = {}) => {
  const options = { ...defaultOptions, ...opts };
  const hashes = /* @__PURE__ */ new Map();
  const versions = options.packageVersions ?? await loadPackageDependencyVersions(folder, options.packageManager);
  const files = await (0, import_promises3.readdir)(folder, { recursive: true, withFileTypes: true });
  for (const file of files) {
    if (file.isFile() && options.extensions.includes((0, import_path3.extname)(file.name).substring(1))) {
      await generateRecursiveFileHashes((0, import_path3.resolve)(file.path, file.name), options.extensions, versions, hashes);
    }
  }
  return mergeHashes(hashes);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateFileHash,
  generateFolderHash,
  loadPackageDependencyVersions
});
