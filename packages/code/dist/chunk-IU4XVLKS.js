// src/error/runtime.ts
var RuntimeError = class extends Error {
  constructor(message) {
    super(message);
  }
};

// src/build.ts
import { mkdir, writeFile } from "fs/promises";
import { basename as basename2, extname as extname5, join as join2 } from "path";

// src/rollup/index.ts
import { rollup as bundler } from "rollup";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import babel from "@rollup/plugin-babel";
import json from "@rollup/plugin-json";

// src/rollup/coffee.ts
import coffeescript from "coffeescript";
import { createFilter } from "rollup-pluginutils";
import { extname } from "path";
var coffee_default = (options = {}) => {
  options = {
    sourceMap: true,
    bare: true,
    extensions: [".coffee"],
    ...options
  };
  const filter = createFilter(options.include, options.exclude);
  const extensions2 = options.extensions;
  delete options.extensions;
  delete options.include;
  delete options.exclude;
  return {
    transform(code, id) {
      if (!filter(id))
        return null;
      if (extensions2.indexOf(extname(id)) === -1)
        return null;
      const output = coffeescript.compile(code, {
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
import { createFilter as createFilter2 } from "rollup-pluginutils";
import { extname as extname2 } from "path";
import crypto from "crypto";
var lua_default = (options = {}) => {
  options = {
    extensions: [".lua"],
    ...options
  };
  const filter = createFilter2(options.include, options.exclude);
  return {
    transform(source, id) {
      if (!filter(id))
        return;
      if (options.extensions?.indexOf(extname2(id)) === -1)
        return;
      const minified = source.trim();
      const hash = crypto.createHash("sha1").update(minified, "utf8").digest("hex");
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
import { createFilter as createFilter3 } from "rollup-pluginutils";
import { extname as extname3 } from "path";
var raw_default = (options = {}) => {
  options = {
    extensions: [],
    ...options
  };
  const filter = createFilter3(options.include, options.exclude);
  return {
    transform(code, id) {
      if (!filter(id))
        return;
      if (options.extensions?.indexOf(extname3(id)) === -1)
        return;
      return {
        code: `export default ${JSON.stringify(code)};`,
        map: { mappings: "" }
      };
    }
  };
};

// src/rollup/stylus.ts
import { createFilter as createFilter4 } from "rollup-pluginutils";
import { dirname, extname as extname4, basename } from "path";
import stylus from "stylus";
import CleanCSS from "clean-css";
var stylus_default = (options = {}) => {
  options = {
    extensions: [".styl"]
  };
  const filter = createFilter4(options.include, options.exclude);
  return {
    async transform(code, id) {
      if (!filter(id))
        return;
      if (options.extensions?.indexOf(extname4(id)) === -1)
        return;
      const css = await stylus(code).set("filename", basename(id)).set("paths", [dirname(id)]).render();
      const clean = new CleanCSS();
      const result = clean.minify(css.toString());
      return {
        code: `export default ${JSON.stringify(result.styles)};`,
        map: { mappings: "" }
      };
    }
  };
};

// src/rollup/index.ts
import loadTsConfig from "tsconfig-loader";
import { access } from "fs/promises";
import { join, resolve } from "path";
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
var plugins = ({ minimize = false, sourceMap = true, transpilers, aliases } = {}) => {
  const transpilersOptions = Object.assign({
    ts: true,
    coffee: true
  }, transpilers);
  return [
    alias({ entries: aliases }),
    commonjs({ sourceMap }),
    babel({
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
    json(),
    lua_default(),
    raw_default({
      extensions: [".md", ".html", ".css"]
    }),
    nodeResolve({
      preferBuiltins: true,
      extensions: [".js", ".coffee", ".jsx"]
    }),
    transpilersOptions.coffeescript && coffee_default({
      sourceMap
    }),
    transpilersOptions.typescript && typescript({
      sourceMap
    }),
    // transpilersOptions.typescript && sucrase({
    // 	jsxFragmentPragma: 'Fragment',
    // 	jsxPragma: 'h',
    // 	transforms: ['typescript', 'jsx']
    // }),
    minimize && terser({
      toplevel: true,
      sourceMap
    })
  ];
};
var shouldIncludeTypescript = async (transpilers) => {
  if (transpilers.typescript) {
    const path = join(process.cwd(), "tsconfig.json");
    try {
      await access(path);
      return { ...transpilers, typescript: true };
    } catch (error) {
      return { ...transpilers, typescript: false };
    }
  }
  return transpilers;
};
var loadTsConfigAliases = () => {
  const loaded = (loadTsConfig.default || loadTsConfig).call();
  if (!loaded) {
    return;
  }
  const cwd = process.cwd();
  const paths = loaded.tsConfig?.compilerOptions?.paths || {};
  const aliases = {};
  for (const key in paths) {
    const alias2 = paths[key]?.[0];
    const find = key.replace(/\/\*$/, "");
    const replacement = alias2.replace(/\/\*$/, "");
    aliases[find] = resolve(join(cwd, replacement));
  }
  return aliases;
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
    onwarn,
    aliases
  } = options;
  const bundle2 = await bundler({
    input,
    external,
    onwarn,
    plugins: plugins({
      minimize,
      sourceMap,
      transpilers: await shouldIncludeTypescript(transpilers),
      aliases: aliases || loadTsConfigAliases()
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
    const ext = extname5(input);
    const name = basename2(input, ext);
    const path = join2(process.cwd(), output);
    await mkdir(path, { recursive: true });
    await buildFile(input, options);
    const { esm, cjs } = await buildFile(input, options);
    await Promise.all([
      writeFile(`${path}/${name}.cjs`, cjs.code),
      writeFile(`${path}/${name}.js`, esm.code)
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
import nodeEval from "node-eval";
var importModule = async (input, options = {}) => {
  const { code } = await rollup(input, {
    format: "cjs",
    sourceMap: false,
    ...options
  });
  return nodeEval(code, input);
};

// src/run.ts
import { spawn as spawnChild } from "child_process";
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
    node = spawnChild("env", [...options.env, "node"]);
  } else {
    node = spawnChild("node");
  }
  node.stdin.write(code);
  node.stdin.end();
  return node;
};
var exec = async (input, options = {}) => {
  const node = await spawn(input, options);
  return new Promise((resolve2, reject) => {
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
      resolve2(result);
    });
  });
};

export {
  RuntimeError,
  extensions,
  plugins,
  loadTsConfigAliases,
  build,
  bundle,
  compile,
  importModule,
  spawn,
  exec
};
