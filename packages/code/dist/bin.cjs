const require_src = require("./src-DBZLQKjn.cjs");
let fs_promises = require("fs/promises");
let path = require("path");
let commander = require("commander");
let vite = require("vite");
let vitest_node = require("vitest/node");
let vitest_config = require("vitest/config");
//#region src/clean.ts
const clean = (directory) => {
	return (0, fs_promises.rm)((0, path.join)(process.cwd(), directory), { recursive: true });
};
//#endregion
//#region src/test.ts
const test = async (filters = []) => {
	const json = await (0, fs_promises.readFile)((0, path.join)(process.cwd(), "package.json"));
	const config = JSON.parse(json.toString())?.vitest || {};
	await (0, vitest_node.startVitest)("test", filters, {
		watch: false,
		ui: false
	}, (0, vite.mergeConfig)({ test: config }, (0, vitest_config.defineConfig)({
		plugins: require_src.plugins({
			minimize: false,
			sourceMap: true,
			...config
		}),
		resolve: { alias: require_src.loadTsConfigAliases() },
		test: {
			include: ["./test/**/*.{js,jsx,coffee,ts}"],
			exclude: ["./test/**/_*", ...vitest_config.configDefaults.exclude],
			globals: true
		}
	})));
};
//#endregion
//#region src/bin.ts
const program = new commander.Command();
program.name("code");
program.command("run").argument("<file>", "file to execute").description("execute a file").option("-e, --env <variables...>", "space separated environment variables").option("--include-packages", "include all packages inside the build process").action(async (input, options) => {
	const node = await require_src.spawn(input, options);
	node.stdout.pipe(process.stdout);
	node.stderr.pipe(process.stderr);
});
program.command("build").argument("<files...>", "files to build").description("build project").option("-o, --output", "output directory", "dist").option("-c, --clean", "clean up output directory").action(async (input, options) => {
	if (options.clean) await clean(options.output);
	await require_src.build(input, options.output);
});
program.command("test").argument("[filters...]", "filters of the test files to run").description("test project").action(async (filters) => {
	await test(filters);
});
program.parse(process.argv);
//#endregion
