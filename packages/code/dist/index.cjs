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
  RuntimeError: () => RuntimeError,
  build: () => build,
  bundle: () => bundle,
  compile: () => compile,
  exec: () => exec,
  extensions: () => extensions,
  importModule: () => importModule,
  spawn: () => spawn
});
module.exports = __toCommonJS(src_exports);

// src/error/runtime.ts
var RuntimeError = class extends Error {
  constructor(message) {
    super(message);
  }
};

// src/build.ts
var import_promises2 = require("fs/promises");
var import_path6 = require("path");

// src/rollup/index.ts
var import_rollup = require("rollup");
var import_plugin_node_resolve = __toESM(require("@rollup/plugin-node-resolve"), 1);
var import_plugin_typescript = __toESM(require("@rollup/plugin-typescript"), 1);
var import_plugin_commonjs = __toESM(require("@rollup/plugin-commonjs"), 1);
var import_plugin_terser = __toESM(require("@rollup/plugin-terser"), 1);
var import_plugin_babel = __toESM(require("@rollup/plugin-babel"), 1);
var import_plugin_json = __toESM(require("@rollup/plugin-json"), 1);

// src/rollup/coffee.ts
var import_coffeescript = __toESM(require("coffeescript"), 1);
var import_rollup_pluginutils = require("rollup-pluginutils");
var import_path = require("path");
var coffee_default = (options = {}) => {
  options = {
    sourceMap: true,
    bare: true,
    extensions: [".coffee"],
    ...options
  };
  const filter = (0, import_rollup_pluginutils.createFilter)(options.include, options.exclude);
  const extensions2 = options.extensions;
  delete options.extensions;
  delete options.include;
  delete options.exclude;
  return {
    transform(code, id) {
      if (!filter(id))
        return null;
      if (extensions2.indexOf((0, import_path.extname)(id)) === -1)
        return null;
      const output = import_coffeescript.default.compile(code, {
        ...options,
        filename: id
      });
      if (!options.sourceMap) {
        return { code: output };
      }
      return {
        code: output.js,
        map: JSON.parse(output.v3SourceMap)
      };
    }
  };
};

// src/rollup/lua.ts
var import_rollup_pluginutils2 = require("rollup-pluginutils");
var import_path2 = require("path");
var import_crypto = __toESM(require("crypto"), 1);
var lua_default = (options = {}) => {
  options = {
    extensions: [".lua"],
    ...options
  };
  const filter = (0, import_rollup_pluginutils2.createFilter)(options.include, options.exclude);
  return {
    transform(source, id) {
      if (!filter(id))
        return;
      if (options.extensions?.indexOf((0, import_path2.extname)(id)) === -1)
        return;
      const minified = source.trim();
      const hash = import_crypto.default.createHash("sha1").update(minified, "utf8").digest("hex");
      const code = [
        `export default ${JSON.stringify(minified)};`,
        `export const hash = '${hash}';`
      ].join("\n");
      return {
        code,
        map: { mappings: "" }
      };
    }
  };
};

// src/rollup/raw.ts
var import_rollup_pluginutils3 = require("rollup-pluginutils");
var import_path3 = require("path");
var raw_default = (options = {}) => {
  options = {
    extensions: [],
    ...options
  };
  const filter = (0, import_rollup_pluginutils3.createFilter)(options.include, options.exclude);
  return {
    transform(code, id) {
      if (!filter(id))
        return;
      if (options.extensions?.indexOf((0, import_path3.extname)(id)) === -1)
        return;
      return {
        code: `export default ${JSON.stringify(code)};`,
        map: { mappings: "" }
      };
    }
  };
};

// src/rollup/index.ts
var import_promises = require("fs/promises");
var import_path5 = require("path");

// src/rollup/stylus.ts
var import_rollup_pluginutils4 = require("rollup-pluginutils");
var import_path4 = require("path");
var import_stylus = __toESM(require("stylus"), 1);
var import_clean_css = __toESM(require("clean-css"), 1);
var stylus_default = (options = {}) => {
  options = {
    extensions: [".styl"]
  };
  const filter = (0, import_rollup_pluginutils4.createFilter)(options.include, options.exclude);
  return {
    async transform(code, id) {
      if (!filter(id))
        return;
      if (options.extensions?.indexOf((0, import_path4.extname)(id)) === -1)
        return;
      const css = await (0, import_stylus.default)(code).set("filename", (0, import_path4.basename)(id)).set("paths", [(0, import_path4.dirname)(id)]).render();
      const clean = new import_clean_css.default();
      const result = clean.minify(css.toString());
      return {
        code: `export default ${JSON.stringify(result.styles)};`,
        map: { mappings: "" }
      };
    }
  };
};

