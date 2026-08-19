Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let fs_promises = require("fs/promises");
let path = require("path");
let crypto = require("crypto");
let node_module = require("node:module");
let estree_walker = require("estree-walker");
let oxc_parser = require("oxc-parser");
let yaml = require("yaml");
//#region src/import.ts
const findImports = async (file, code) => {
	const ast = (0, oxc_parser.parseSync)(file, code);
	if (ast.errors.length > 0) throw new Error(`Failed to parse: ${file}`, { cause: ast.errors[0] });
	const importing = /* @__PURE__ */ new Set();
	(0, estree_walker.walk)(ast.program, { enter(node) {
		if (node.type === "ImportDeclaration" || node.type === "ExportAllDeclaration") importing.add(node.source.value);
		if (node.type === "ExportNamedDeclaration" && node.source) importing.add(node.source.value);
		if (node.type === "ImportExpression" && node.source.type === "Literal") importing.add(node.source.value);
		const importEquals = node;
		if (importEquals.type === "TSImportEqualsDeclaration" && importEquals.moduleReference.type === "TSExternalModuleReference") importing.add(importEquals.moduleReference.expression.value);
	} });
	return [...importing].map((importee) => {
		if (importee.startsWith(".")) return (0, path.resolve)((0, path.dirname)(file), importee);
		const parts = importee.split("/");
		if (parts.length > 2) return parts.slice(0, 2).join("/");
		return importee;
	});
};
//#endregion
//#region src/module.ts
const findFile = async (files) => {
	for (const file of files) try {
		if ((await (0, fs_promises.stat)(file)).isFile()) return file;
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
	const extension = (0, path.extname)(file);
	const alternates = alternateExtensions[extension];
	if (alternates) {
		const candidates = [file];
		for (const alternate of alternates) if (allowedExtensions.includes(alternate.substring(1))) candidates.push(file.substring(0, file.length - extension.length) + alternate);
		return findFile(candidates);
	}
	if (!(0, path.basename)(file).includes(".")) return findFile([
		file,
		...allowedExtensions.map((ext) => `${file}.${ext}`),
		...allowedExtensions.map((ext) => (0, path.join)(file, `index.${ext}`))
	]);
	return file;
};
const isLocalCodeFile = (file) => {
	return file.startsWith("/") || file.startsWith(".");
};
const toAbsolute = (file) => {
	if ((0, path.isAbsolute)(file)) return file;
	return (0, path.join)(process.cwd(), file);
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
		const relFile = (0, path.relative)(workspace.cwd, file).split(path.sep).join("/");
		if (hashes.has(relFile)) return;
		const code = await (0, fs_promises.readFile)(file, "utf8");
		const ext = file.split(".").pop();
		const hash = (0, crypto.createHash)("sha1").update(code).digest();
		hashes.set(relFile, hash);
		if (!ext || !allowedExtensions.includes(ext)) return;
		const deps = await findImports(file, code);
		for (const dep of deps) await generateRecursiveFileHashes(workspace, dep, file, allowedExtensions, hashes);
		return;
	}
	const module = getPackageName(file);
	if (hashes.has(module)) return;
	const dependency = findDependency(workspace, module, sourceFile);
	if (dependency) {
		if (dependency.type === "package") hashes.set(module, Buffer.from(`${module}:${dependency.version}`, "utf8"));
		else {
			const localPackage = workspace.packages[dependency.link];
			if (!localPackage) throw new Error(`Can't find the local workspace package for: ${file}`);
			if (!localPackage.main) throw new Error(`Workspace package doesn't have a main entry: ${file}`);
			await generateRecursiveFileHashes(workspace, localPackage.main, localPackage.main, allowedExtensions, hashes);
		}
		return;
	}
	if (node_module.builtinModules.includes(module.replace(/^node:/, ""))) return;
	throw new Error(`Can't find the dependency version for: ${file} inside the source: ${sourceFile}`);
};
const mergeHashes = (hashes) => {
	const names = Array.from(hashes.keys()).toSorted();
	const merged = (0, crypto.createHash)("sha1");
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
	const pkg = Object.values(workspace.packages).filter((p) => source === p.path || source.startsWith(p.path + path.sep)).toSorted((a, b) => b.path.split(path.sep).length - a.path.split(path.sep).length).find((p) => p.dependencies[module]);
	if (!pkg) return;
	return pkg.dependencies[module];
};
//#endregion
//#region src/package-manager/bun.ts
const bun = async (cwd, lockFile) => {
	const data = parseJsonc(lockFile);
	const resolvedVersions = {};
	for (const [key, entry] of Object.entries(data.packages ?? {})) {
		const resolution = entry[0];
		const at = resolution.lastIndexOf("@");
		const version = resolution.substring(at + 1);
		if (!version.startsWith("workspace:")) resolvedVersions[key] = version;
	}
	const workspacePaths = {};
	for (const [path$3, workspace] of Object.entries(data.workspaces)) if (workspace.name) workspacePaths[workspace.name] = path$3;
	const importers = {};
	for (const [path$4, workspace] of Object.entries(data.workspaces)) {
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
					link: (0, path.join)(cwd, workspacePath)
				};
				else dependencies[name] = {
					type: "workspace",
					link: (0, path.join)(cwd, path$4, target)
				};
				continue;
			}
			const version = resolvedVersions[name] ?? resolvedVersions[`${workspace.name}/${name}`];
			if (version) dependencies[name] = {
				type: "package",
				version
			};
			else dependencies[name] = {
				type: "package",
				version: specifier
			};
		}
		importers[path$4] = dependencies;
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
const pnpm = async (cwd, lockFile) => {
	const data = (0, yaml.parse)(lockFile);
	const importers = {};
	for (const [path$2, importee] of Object.entries(data.importers)) {
		const deps = {
			...importee.devDependencies,
			...importee.optionalDependencies,
			...importee.dependencies
		};
		const dependencies = {};
		for (const [name, entry] of Object.entries(deps)) if (entry.version.startsWith("link:")) dependencies[name] = {
			type: "workspace",
			link: (0, path.join)(cwd, path$2, entry.version.substring(5))
		};
		else dependencies[name] = {
			type: "package",
			version: entry.version
		};
		importers[path$2] = dependencies;
	}
	return {
		cwd,
		packages: await buildPackages(cwd, importers)
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
		const file = (0, path.join)(search, lockFileName);
		if (await fileExist(file)) {
			const content = await (0, fs_promises.readFile)(file, "utf8");
			return {
				...await parser(search, content),
				lockfileHash: (0, crypto.createHash)("sha1").update(content).digest("hex")
			};
		}
	}
	return loadPackageManager((0, path.normalize)((0, path.join)(search, "..")), level - 1);
};
const fileExist = async (file) => {
	try {
		if ((await (0, fs_promises.lstat)(file)).isFile()) return true;
	} catch {}
	return false;
};
const buildPackages = async (cwd, importers) => {
	const packages = {};
	await Promise.all(Object.entries(importers).map(async ([path$1, dependencies]) => {
		const packageJson = await (0, fs_promises.readFile)((0, path.join)(cwd, path$1, "package.json"), "utf8");
		const packageData = JSON.parse(packageJson);
		const entry = packageData.module ?? packageData.main;
		packages[(0, path.join)(cwd, path$1)] = {
			name: packageData.name,
			path: (0, path.join)(cwd, path$1),
			main: entry ? (0, path.join)(cwd, path$1, entry) : void 0,
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
const seedHashes = (workspace) => {
	return /* @__PURE__ */ new Map([["#lockfile", Buffer.from(workspace.lockfileHash, "hex")]]);
};
const generateFileHash = async (workspace, file, opts = {}) => {
	const options = {
		...defaultOptions,
		...opts
	};
	const hashes = seedHashes(workspace);
	const absoluteFile = toAbsolute(file);
	await generateRecursiveFileHashes(workspace, absoluteFile, absoluteFile, options.extensions, hashes);
	return mergeHashes(hashes);
};
const generateFolderHash = async (workspace, folder, opts = {}) => {
	const options = {
		...defaultOptions,
		...opts
	};
	const hashes = seedHashes(workspace);
	const absoluteFolder = toAbsolute(folder);
	const files = await (0, fs_promises.readdir)(absoluteFolder, {
		recursive: true,
		withFileTypes: true
	});
	for (const file of files) if (file.isFile() && options.extensions.includes((0, path.extname)(file.name).substring(1))) {
		const f = (0, path.resolve)(file.parentPath, file.name);
		await generateRecursiveFileHashes(workspace, f, f, options.extensions, hashes);
	}
	return mergeHashes(hashes);
};
//#endregion
exports.generateFileHash = generateFileHash;
exports.generateFolderHash = generateFolderHash;
exports.loadWorkspace = loadWorkspace;
