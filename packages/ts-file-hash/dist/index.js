// src/index.ts
import { readdir } from "fs/promises";

// src/hash.ts
import { createHash } from "crypto";
import { readFile as readFile2 } from "fs/promises";
import { builtinModules } from "module";

// src/import.ts
import { dirname, resolve } from "path";
import parseStaticImports from "parse-static-imports";
var findFileImports = async (file, code) => {
  const imports = await parseStaticImports(code);
  return imports.map((entry) => entry.moduleName).filter(Boolean).map((value) => {
    if (value.startsWith(".")) {
      return resolve(dirname(file), value);
    }
    return value;
  });
};

// src/module.ts
import { stat } from "fs/promises";
import { basename, join } from "path";
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

// src/hash.ts
var generateRecursiveFileHashes = async (file, allowedExtensions, dependencyVersions, hashes) => {
  if (isLocalCodeFile(file)) {
    file = await resolveModuleImportFile(file, allowedExtensions);
  }
  if (hashes.has(file)) {
    return;
  }
  if (isLocalCodeFile(file)) {
    const code = await readFile2(file, "utf8");
    const deps = await findFileImports(file, code);
    const hash = createHash("sha1").update(code).digest();
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
  if (builtinModules.includes(file.replace(/^node\:/, ""))) {
    return;
  }
  throw new Error(`Can't find the dependency version for: ${file}`);
};
var mergeHashes = (hashes) => {
  const merge = Buffer.concat(Array.from(hashes.values()).sort());
  return createHash("sha1").update(merge).digest("hex");
};

// src/version.ts
import { execFile } from "child_process";
var loadPackageDependencyVersions = (entry, packageManager) => {
  if (packageManager === "pnpm") {
    return new Promise((resolve3, reject) => {
      execFile(`pnpm`, ["list", "--json"], { cwd: entry }, (error, stdout) => {
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
import { dirname as dirname2, extname, resolve as resolve2 } from "path";
var defaultOptions = {
  extensions: ["js", "mjs", "jsx", "ts", "mts", "tsx"],
  packageManager: "pnpm"
};
var generateFileHash = async (file, opts = {}) => {
  const options = { ...defaultOptions, ...opts };
  const hashes = /* @__PURE__ */ new Map();
  const versions = opts.packageVersions ?? await loadPackageDependencyVersions(dirname2(file), options.packageManager);
  await generateRecursiveFileHashes(file, options.extensions, versions, hashes);
  return mergeHashes(hashes);
};
var generateFolderHash = async (folder, opts = {}) => {
  const options = { ...defaultOptions, ...opts };
  const hashes = /* @__PURE__ */ new Map();
  const versions = options.packageVersions ?? await loadPackageDependencyVersions(folder, options.packageManager);
  const files = await readdir(folder, { recursive: true, withFileTypes: true });
  for (const file of files) {
    if (file.isFile() && options.extensions.includes(extname(file.name).substring(1))) {
      await generateRecursiveFileHashes(resolve2(file.path, file.name), options.extensions, versions, hashes);
    }
  }
  return mergeHashes(hashes);
};
export {
  generateFileHash,
  generateFolderHash,
  loadPackageDependencyVersions
};
