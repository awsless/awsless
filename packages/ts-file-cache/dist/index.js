// src/index.ts
import { readdir } from "fs/promises";
import { extname as extname2, resolve as resolve2 } from "path";

// src/hash.ts
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { builtinModules } from "module";
import { relative, sep } from "path";

// src/import.ts
import { parse } from "@swc/core";
import { dirname, resolve } from "path";
import { simple } from "swc-walk";
import { BaseVisitor } from "swc-walk/baseVisitor";
var PatchedBaseVisitor = class extends BaseVisitor {
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
    ast = await parse(code, parseOptions(file));
  } catch (error) {
    throw new Error(`Failed to parse: ${file}`, { cause: error });
  }
  const importing = /* @__PURE__ */ new Set();
  try {
    simple(ast, {
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
      return resolve(dirname(file), importee);
    }
    const parts = importee.split("/");
    if (parts.length > 2) {
      return parts.slice(0, 2).join("/");
    }
    return importee;
  });
};

// src/module.ts
import { stat } from "fs/promises";
import { basename, extname, isAbsolute, join } from "path";
var findFile = async (files) => {
  for (const file of files) {
    try {
      const s = await stat(file);
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
  const extension = extname(file);
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
  if (!basename(file).includes(".")) {
    return findFile([
      file,
      ...allowedExtensions.map((ext) => `${file}.${ext}`),
      ...allowedExtensions.map((ext) => join(file, `index.${ext}`))
    ]);
  }
  return file;
};
var isLocalCodeFile = (file) => {
  return file.startsWith("/") || file.startsWith(".");
};
var toAbsolute = (file) => {
  if (isAbsolute(file)) {
    return file;
  }
  return join(process.cwd(), file);
};

// src/hash.ts
var generateRecursiveFileHashes = async (workspace, file, sourceFile, allowedExtensions, hashes) => {
  if (isLocalCodeFile(file)) {
    try {
      file = await resolveModuleImportFile(file, allowedExtensions);
    } catch (error) {
      throw new Error(`Can't find imported file: "${file}" inside the source: "${sourceFile}"`);
    }
    const relFile = relative(workspace.cwd, file).split(sep).join("/");
    if (hashes.has(relFile)) {
      return;
    }
    const code = await readFile(file, "utf8");
    const ext = file.split(".").pop();
    const hash = createHash("sha1").update(code).digest();
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
  const module = getPackageName(file);
  if (hashes.has(module)) {
    return;
  }
  const dependency = findDependency(workspace, module, sourceFile);
  if (dependency) {
    if (dependency.type === "package") {
      hashes.set(module, Buffer.from(`${module}:${dependency.version}`, "utf8"));
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
  if (builtinModules.includes(module.replace(/^node\:/, ""))) {
    return;
  }
  throw new Error(`Can't find the dependency version for: ${file} inside the source: ${sourceFile}`);
};
var mergeHashes = (hashes) => {
  const names = Array.from(hashes.keys()).sort();
  const merged = createHash("sha1");
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
var findDependency = (workspace, module, source) => {
  const pkg = Object.values(workspace.packages).filter((p) => source === p.path || source.startsWith(p.path + sep)).sort((a, b) => b.path.split(sep).length - a.path.split(sep).length).find((p) => p.dependencies[module]);
  if (!pkg) {
    return;
  }
  return pkg.dependencies[module];
};

// src/package-manager/index.ts
import { lstat, readFile as readFile3 } from "fs/promises";
import { join as join5, normalize } from "path";

// src/package-manager/bun.ts
import { join as join3 } from "path";

// src/package-manager/importer.ts
import { readFile as readFile2 } from "fs/promises";
import { join as join2 } from "path";
var buildPackages = async (cwd, importers) => {
  const packages = {};
  await Promise.all(
    Object.entries(importers).map(async ([path, dependencies]) => {
      const packageJson = await readFile2(join2(cwd, path, "package.json"), "utf8");
      const packageData = JSON.parse(packageJson);
      const entry = packageData.module ?? packageData.main;
      packages[join2(cwd, path)] = {
        name: packageData.name,
        path: join2(cwd, path),
        main: entry ? join2(cwd, path, entry) : void 0,
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
            link: join3(cwd, workspacePath)
          };
        } else {
          dependencies[name] = {
            type: "workspace",
            link: join3(cwd, path, target)
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
import { join as join4 } from "path";
import { parse as parse2 } from "yaml";
var pnpm = async (cwd, lockFile) => {
  const data = parse2(lockFile);
  const importers = {};
  for (const [path, importee] of Object.entries(data.importers)) {
    const deps = { ...importee.devDependencies, ...importee.optionalDependencies, ...importee.dependencies };
    const dependencies = {};
    for (const [name, entry] of Object.entries(deps)) {
      if (entry.version.startsWith("link:")) {
        dependencies[name] = {
          type: "workspace",
          link: join4(cwd, path, entry.version.substring(5))
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
    const file = join5(search, lockFileName);
    if (await fileExist(file)) {
      return parser(search, await readFile3(file, "utf8"));
    }
  }
  return loadPackageManager(normalize(join5(search, "..")), level - 1);
};
var fileExist = async (file) => {
  try {
    const stat2 = await lstat(file);
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
  const files = await readdir(absoluteFolder, { recursive: true, withFileTypes: true });
  for (const file of files) {
    if (file.isFile() && options.extensions.includes(extname2(file.name).substring(1))) {
      const f = resolve2(file.parentPath, file.name);
      await generateRecursiveFileHashes(workspace, f, f, options.extensions, hashes);
    }
  }
  return mergeHashes(hashes);
};
export {
  generateFileHash,
  generateFolderHash,
  loadWorkspace
};