// src/rollup/index.ts
var extensions = [
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
var plugins = ({ minimize = false, sourceMap = true, transpilers } = {}) => {
  const transpilersOptions = Object.assign({
    ts: true,
    coffee: true
  }, transpilers);
  return [
    (0, import_plugin_commonjs.default)({ sourceMap }),
    (0, import_plugin_babel.default)({
      sourceMaps: sourceMap,
      presets: [
        ["@babel/preset-react", {
          pragma: "h",
          pragmaFrag: "Fragment",
          throwIfNamespace: false
        }]
      ],
      babelrc: false,
      extensions: [".js", ".jsx"],
      babelHelpers: "bundled"
    }),
    stylus_default(),
    (0, import_plugin_json.default)(),
    lua_default(),
    raw_default({
      extensions: [".md", ".html", ".css"]
    }),
    (0, import_plugin_node_resolve.default)({
      preferBuiltins: true,
      extensions: [".js", ".coffee", ".jsx"]
    }),
    transpilersOptions.coffeescript && coffee_default({
      sourceMap
    }),
    transpilersOptions.typescript && (0, import_plugin_typescript.default)({
      sourceMap
    }),
    // transpilersOptions.typescript && sucrase({
    // 	jsxFragmentPragma: 'Fragment',
    // 	jsxPragma: 'h',
    // 	transforms: ['typescript', 'jsx']
    // }),
    minimize && (0, import_plugin_terser.default)({
      toplevel: true,
      sourceMap
    })
  ];
};
var shouldIncludeTypescript = async (transpilers) => {
  if (transpilers.typescript) {
    const path = (0, import_path5.join)(process.cwd(), "tsconfig.json");
    try {
      await (0, import_promises.access)(path);
      return { ...transpilers, typescript: true };
    } catch (error) {
      return { ...transpilers, typescript: false };
    }
  }
  return transpilers;
};
var rollup = async (input, options = {}) => {
  const {
    minimize = false,
    sourceMap = true,
    moduleSideEffects = true,
    format = "cjs",
    transpilers = {
      typescript: true,
      coffeescript: true
    },
    // exports = 'default',
    external,
    onwarn
  } = options;
  const bundle2 = await (0, import_rollup.rollup)({
    input,
    external,
    onwarn,
    plugins: plugins({
      minimize,
      sourceMap,
      transpilers: await shouldIncludeTypescript(transpilers)
    }),
    treeshake: {
      moduleSideEffects
    }
  });
  const { output: [output] } = await bundle2.generate({
    format,
    sourcemap: sourceMap,
    exports: options.exports
  });
  return {
    code: output.code,
    map: output.map || void 0
  };
};

// src/build.ts
var buildFile = async (input, options = {}) => {
  const params = {
    minimize: false,
    sourceMap: false,
    external: (importee) => {
      if (importee === input) {
        return false;
      }
      return ![".", "/"].includes(importee[0]);
    },
    ...options
  };
  const [esm, cjs] = await Promise.all([
    rollup(input, { ...params, format: "esm" }),
    rollup(input, { ...params, format: "cjs" })
  ]);
  return { esm, cjs };
};
var build = async (inputs, output, options = {}) => {
  await Promise.all(inputs.map(async (input) => {
    const ext = (0, import_path6.extname)(input);
    const name = (0, import_path6.basename)(input, ext);
    const path = (0, import_path6.join)(process.cwd(), output);
    await (0, import_promises2.mkdir)(path, { recursive: true });
    await buildFile(input, options);
    const { esm, cjs } = await buildFile(input, options);
    await Promise.all([
      (0, import_promises2.writeFile)(`${path}/${name}.cjs`, cjs.code),
      (0, import_promises2.writeFile)(`${path}/${name}.js`, esm.code)
    ]);
  }));
};

// src/bundle.ts
var bundle = async (input, options = {}) => {
  return rollup(input, options);
};

// src/compile.ts
var compile = async (input, options = {}) => {
  return rollup(input, {
    external(importee) {
      return importee !== input;
    },
    ...options
  });
};

// src/import.ts
var import_node_eval = __toESM(require("node-eval"), 1);
var importModule = async (input, options = {}) => {
  const { code } = await rollup(input, {
    format: "cjs",
    sourceMap: false,
    ...options
  });
  return (0, import_node_eval.default)(code, input);
};

// src/run.ts
var import_child_process = require("child_process");
var spawn = async (input, options = {}) => {
  const { code } = await rollup(input, {
    external(importee) {
      if (options.includePackages)
        return false;
      return ![".", "/"].includes(importee[0]);
    },
    ...options,
    sourceMap: false
  });
  let node;
  if (options.env && options.env.length > 0) {
    node = (0, import_child_process.spawn)("env", [...options.env, "node"]);
  } else {
    node = (0, import_child_process.spawn)("node");
  }
  node.stdin.write(code);
  node.stdin.end();
  return node;
};
var exec = async (input, options = {}) => {
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
      if (errs.length) {
        const error = Buffer.concat(errs).toString("utf8").replace(/\n$/, "");
        return reject(new RuntimeError(error));
      }
      const result = Buffer.concat(outs).toString("utf8").replace(/\n$/, "");
      resolve(result);
    });
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RuntimeError,
  build,
  bundle,
  compile,
  exec,
  extensions,
  importModule,
  spawn
});
