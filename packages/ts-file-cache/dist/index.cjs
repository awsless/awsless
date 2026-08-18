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
var index_exports = {};
__export(index_exports, {
  generateFileHash: () => generateFileHash,
  generateFolderHash: () => generateFolderHash,
  loadWorkspace: () => loadWorkspace
});
module.exports = __toCommonJS(index_exports);
var import_promises5 = require("fs/promises");
var import_path8 = require("path");

// src/hash.ts
var import_crypto = require("crypto");
var import_promises2 = require("fs/promises");
var import_node_module = require("module");
var import_path3 = require("path");

// src/import.ts
var import_core = require("@swc/core");
var import_path = require("path");
var import_swc_walk = require("swc-walk");
var import_baseVisitor = require("swc-walk/baseVisitor");
var PatchedBaseVisitor = class extends import_baseVisitor.BaseVisitor {
  FunctionBody(node, state, callback) {
    for (const statement of node.stmts) {
      callback(statement, state);
    }
  }
};
var baseVisitor = new PatchedBaseVisitor();
var parseOptions = (file) => {
  if (file.endsWith(".tsx")) {
    return { syntax: "typescript", tsx: true, decorators: true };
  }
  if (file.endsWith(".ts") || file.endsWith(".mts") || file.endsWith(".cts")) {
    return { syntax: "typescript", decorators: true };
  }
  return { syntax: "ecmascript", jsx: true, decorators: true };
};
var findImports = async (file, code) => {
  let ast;
  try {
    ast = await (0, import_core.parse)(code, parseOptions(file));
  } catch (error) {
    throw new Error(`Failed to parse: ${file}`, { cause: error });
  }
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
      },
      TsImportEqualsDeclaration(node) {
        if (node.moduleRef.type === "TsExternalModuleReference") {
          importing.add(node.moduleRef.expression.value);
        }
      }
    }, baseVisitor);
  } catch (error) {
    throw new Error(`Failed to walk the AST of: ${file}`, { cause: error });
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
var alternateExtensions = {
  ".js": [".ts", ".tsx"],
  ".mjs": [".mts"],
  ".cjs": [".cts"],
  ".jsx": [".tsx"]
};
var resolveModuleImportFile = (file, allowedExtensions) => {
  const extension = (0, import_path2.extname)(file);
  const alternates = alternateExtensions[extension];
  if (alternates) {
    const candidates = [file];
    for (const alternate of alternates) {
      if (allowedExtensions.includes(alternate.substring(1))) {
        candidates.push(file.substring(0, file.length - extension.length) + alternate);
      }
    }
    return findFile(candidates);
  }
  if (!(0, import_path2.basename)(file).includes(".")) {
    return findFile([
      file,
      ...allowedExtensions.map((ext) => `${file}.${ext}`),
      ...allowedExtensions.map((ext) => (0, import_path2.join)(file, `index.${ext}`))
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
    const relFile = (0, import_path3.relative)(workspace.cwd, file).split(import_path3.sep).join("/");
    if (hashes.has(relFile)) {
      return;
    }
    const code = await (0, import_promises2.readFile)(file, "utf8");
    const ext = file.split(".").pop();
    const hash = (0, import_crypto.createHash)("sha1").update(code).digest();
    hashes.set(relFile, hash);
    if (!ext || !allowedExtensions.includes(ext)) {
      return;
    }
    const deps = await findImports(file, code);
    for (const dep of deps) {
      await generateRecursiveFileHashes(workspace, dep, file, allowedExtensions, hashes);
    }
    return;
  }
  const module2 = getPackageName(file);
  if (hashes.has(module2)) {
    return;
  }
  const dependency = findDependency(workspace, module2, sourceFile);
  if (dependency) {
    if (dependency.type === "package") {
      hashes.set(module2, Buffer.from(`${module2}:${dependency.version}`, "utf8"));
    } else {
      const localPackage = workspace.packages[dependency.link];
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
  if (import_node_module.builtinModules.includes(module2.replace(/^node\:/, ""))) {
    return;
  }
  throw new Error(`Can't find the dependency version for: ${file} inside the source: ${sourceFile}`);
};
var mergeHashes = (hashes) => {
  const names = Array.from(hashes.keys()).sort();
  const merged = (0, import_crypto.createHash)("sha1");
  for (const name of names) {
    merged.update(name);
    merged.update(hashes.get(name));
  }
  return merged.digest("hex");
};
var getPackageName = (importee) => {
  const parts = importee.split("/");
  if (importee.startsWith("@")) {
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
  } else if (parts.length >= 1) {
    return parts[0];
  }
  throw new Error(`Malformed importee: ${importee}`);
};
var findDependency = (workspace, module2, source) => {
  const pkg = Object.values(workspace.packages).filter((p) => source === p.path || source.startsWith(p.path + import_path3.sep)).sort((a, b) => b.path.split(import_path3.sep).length - a.path.split(import_path3.sep).length).find((p) => p.dependencies[module2]);
  if (!pkg) {
    return;
  }
  return pkg.dependencies[module2];
};

// src/package-manager/index.ts
var import_promises4 = require("fs/promises");
var import_path7 = require("path");

// src/package-manager/bun.ts
var import_path5 = require("path");

// src/package-manager/importer.ts
var import_promises3 = require("fs/promises");
var import_path4 = require("path");
var buildPackages = async (cwd, importers) => {
  const packages = {};
  await Promise.all(
    Object.entries(importers).map(async ([path, dependencies]) => {
      const packageJson = await (0, import_promises3.readFile)((0, import_path4.join)(cwd, path, "package.json"), "utf8");
      const packageData = JSON.parse(packageJson);
      const entry = packageData.module ?? packageData.main;
      packages[(0, import_path4.join)(cwd, path)] = {
        name: packageData.name,
        path: (0, import_path4.join)(cwd, path),
        main: entry ? (0, import_path4.join)(cwd, path, entry) : void 0,
        dependencies
      };
    })
  );
  return packages;
};

// src/package-manager/bun.ts
var bun = async (cwd, lockFile) => {
  const data = parseJsonc(lockFile);
  const resolvedVersions = {};
  for (const [key, entry] of Object.entries(data.packages ?? {})) {
    const resolution = entry[0];
    const at = resolution.lastIndexOf("@");
    const version = resolution.substring(at + 1);
    if (!version.startsWith("workspace:")) {
      resolvedVersions[key] = version;
    }
  }
  const workspacePaths = {};
  for (const [path, workspace] of Object.entries(data.workspaces)) {
    if (workspace.name) {
      workspacePaths[workspace.name] = path;
    }
  }
  const importers = {};
  for (const [path, workspace] of Object.entries(data.workspaces)) {
    const deps = { ...workspace.devDependencies, ...workspace.optionalDependencies, ...workspace.dependencies };
    const dependencies = {};
    for (const [name, specifier] of Object.entries(deps)) {
      if (specifier.startsWith("workspace:")) {
        const target = specifier.substring(10);
        const workspacePath = workspacePaths[name];
        if (workspacePath !== void 0) {
          dependencies[name] = {
            type: "workspace",
            link: (0, import_path5.join)(cwd, workspacePath)
          };
        } else {
          dependencies[name] = {
            type: "workspace",
            link: (0, import_path5.join)(cwd, path, target)
          };
        }
        continue;
      }
      const version = resolvedVersions[name] ?? resolvedVersions[`${workspace.name}/${name}`];
      if (version) {
        dependencies[name] = {
          type: "package",
          version
        };
      } else {
        dependencies[name] = {
          type: "package",
          version: specifier
        };
      }
    }
    importers[path] = dependencies;
  }
  const packages = await buildPackages(cwd, importers);
  return {
    cwd,
    packages
  };
};
var parseJsonc = (text) => {
  try {
    return JSON.parse(text);
  } catch (_) {
    return JSON.parse(stripJsoncSyntax(text));
  }
};
var stripJsoncSyntax = (text) => {
  let result = "";
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === '"') {
      result += char;
      index++;
      while (index < text.length) {
        const stringChar = text[index];
        result += stringChar;
        index++;
        if (stringChar === "\\") {
          result += text[index] ?? "";
          index++;
          continue;
        }
        if (stringChar === '"') {
          break;
        }
      }
      continue;
    }
    if (char === "/" && text[index + 1] === "/") {
      while (index < text.length && text[index] !== "\n") {
        index++;
      }
      continue;
    }
    if (char === "/" && text[index + 1] === "*") {
      index += 2;
      while (index < text.length && !(text[index] === "*" && text[index + 1] === "/")) {
        index++;
      }
      index += 2;
      continue;
    }
    if (char === ",") {
      let ahead = index + 1;
      while (ahead < text.length && /\s/.test(text[ahead])) {
        ahead++;
      }
      if (text[ahead] === "}" || text[ahead] === "]") {
        index++;
        continue;
      }
    }
    result += char;
    index++;
  }
  return result;
};

// src/package-manager/pnpm.ts
var import_path6 = require("path");
var import_yaml = require("yaml");
var pnpm = async (cwd, lockFile) => {
  const data = (0, import_yaml.parse)(lockFile);
  const importers = {};
  for (const [path, importee] of Object.entries(data.importers)) {
    const deps = { ...importee.devDependencies, ...importee.optionalDependencies, ...importee.dependencies };
    const dependencies = {};
    for (const [name, entry] of Object.entries(deps)) {
      if (entry.version.startsWith("link:")) {
        dependencies[name] = {
          type: "workspace",
          link: (0, import_path6.join)(cwd, path, entry.version.substring(5))
        };
      } else {
        dependencies[name] = {
          type: "package",
          version: entry.version
        };
      }
    }
    importers[path] = dependencies;
  }
  const packages = await buildPackages(cwd, importers);
  return {
    cwd,
    packages
  };
};

// src/package-manager/index.ts
var parsers = {
  "pnpm-lock.yaml": pnpm,
  "bun.lock": bun
};
var loadPackageManager = async (search, level = 5) => {
  if (!level) {
    throw new TypeError("No pnpm or bun lock file found");
  }
  for (const [lockFileName, parser] of Object.entries(parsers)) {
    const file = (0, import_path7.join)(search, lockFileName);
    if (await fileExist(file)) {
      return parser(search, await (0, import_promises4.readFile)(file, "utf8"));
    }
  }
  return loadPackageManager((0, import_path7.normalize)((0, import_path7.join)(search, "..")), level - 1);
};
var fileExist = async (file) => {
  try {
    const stat2 = await (0, import_promises4.lstat)(file);
    if (stat2.isFile()) {
      return true;
    }
  } catch (error) {
  }
  return false;
};

// src/index.ts
var loadWorkspace = async (search) => {
  return loadPackageManager(toAbsolute(search));
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
  const absoluteFolder = toAbsolute(folder);
  const files = await (0, import_promises5.readdir)(absoluteFolder, { recursive: true, withFileTypes: true });
  for (const file of files) {
    if (file.isFile() && options.extensions.includes((0, import_path8.extname)(file.name).substring(1))) {
      const f = (0, import_path8.resolve)(file.parentPath, file.name);
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
