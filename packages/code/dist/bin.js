import { c as loadTsConfigAliases, l as plugins, n as spawn, o as build } from "./src-Dm_h--M3.js";
import { readFile, rm } from "fs/promises";
import { join } from "path";
import { Command } from "commander";
import { mergeConfig } from "vite";
import { startVitest } from "vitest/node";
import { configDefaults, defineConfig } from "vitest/config";
//#region src/clean.ts
const clean = (directory) => {
	return rm(join(process.cwd(), directory), { recursive: true });
};
//#endregion
//#region src/test.ts
const test = async (filters = []) => {
	const json = await readFile(join(process.cwd(), "package.json"));
	const config = JSON.parse(json.toString())?.vitest || {};
	await startVitest("test", filters, {
		watch: false,
		ui: false
	}, mergeConfig({ test: config }, defineConfig({
		plugins: plugins({
			minimize: false,
			sourceMap: true,
			...config
		}),
		resolve: { alias: loadTsConfigAliases() },
		test: {
			include: ["./test/**/*.{js,jsx,coffee,ts}"],
			exclude: ["./test/**/_*", ...configDefaults.exclude],
			globals: true
		}
	})));
};
//#endregion
//#region src/bin.ts
const program = new Command();
program.name("code");
program.command("run").argument("<file>", "file to execute").description("execute a file").option("-e, --env <variables...>", "space separated environment variables").option("--include-packages", "include all packages inside the build process").action(async (input, options) => {
	const node = await spawn(input, options);
	node.stdout.pipe(process.stdout);
	node.stderr.pipe(process.stderr);
});
program.command("build").argument("<files...>", "files to build").description("build project").option("-o, --output", "output directory", "dist").option("-c, --clean", "clean up output directory").action(async (input, options) => {
	if (options.clean) await clean(options.output);
	await build(input, options.output);
});
program.command("test").argument("[filters...]", "filters of the test files to run").description("test project").action(async (filters) => {
	await test(filters);
});
program.parse(process.argv);
//#endregion
export {};
