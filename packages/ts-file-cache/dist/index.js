import { builtinModules } from "node:module";
import { lstat, readFile, readdir, stat } from "fs/promises";
import { basename, dirname, extname, isAbsolute, join, normalize, relative, resolve, sep } from "path";
import { createHash } from "crypto";
import { walk } from "estree-walker";
import { parseSync } from "oxc-parser";
import { parse } from "yaml";
//#region src/import.ts
const findImports = async (file, code) => {
	const ast = parseSync(file, code);
	if (ast.errors.length > 0) throw new Error(`Failed to parse: ${file}`, { cause: ast.errors[0] });
	const importing = /* @__PURE__ */ new Set();
	walk(ast.program, { enter(node) {
		if (node.type === "ImportDeclaration" || node.type === "ExportAllDeclaration") importing.add(node.source.value);
		if (node.type === "ExportNamedDeclaration" && node.source) importing.add(node.source.value);
		if (node.type === "ImportExpression" && node.source.type === "Literal") importing.add(node.source.value);
		const importEquals = node;
		if (importEquals.type === "TSImportEqualsDeclaration" && importEquals.moduleReference.type === "TSExternalModuleReference") importing.add(importEquals.moduleReference.expression.value);
	} });
	return [...importing].map((importee) => {
		if (importee.startsWith(".")) return resolve(dirname(file), importee);
		const parts = importee.split("/");
		if (parts.length > 2) return parts.slice(0, 2).join("/");
		return importee;
	});
};
//#endregion
//#region src/module.ts
const findFile = async (files) => {
	for (const file of files) try {
		if ((await stat(file)).isFile()) return file;
	} catch {
		continue;
	}
	throw new Error(`No such file: ${files.join(", ")}`);
};
const alternateExtensions = {
	".js": [".ts", ".tsx"],
	".mjs": [".mts"],
	".cjs": [".cts"],
	".jsx": [".tsx"]
};
const resolveModuleImportFile = (file, allowedExtensions) => {
	const extension = extname(file);
	const alternates = alternateExtensions[extension];
	if (alternates) {
		const candidates = [file];
		for (const alternate of alternates) if (allowedExtensions.includes(alternate.substring(1))) candidates.push(file.substring(0, file.length - extension.length) + alternate);
		return findFile(candidates);
	}
	if (!basename(file).includes(".")) return findFile([
		file,
		...allowedExtensions.map((ext) => `${file}.${ext}`),
		...allowedExtensions.map((ext) => join(file, `index.${ext}`))
	]);
	return file;
};
const isLocalCodeFile = (file) => {
	return file.startsWith("/") || file.startsWith(".");
};
const toAbsolute = (file) => {
	if (isAbsolute(file)) return file;
	return join(process.cwd(), file);
};
//#endregion
//#region src/hash.ts
const generateRecursiveFileHashes = async (workspace, file, sourceFile, allowedExtensions, hashes) => {
	if (isLocalCodeFile(file)) {
		try {
			file = await resolveModuleImportFile(file, allowedExtensions);
		} catch (error) {
			throw new Error(`Can't find imported file: "${file}" inside the source: "${sourceFile}"`, { cause: error });
		}
		const relFile = relative(workspace.cwd, file).split(sep).join("/");
		if (hashes.has(relFile)) return;
		const code = await readFile(file, "utf8");
		const ext = file.split(".").pop();
		const hash = createHash("sha1").update(code).digest();
		hashes.set(relFile, hash);
		if (!ext || !allowedExtensions.includes(ext)) return;
		const deps = await findImports(file, code);
		for (const dep of deps) await generateRecursiveFileHashes(workspace, dep, file, allowedExtensions, hashes);
		return;
	}
	const module = getPackageName(file);
	const dependency = findDependency(workspace, module, sourceFile);
	if (dependency) {
		if (dependency.type === "package") hashes.set(`${module}@${dependency.version}`, Buffer.from(dependency.treeHash, "hex"));
		else {
			const localPackage = workspace.packages[dependency.link];
			if (!localPackage) throw new Error(`Can't find the local workspace package for: ${file}`);
			if (!localPackage.main) throw new Error(`Workspace package doesn't have a main entry: ${file}`);
			await generateRecursiveFileHashes(workspace, localPackage.main, localPackage.main, allowedExtensions, hashes);
		}
		return;
	}
	if (builtinModules.includes(module.replace(/^node:/, ""))) return;
	throw new Error(`Can't find the dependency version for: ${file} inside the source: ${sourceFile}`);
};
const mergeHashes = (hashes) => {
	const names = Array.from(hashes.keys()).toSorted();
	const merged = createHash("sha1");
	for (const name of names) {
		merged.update(name);
		merged.update(hashes.get(name));
	}
	return merged.digest("hex");
};
const getPackageName = (importee) => {
	const parts = importee.split("/");
	if (importee.startsWith("@")) {
		if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
	} else if (parts.length >= 1) return parts[0];
	throw new Error(`Malformed importee: ${importee}`);
};
const findDependency = (workspace, module, source) => {
	const pkg = Object.values(workspace.packages).filter((p) => source === p.path || source.startsWith(p.path + sep)).toSorted((a, b) => b.path.split(sep).length - a.path.split(sep).length).find((p) => p.dependencies[module]);
	if (!pkg) return;
	return pkg.dependencies[module];
};
//#endregion
//#region src/package-manager/bun.ts
const bun = async (cwd, lockFile, lockfileHash) => {
	const data = parseJsonc(lockFile);
	const resolvedVersions = {};
	for (const [key, entry] of Object.entries(data.packages ?? {})) {
		const resolution = entry[0];
		const at = resolution.lastIndexOf("@");
		const version = resolution.substring(at + 1);
		if (!version.startsWith("workspace:")) resolvedVersions[key] = version;
	}
	const workspacePaths = {};
	for (const [path, workspace] of Object.entries(data.workspaces)) if (workspace.name) workspacePaths[workspace.name] = path;
	const importers = {};
	for (const [path, workspace] of Object.entries(data.workspaces)) {
		const deps = {
			...workspace.devDependencies,
			...workspace.optionalDependencies,
			...workspace.dependencies
		};
		const dependencies = {};
		for (const [name, specifier] of Object.entries(deps)) {
			if (specifier.startsWith("workspace:")) {
				const target = specifier.substring(10);
				const workspacePath = workspacePaths[name];
				if (workspacePath !== void 0) dependencies[name] = {
					type: "workspace",
					link: join(cwd, workspacePath)
				};
				else dependencies[name] = {
					type: "workspace",
					link: join(cwd, path, target)
				};
				continue;
			}
			const version = resolvedVersions[name] ?? resolvedVersions[`${workspace.name}/${name}`];
			if (version) dependencies[name] = {
				type: "package",
				version,
				treeHash: lockfileHash
			};
			else dependencies[name] = {
				type: "package",
				version: specifier,
				treeHash: lockfileHash
			};
		}
		importers[path] = dependencies;
	}
	return {
		cwd,
		packages: await buildPackages(cwd, importers)
	};
};
const parseJsonc = (text) => {
	try {
		return JSON.parse(text);
	} catch {
		return JSON.parse(stripJsoncSyntax(text));
	}
};
const stripJsoncSyntax = (text) => {
	let result = "";
	let index = 0;
	while (index < text.length) {
		const char = text[index];
		if (char === "\"") {
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
				if (stringChar === "\"") break;
			}
			continue;
		}
		if (char === "/" && text[index + 1] === "/") {
			while (index < text.length && text[index] !== "\n") index++;
			continue;
		}
		if (char === "/" && text[index + 1] === "*") {
			index += 2;
			while (index < text.length && !(text[index] === "*" && text[index + 1] === "/")) index++;
			index += 2;
			continue;
		}
		if (char === ",") {
			let ahead = index + 1;
			while (ahead < text.length && /\s/.test(text[ahead])) ahead++;
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
//#endregion
//#region src/package-manager/pnpm.ts
const pnpm = async (cwd, lockFile, lockfileHash) => {
	const data = parse(lockFile);
	const treeHash = createTreeHasher(data, lockfileHash);
	const importers = {};
	for (const [path, importee] of Object.entries(data.importers)) {
		const deps = {
			...importee.devDependencies,
			...importee.optionalDependencies,
			...importee.dependencies
		};
		const dependencies = {};
		for (const [name, entry] of Object.entries(deps)) if (entry.version.startsWith("link:")) dependencies[name] = {
			type: "workspace",
			link: join(cwd, path, entry.version.substring(5))
		};
		else dependencies[name] = {
			type: "package",
			version: entry.version,
			treeHash: treeHash(`${name}@${entry.version}`)
		};
		importers[path] = dependencies;
	}
	return {
		cwd,
		packages: await buildPackages(cwd, importers)
	};
};
const createTreeHasher = (data, lockfileHash) => {
	if (!data.snapshots) return () => lockfileHash;
	const graph = {};
	for (const [key, entry] of Object.entries(data.snapshots)) {
		const deps = {
			...entry.dependencies,
			...entry.optionalDependencies
		};
		const children = [];
		for (const [name, version] of Object.entries(deps)) if (!version.startsWith("link:")) children.push(`${name}@${version}`);
		graph[key] = children;
	}
	const hashed = /* @__PURE__ */ new Map();
	return (key) => {
		const cached = hashed.get(key);
		if (cached) return cached;
		const reachable = /* @__PURE__ */ new Set([key]);
		const queue = [key];
		while (queue.length > 0) {
			const current = queue.pop();
			for (const child of graph[current] ?? []) if (!reachable.has(child)) {
				reachable.add(child);
				queue.push(child);
			}
		}
		const hash = createHash("sha1");
		for (const entry of Array.from(reachable).toSorted()) {
			hash.update(entry);
			hash.update("\n");
		}
		const digest = hash.digest("hex");
		hashed.set(key, digest);
		return digest;
	};
};
//#endregion
//#region src/package-manager/util.ts
const parsers = {
	"pnpm-lock.yaml": pnpm,
	"bun.lock": bun
};
const loadPackageManager = async (search, level = 5) => {
	if (!level) throw new TypeError("No pnpm or bun lock file found");
	for (const [lockFileName, parser] of Object.entries(parsers)) {
		const file = join(search, lockFileName);
		if (await fileExist(file)) {
			const content = await readFile(file, "utf8");
			const lockfileHash = createHash("sha1").update(content).digest("hex");
			return {
				...await parser(search, content, lockfileHash),
				lockfileHash
			};
		}
	}
	return loadPackageManager(normalize(join(search, "..")), level - 1);
};
const fileExist = async (file) => {
	try {
		if ((await lstat(file)).isFile()) return true;
	} catch {}
	return false;
};
const buildPackages = async (cwd, importers) => {
	const packages = {};
	await Promise.all(Object.entries(importers).map(async ([path, dependencies]) => {
		const packageJson = await readFile(join(cwd, path, "package.json"), "utf8");
		const packageData = JSON.parse(packageJson);
		const entry = packageData.module ?? packageData.main;
		packages[join(cwd, path)] = {
			name: packageData.name,
			path: join(cwd, path),
			main: entry ? join(cwd, path, entry) : void 0,
			dependencies
		};
	}));
	return packages;
};
//#endregion
//#region src/index.ts
const loadWorkspace = async (search) => {
	return loadPackageManager(toAbsolute(search));
};
const defaultOptions = { extensions: [
	"js",
	"mjs",
	"jsx",
	"ts",
	"mts",
	"tsx"
] };
const generateFileHash = async (workspace, file, opts = {}) => {
	const options = {
		...defaultOptions,
		...opts
	};
	const hashes = /* @__PURE__ */ new Map();
	const absoluteFile = toAbsolute(file);
	await generateRecursiveFileHashes(workspace, absoluteFile, absoluteFile, options.extensions, hashes);
	return mergeHashes(hashes);
};
const generateFolderHash = async (workspace, folder, opts = {}) => {
	const options = {
		...defaultOptions,
		...opts
	};
	const hashes = /* @__PURE__ */ new Map();
	const absoluteFolder = toAbsolute(folder);
	const files = await readdir(absoluteFolder, {
		recursive: true,
		withFileTypes: true
	});
	for (const file of files) if (file.isFile() && options.extensions.includes(extname(file.name).substring(1))) {
		const f = resolve(file.parentPath, file.name);
		await generateRecursiveFileHashes(workspace, f, f, options.extensions, hashes);
	}
	return mergeHashes(hashes);
};
//#endregion
export { generateFileHash, generateFolderHash, loadWorkspace };
