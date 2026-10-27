#!/usr/bin/env node
import { t as PLUGIN_NAME } from "./vite-DiJdSLR5.js";
import { parseArgs } from "node:util";
import { resolveConfig } from "vite";
//#region src/cli.ts
const usage = `Usage: translate [--config <vite config file>]

Translates the missing texts with the i18n plugin from your Vite config,
without building. Run it from the project root.`;
const args = () => {
	try {
		return parseArgs({ options: {
			config: {
				type: "string",
				short: "c"
			},
			help: {
				type: "boolean",
				short: "h"
			}
		} }).values;
	} catch (error) {
		console.error(`${error instanceof Error ? error.message : error}\n\n${usage}`);
		process.exit(1);
	}
};
const values = args();
if (values.help) {
	console.log(usage);
	process.exit(0);
}
function fail(message) {
	console.error(message instanceof Error ? message.message : message);
	process.exit(1);
}
try {
	const plugin = (await resolveConfig({ configFile: values.config }, "build", "production")).plugins.find((plugin) => plugin.name === PLUGIN_NAME);
	if (!plugin?.api) fail(`The ${PLUGIN_NAME} plugin wasn't found in your Vite config.`);
	await plugin.api.translate(process.cwd(), {
		info: (message) => console.log(message),
		warn: (message) => console.warn(message)
	});
} catch (error) {
	fail(error);
}
//#endregion
export {};
