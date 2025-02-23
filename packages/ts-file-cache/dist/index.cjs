"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  generateFileHash: () => generateFileHash,
  generateFolderHash: () => generateFolderHash,
  loadWorkspace: () => loadWorkspace
});
module.exports = __toCommonJS(src_exports);
var import_promises4 = require("fs/promises");

// src/hash.ts
var import_crypto = require("crypto");
var import_promises2 = require("fs/promises");
var import_node_module = require("module");
var import_path3 = require("path");

// src/import.ts
var import_core = require("@swc/core");
var import_path = require("path");
var import_swc_walk = require("swc-walk");
var findImports = async (file, code) => {
  const ast = await (0, import_core.parse)(code, {
    syntax: "typescript"
  });
  const importing = /* @__PURE__ */ new Set();
  try {
    (0, import_swc_walk.simple)(ast, {
      ImportDeclaration(node) {
        importing.add(node.source.value);
      },
      ExportAllDeclaration(node) {
        importing.add(node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          importing.add(node.source.value);
        }
      },
      CallExpression(node) {
        if (node.callee.type === "Import") {
          const first = node.arguments.at(0);
          if (first && first.expression.type === "StringLiteral") {
            importing.add(first.expression.value);
          }
        }
      }
    });
  } catch (_) {
    return [];
  }
  return [...importing].map((importee) => {
    if (importee.startsWith(".")) {
      return (0, import_path.resolve)((0, import_path.dirname)(file), importee);
    }
    const parts = importee.split("/");
    if (parts.length > 2) {
      return parts.slice(0, 2).join("/");
    }
    return importee;
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
var toAbsolute = (file) => {
  if ((0, import_path2.isAbsolute)(file)) {
    return file;
  }
  return (0, import_path2.join)(process.cwd(), file);
};

// src/hash.ts
var generateRecursiveFileHashes = async (workspace, file, sourceFile, allowedExtensions, hashes) => {
  if (isLocalCodeFile(file)) {
    try {
      file = await resolveModuleImportFile(file, allowedExtensions);
    } catch (error) {
      throw new Error(`Can't find imported file: "${file}" inside the source: "${sourceFile}"`);
    }
    const relFile = (0, import_path3.relative)(workspace.cwd, file);
    if (hashes.has(relFile)) {
      return;
    }
    const code = await (0, import_promises2.readFile)(file, "utf8");
    const deps = await findImports(file, code);
    const hash = (0, import_crypto.createHash)("sha1").update(code).digest();
    hashes.set(relFile, hash);
    for (const dep of deps) {
      await generateRecursiveFileHashes(workspace, dep, file, allowedExtensions, hashes);
    }
    return;
  }
  if (hashes.has(file)) {
    return;
  }
  const dependency = findDependency(workspace, file, sourceFile);
  if (dependency) {
    if (dependency.type === "package") {
      hashes.set(file, Buffer.from(`${file}:${dependency.version}`, "utf8"));
    } else {
      const localPackage = workspace.packages[file];
      if (!localPackage) {
        throw new Error(`Can't find the local workspace package for: ${file}`);
      }
      if (!localPackage.main) {
        throw new Error(`Workspace package doesn't have a main entry: ${file}`);
      }
      await generateRecursiveFileHashes(
        workspace,
        localPackage.main,
        localPackage.main,
        allowedExtensions,
        hashes
      );
    }
    return;
  }
  if (import_node_module.builtinModules.includes(file.replace(/^node\:/, ""))) {
    return;
  }
  throw new Error(`Can't find the dependency version for: ${file} inside the source: ${sourceFile}`);
};
var mergeHashes = (hashes) => {
  const merge = Buffer.concat(Array.from(hashes.values()).sort());
  return (0, import_crypto.createHash)("sha1").update(merge).digest("hex");
};
var findDependency = (workspace, module2, source) => {
  const pkg = Object.values(workspace.packages).filter((p) => source.startsWith(p.path)).sort((a, b) => b.path.split("/").length - a.path.split("/").length).find((p) => p.dependencies[module2]);
  if (!pkg) {
    return;
  }
  return pkg.dependencies[module2];
};

// src/index.ts
var import_path5 = require("path");

// src/package-manager/pnpm.ts
var import_promises3 = require("fs/promises");
var import_path4 = require("path");
var import_yaml = require("yaml");
var pnpm = async (search) => {
  const [cwd, lockFile] = await findLockFile(search);
  const data = (0, import_yaml.parse)(lockFile);
  const packages = {};
  await Promise.all(
    Object.entries(data.importers).map(async ([path, importee]) => {
      const deps = { ...importee.devDependencies, ...importee.dependencies };
      const dependencies = {};
      const packageJson = await (0, import_promises3.readFile)((0, import_path4.join)(cwd, path, "package.json"), "utf8");
      const packageData = JSON.parse(packageJson);
      for (const [name, entry2] of Object.entries(deps)) {
        if (entry2.version.startsWith("link:")) {
          dependencies[name] = {
            type: "workspace",
            link: (0, import_path4.join)(cwd, path, entry2.version.substring(5))
          };
        } else {
          dependencies[name] = {
            type: "package",
            version: entry2.version
          };
        }
      }
      const entry = packageData.module ?? packageData.main;
      packages[packageData.name] = {
        name: packageData.name,
        path: (0, import_path4.join)(cwd, path),
        main: entry ? (0, import_path4.join)(cwd, path, entry) : void 0,
        dependencies
      };
    })
  );
  return {
    cwd,
    packages
  };
};
var findLockFile = async (path, level = 5) => {
  if (!level) {
    throw new TypeError("No pnpm lock file found");
  }
  const file = (0, import_path4.join)(path, "pnpm-lock.yaml");
  const exists = await fileExist(file);
  if (exists) {
    return [path, await (0, import_promises3.readFile)(file, "utf8")];
  }
  return findLockFile((0, import_path4.normalize)((0, import_path4.join)(path, "..")), level - 1);
};
var fileExist = async (file) => {
  try {
    const stat2 = await (0, import_promises3.lstat)(file);
    if (stat2.isFile()) {
      return true;
    }
  } catch (error) {
  }
  return false;
};

// src/index.ts
var loadWorkspace = async (search) => {
  const { cwd, packages } = await pnpm(toAbsolute(search));
  return {
    cwd,
    packages
  };
};
var defaultOptions = {
  extensions: ["js", "mjs", "jsx", "ts", "mts", "tsx"]
};
var generateFileHash = async (workspace, file, opts = {}) => {
  const options = { ...defaultOptions, ...opts };
  const hashes = /* @__PURE__ */ new Map();
  const absoluteFile = toAbsolute(file);
  await generateRecursiveFileHashes(workspace, absoluteFile, absoluteFile, options.extensions, hashes);
  return mergeHashes(hashes);
};
var generateFolderHash = async (workspace, folder, opts = {}) => {
  const options = { ...defaultOptions, ...opts };
  const hashes = /* @__PURE__ */ new Map();
  const files = await (0, import_promises4.readdir)(folder, { recursive: true, withFileTypes: true });
  for (const file of files) {
    if (file.isFile() && options.extensions.includes((0, import_path5.extname)(file.name).substring(1))) {
      const f = (0, import_path5.resolve)(file.path, file.name);
      await generateRecursiveFileHashes(workspace, f, f, options.extensions, hashes);
    }
  }
  return mergeHashes(hashes);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateFileHash,
  generateFolderHash,
  loadWorkspace
});
