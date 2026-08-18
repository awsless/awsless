import { access, mkdir, writeFile } from "fs/promises";
import { basename, dirname, extname, join, resolve } from "path";
import { rollup } from "rollup";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import babel from "@rollup/plugin-babel";
import json from "@rollup/plugin-json";
import coffeescript from "coffeescript";
import { createFilter } from "rollup-pluginutils";
import crypto from "crypto";
import stylus from "stylus";
import CleanCSS from "clean-css";
import loadTsConfig from "tsconfig-loader";
import nodeEval from "node-eval";
import { spawn } from "child_process";
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
	const filter = createFilter(options.include, options.exclude);
	const extensions = options.extensions;
	delete options.extensions;
	delete options.include;
	delete options.exclude;
	return { transform(code, id) {
		if (!filter(id)) return null;
		if (extensions.indexOf(extname(id)) === -1) return null;
		const output = coffeescript.compile(code, {
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
	const filter = createFilter(options.include, options.exclude);
	return { transform(source, id) {
		if (!filter(id)) return;
		if (options.extensions?.indexOf(extname(id)) === -1) return;
		const minified = source.trim();
		const hash = crypto.createHash("sha1").update(minified, "utf8").digest("hex");
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
	const filter = createFilter(options.include, options.exclude);
	return { transform(code, id) {
		if (!filter(id)) return;
		if (options.extensions?.indexOf(extname(id)) === -1) return;
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
	const filter = createFilter(options.include, options.exclude);
	return { async transform(code, id) {
		if (!filter(id)) return;
		if (options.extensions?.indexOf(extname(id)) === -1) return;
		const css = await stylus(code).set("filename", basename(id)).set("paths", [dirname(id)]).render();
		const result = new CleanCSS().minify(css.toString());
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
		alias({ entries: aliases }),
		commonjs({ sourceMap }),
		babel({
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
		json(),
		lua_default(),
		raw_default({ extensions: [
			".md",
			".html",
			".css"
		] }),
		nodeResolve({
			preferBuiltins: true,
			extensions: [
				".js",
				".coffee",
				".jsx"
			]
		}),
		transpilersOptions.coffeescript && coffee_default({ sourceMap }),
		transpilersOptions.typescript && typescript({ sourceMap }),
		minimize && terser({
			toplevel: true,
			sourceMap
		})
	];
};
const shouldIncludeTypescript = async (transpilers) => {
	if (transpilers.typescript) {
		const path = join(process.cwd(), "tsconfig.json");
		try {
			await access(path);
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
	const loaded = (loadTsConfig.default || loadTsConfig).call();
	if (!loaded) return;
	const cwd = process.cwd();
	const paths = loaded.tsConfig?.compilerOptions?.paths || {};
	const aliases = {};
	for (const key in paths) {
		const alias = paths[key]?.[0];
		const find = key.replace(/\/\*$/, "");
		const replacement = alias.replace(/\/\*$/, "");
		aliases[find] = resolve(join(cwd, replacement));
	}
	return aliases;
};
const rollup$1 = async (input, options = {}) => {
	const { minimize = false, sourceMap = true, moduleSideEffects = true, format = "cjs", transpilers = {
		typescript: true,
		coffeescript: true
	}, external, onwarn, aliases } = options;
	const { output: [output] } = await (await rollup({
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
		const ext = extname(input);
		const name = basename(input, ext);
		const path = join(process.cwd(), output);
		await mkdir(path, { recursive: true });
		await buildFile(input, options);
		const { esm, cjs } = await buildFile(input, options);
		await Promise.all([writeFile(`${path}/${name}.cjs`, cjs.code), writeFile(`${path}/${name}.js`, esm.code)]);
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
	return nodeEval(code, input);
};
//#endregion
//#region src/run.ts
const spawn$1 = async (input, options = {}) => {
	const { code } = await rollup$1(input, {
		external(importee) {
			if (options.includePackages) return false;
			return ![".", "/"].includes(importee[0]);
		},
		...options,
		sourceMap: false
	});
	let node;
	if (options.env && options.env.length > 0) node = spawn("env", [...options.env, "node"]);
	else node = spawn("node");
	node.stdin.write(code);
	node.stdin.end();
	return node;
};
const exec = async (input, options = {}) => {
	const node = await spawn$1(input, options);
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
export { bundle as a, loadTsConfigAliases as c, compile as i, plugins as l, spawn$1 as n, build as o, importModule as r, extensions as s, exec as t, RuntimeError as u };
