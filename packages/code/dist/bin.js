import {
  build,
  plugins,
  spawn
} from "./chunk-NYOD66N3.js";

// src/bin.ts
import { Command } from "commander";

// src/clean.ts
import { rm } from "fs/promises";
import { join } from "path";
var clean = (directory) => {
  return rm(join(process.cwd(), directory), { recursive: true });
};

// src/test.ts
import { join as join2 } from "path";
import { readFile } from "fs/promises";
import { mergeConfig } from "vite";
import { startVitest } from "vitest/node";
import { configDefaults, defineConfig } from "vitest/config";
var test = async (filters = []) => {
  const json = await readFile(join2(process.cwd(), "package.json"));
  const data = JSON.parse(json.toString());
  const config = { test: data?.vitest || {} };
  await startVitest("test", filters, {
    watch: false,
    ui: false
  }, mergeConfig(config, defineConfig({
    plugins: plugins({
      minimize: false,
      sourceMap: true
    }),
    test: {
      include: ["./test/**/*.{js,jsx,coffee,ts}"],
      exclude: configDefaults.exclude,
      globals: true
    }
  })));
};

// src/bin.ts
var program = new Command();
program.name("code");
program.command("run").argument("<file>", "file to execute").description("execute a file").option("-e, --env <variables...>", "space separated environment variables").option("--include-packages", "include all packages inside the build process").action(async (input, options) => {
  const node = await spawn(input, options);
  node.stdout.pipe(process.stdout);
  node.stderr.pipe(process.stderr);
});
program.command("build").argument("<files...>", "files to build").description("build package").option("-o, --output", "output directory", "dist").option("-c, --clean", "clean up output directory").action(async (input, options) => {
  if (options.clean) {
    await clean(options.output);
  }
  await build(input, options.output);
});
program.command("test").argument("[filters...]", "filters of the test files to run").description("test project").action(async (filters) => {
  await test(filters);
});
program.parse(process.argv);
