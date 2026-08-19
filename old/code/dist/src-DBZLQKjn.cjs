//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let fs_promises = require("fs/promises");
let path = require("path");
let rollup = require("rollup");
let _rollup_plugin_node_resolve = require("@rollup/plugin-node-resolve");
_rollup_plugin_node_resolve = __toESM(_rollup_plugin_node_resolve, 1);
let _rollup_plugin_typescript = require("@rollup/plugin-typescript");
_rollup_plugin_typescript = __toESM(_rollup_plugin_typescript, 1);
let _rollup_plugin_alias = require("@rollup/plugin-alias");
_rollup_plugin_alias = __toESM(_rollup_plugin_alias, 1);
let _rollup_plugin_commonjs = require("@rollup/plugin-commonjs");
_rollup_plugin_commonjs = __toESM(_rollup_plugin_commonjs, 1);
let _rollup_plugin_terser = require("@rollup/plugin-terser");
_rollup_plugin_terser = __toESM(_rollup_plugin_terser, 1);
let _rollup_plugin_babel = require("@rollup/plugin-babel");
_rollup_plugin_babel = __toESM(_rollup_plugin_babel, 1);
let _rollup_plugin_json = require("@rollup/plugin-json");
_rollup_plugin_json = __toESM(_rollup_plugin_json, 1);
let coffeescript = require("coffeescript");
coffeescript = __toESM(coffeescript, 1);
let rollup_pluginutils = require("rollup-pluginutils");
let crypto = require("crypto");
crypto = __toESM(crypto, 1);
let stylus = require("stylus");
stylus = __toESM(stylus, 1);
let clean_css = require("clean-css");
clean_css = __toESM(clean_css, 1);
let tsconfig_loader = require("tsconfig-loader");
tsconfig_loader = __toESM(tsconfig_loader, 1);
let node_eval = require("node-eval");
node_eval = __toESM(node_eval, 1);
let child_process = require("child_process");
//#region src/error/runtime.ts
var RuntimeError = class extends Error {
	constructor(message) {
		super(message);
	}
};
//#endregion
//#region src/rollup/coffee.ts
var coffee_default = (options = {}) => {
	options = {
		sourceMap: true,
		bare: true,
		extensions: [".coffee"],
		...options
	};
	const filter = (0, rollup_pluginutils.createFilter)(options.include, options.exclude);
	const extensions = options.extensions;
	delete options.extensions;
	delete options.include;
	delete options.exclude;
	return { transform(code, id) {
		if (!filter(id)) return null;
		if (extensions.indexOf((0, path.extname)(id)) === -1) return null;
		const output = coffeescript.default.compile(code, {
			...options,
			filename: id
		});
		if (!options.sourceMap) return { code: output };
		return {
			code: output.js,
			map: JSON.parse(output.v3SourceMap)
		};
	} };
};
//#endregion
//#region src/rollup/lua.ts
var lua_default = (options = {}) => {
	options = {
		extensions: [".lua"],
		...options
	};
	const filter = (0, rollup_pluginutils.createFilter)(options.include, options.exclude);
	return { transform(source, id) {
		if (!filter(id)) return;
		if (options.extensions?.indexOf((0, path.extname)(id)) === -1) return;
		const minified = source.trim();
		const hash = crypto.default.createHash("sha1").update(minified, "utf8").digest("hex");
		return {
			code: [`export default ${JSON.stringify(minified)};`, `export const hash = '${hash}';`].join("\n"),
			map: { mappings: "" }
		};
	} };
};
//#endregion
//#region src/rollup/raw.ts
var raw_default = (options = {}) => {
	options = {
		extensions: [],
		...options
	};
	const filter = (0, rollup_pluginutils.createFilter)(options.include, options.exclude);
	return { transform(code, id) {
		if (!filter(id)) return;
		if (options.extensions?.indexOf((0, path.extname)(id)) === -1) return;
		return {
			code: `export default ${JSON.stringify(code)};`,
			map: { mappings: "" }
		};
	} };
};
//#endregion
//#region src/rollup/stylus.ts
var stylus_default = (options = {}) => {
	options = { extensions: [".styl"] };
	const filter = (0, rollup_pluginutils.createFilter)(options.include, options.exclude);
	return { async transform(code, id) {
		if (!filter(id)) return;
		if (options.extensions?.indexOf((0, path.extname)(id)) === -1) return;
		const css = await (0, stylus.default)(code).set("filename", (0, path.basename)(id)).set("paths", [(0, path.dirname)(id)]).render();
		const result = new clean_css.default().minify(css.toString());
		return {
			code: `export default ${JSON.stringify(result.styles)};`,
			map: { mappings: "" }
		};
	} };
};
//#endregion
//#region src/rollup/index.ts
const extensions = [
	"json",
	"js",
	"jsx",
	"tsx",
	"coffee",
	"ts",
	"lua",
	"md",
	"html"
];
const plugins = ({ minimize = false, sourceMap = true, transpilers, aliases } = {}) => {
	const transpilersOptions = Object.assign({
		ts: true,
		coffee: true
	}, transpilers);
	return [
		(0, _rollup_plugin_alias.default)({ entries: aliases }),
		(0, _rollup_plugin_commonjs.default)({ sourceMap }),
		(0, _rollup_plugin_babel.default)({
			sourceMaps: sourceMap,
			presets: [["@babel/preset-react", {
				pragma: "h",
				pragmaFrag: "Fragment",
				throwIfNamespace: false
			}]],
			babelrc: false,
			extensions: [".js", ".jsx"],
			babelHelpers: "bundled"
		}),
		stylus_default(),
		(0, _rollup_plugin_json.default)(),
		lua_default(),
		raw_default({ extensions: [
			".md",
			".html",
			".css"
		] }),
		(0, _rollup_plugin_node_resolve.default)({
			preferBuiltins: true,
			extensions: [
				".js",
				".coffee",
				".jsx"
			]
		}),
		transpilersOptions.coffeescript && coffee_default({ sourceMap }),
		transpilersOptions.typescript && (0, _rollup_plugin_typescript.default)({ sourceMap }),
		minimize && (0, _rollup_plugin_terser.default)({
			toplevel: true,
			sourceMap
		})
	];
};
const shouldIncludeTypescript = async (transpilers) => {
	if (transpilers.typescript) {
		const path$2 = (0, path.join)(process.cwd(), "tsconfig.json");
		try {
			await (0, fs_promises.access)(path$2);
			return {
				...transpilers,
				typescript: true
			};
		} catch (error) {
			return {
				...transpilers,
				typescript: false
			};
		}
	}
	return transpilers;
};
const loadTsConfigAliases = () => {
	const loaded = (tsconfig_loader.default.default || tsconfig_loader.default).call();
	if (!loaded) return;
	const cwd = process.cwd();
	const paths = loaded.tsConfig?.compilerOptions?.paths || {};
	const aliases = {};
	for (const key in paths) {
		const alias = paths[key]?.[0];
		const find = key.replace(/\/\*$/, "");
		const replacement = alias.replace(/\/\*$/, "");
		aliases[find] = (0, path.resolve)((0, path.join)(cwd, replacement));
	}
	return aliases;
};
const rollup$1 = async (input, options = {}) => {
	const { minimize = false, sourceMap = true, moduleSideEffects = true, format = "cjs", transpilers = {
		typescript: true,
		coffeescript: true
	}, external, onwarn, aliases } = options;
	const { output: [output] } = await (await (0, rollup.rollup)({
		input,
		external,
		onwarn,
		plugins: plugins({
			minimize,
			sourceMap,
			transpilers: await shouldIncludeTypescript(transpilers),
			aliases: aliases || loadTsConfigAliases()
		}),
		treeshake: { moduleSideEffects }
	})).generate({
		format,
		sourcemap: sourceMap,
		exports: options.exports
	});
	return {
		code: output.code,
		map: output.map || void 0
	};
};
//#endregion
//#region src/build.ts
const buildFile = async (input, options = {}) => {
	const params = {
		minimize: false,
		sourceMap: false,
		external: (importee) => {
			if (importee === input) return false;
			return ![".", "/"].includes(importee[0]);
		},
		...options
	};
	const [esm, cjs] = await Promise.all([rollup$1(input, {
		...params,
		format: "esm"
	}), rollup$1(input, {
		...params,
		format: "cjs"
	})]);
	return {
		esm,
		cjs
	};
};
const build = async (inputs, output, options = {}) => {
	await Promise.all(inputs.map(async (input) => {
		const ext = (0, path.extname)(input);
		const name = (0, path.basename)(input, ext);
		const path$1 = (0, path.join)(process.cwd(), output);
		await (0, fs_promises.mkdir)(path$1, { recursive: true });
		await buildFile(input, options);
		const { esm, cjs } = await buildFile(input, options);
		await Promise.all([(0, fs_promises.writeFile)(`${path$1}/${name}.cjs`, cjs.code), (0, fs_promises.writeFile)(`${path$1}/${name}.js`, esm.code)]);
	}));
};
//#endregion
//#region src/bundle.ts
const bundle = async (input, options = {}) => {
	return rollup$1(input, options);
};
//#endregion
//#region src/compile.ts
const compile = async (input, options = {}) => {
	return rollup$1(input, {
		external(importee) {
			return importee !== input;
		},
		...options
	});
};
//#endregion
//#region src/import.ts
const importModule = async (input, options = {}) => {
	const { code } = await rollup$1(input, {
		format: "cjs",
		sourceMap: false,
		...options
	});
	return (0, node_eval.default)(code, input);
};
//#endregion
//#region src/run.ts
const spawn = async (input, options = {}) => {
	const { code } = await rollup$1(input, {
		external(importee) {
			if (options.includePackages) return false;
			return ![".", "/"].includes(importee[0]);
		},
		...options,
		sourceMap: false
	});
	let node;
	if (options.env && options.env.length > 0) node = (0, child_process.spawn)("env", [...options.env, "node"]);
	else node = (0, child_process.spawn)("node");
	node.stdin.write(code);
	node.stdin.end();
	return node;
};
const exec = async (input, options = {}) => {
	const node = await spawn(input, options);
	return new Promise((resolve, reject) => {
		const outs = [];
		const errs = [];
		node.stderr.on("data", (data) => {
			errs.push(data);
		});
		node.stdout.on("data", (data) => {
			outs.push(data);
		});
		node.on("error", reject);
		node.on("exit", () => {
			if (errs.length) return reject(new RuntimeError(Buffer.concat(errs).toString("utf8").replace(/\n$/, "")));
			resolve(Buffer.concat(outs).toString("utf8").replace(/\n$/, ""));
		});
	});
};
//#endregion
Object.defineProperty(exports, "RuntimeError", {
	enumerable: true,
	get: function() {
		return RuntimeError;
	}
});
Object.defineProperty(exports, "build", {
	enumerable: true,
	get: function() {
		return build;
	}
});
Object.defineProperty(exports, "bundle", {
	enumerable: true,
	get: function() {
		return bundle;
	}
});
Object.defineProperty(exports, "compile", {
	enumerable: true,
	get: function() {
		return compile;
	}
});
Object.defineProperty(exports, "exec", {
	enumerable: true,
	get: function() {
		return exec;
	}
});
Object.defineProperty(exports, "extensions", {
	enumerable: true,
	get: function() {
		return extensions;
	}
});
Object.defineProperty(exports, "importModule", {
	enumerable: true,
	get: function() {
		return importModule;
	}
});
Object.defineProperty(exports, "loadTsConfigAliases", {
	enumerable: true,
	get: function() {
		return loadTsConfigAliases;
	}
});
Object.defineProperty(exports, "plugins", {
	enumerable: true,
	get: function() {
		return plugins;
	}
});
Object.defineProperty(exports, "spawn", {
	enumerable: true,
	get: function() {
		return spawn;
	}
});
