// src/index.ts
import { readdir } from "fs/promises";

// src/hash.ts
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { builtinModules } from "node:module";
import { relative } from "path";

// src/import.ts
import { parse } from "@swc/core";
import { dirname, resolve } from "path";
import { simple } from "swc-walk";
var findImports = async (file, code) => {
  const ast = await parse(code, {
    syntax: "typescript"
  });
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
      }
    });
  } catch (_) {
    return [];
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
import { basename, isAbsolute, join } from "path";
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
var resolveModuleImportFile = (file, allowedExtensions) => {
  if (file.endsWith(".js") && allowedExtensions.includes("js") && allowedExtensions.includes("ts")) {
    return findFile([file, file.substring(0, file.length - 3) + ".ts"]);
  }
  if (!basename(file).includes(".")) {
    return findFile([
      file,
      ...allowedExtensions.map((exp) => `${file}.${exp}`),
      ...allowedExtensions.map((exp) => join(file, `/index.${exp}`))
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
    const relFile = relative(workspace.cwd, file);
    if (hashes.has(relFile)) {
      return;
    }
    const code = await readFile(file, "utf8");
    const deps = await findImports(file, code);
    const hash = createHash("sha1").update(code).digest();
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
  if (builtinModules.includes(file.replace(/^node\:/, ""))) {
    return;
  }
  throw new Error(`Can't find the dependency version for: ${file} inside the source: ${sourceFile}`);
};
var mergeHashes = (hashes) => {
  const merge = Buffer.concat(Array.from(hashes.values()).sort());
  return createHash("sha1").update(merge).digest("hex");
};
var findDependency = (workspace, module, source) => {
  const pkg = Object.values(workspace.packages).filter((p) => source.startsWith(p.path)).sort((a, b) => b.path.split("/").length - a.path.split("/").length).find((p) => p.dependencies[module]);
  if (!pkg) {
    return;
  }
  return pkg.dependencies[module];
};

// src/index.ts
import { extname, resolve as resolve2 } from "path";

// src/package-manager/pnpm.ts
import { lstat, readFile as readFile2 } from "fs/promises";
import { join as join2, normalize } from "path";
import { parse as parse2 } from "yaml";
var pnpm = async (search) => {
  const [cwd, lockFile] = await findLockFile(search);
  const data = parse2(lockFile);
  const packages = {};
  await Promise.all(
    Object.entries(data.importers).map(async ([path, importee]) => {
      const deps = { ...importee.devDependencies, ...importee.dependencies };
      const dependencies = {};
      const packageJson = await readFile2(join2(cwd, path, "package.json"), "utf8");
      const packageData = JSON.parse(packageJson);
      for (const [name, entry2] of Object.entries(deps)) {
        if (entry2.version.startsWith("link:")) {
          dependencies[name] = {
            type: "workspace",
            link: join2(cwd, path, entry2.version.substring(5))
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
        path: join2(cwd, path),
        main: entry ? join2(cwd, path, entry) : void 0,
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
  const file = join2(path, "pnpm-lock.yaml");
  const exists = await fileExist(file);
  if (exists) {
    return [path, await readFile2(file, "utf8")];
  }
  return findLockFile(normalize(join2(path, "..")), level - 1);
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
  const files = await readdir(folder, { recursive: true, withFileTypes: true });
  for (const file of files) {
    if (file.isFile() && options.extensions.includes(extname(file.name).substring(1))) {
      const f = resolve2(file.path, file.name);
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
