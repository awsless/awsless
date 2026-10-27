#!/usr/bin/env node
import { t as PLUGIN_NAME } from "./vite-CcDQa0Ms.js";
import { parseArgs } from "node:util";
import { resolveConfig } from "vite";
//#region src/command.ts
const translateProject = async (inlineConfig, log) => {
	const plugin = (await resolveConfig(inlineConfig, "build", "production", "production")).plugins.find((plugin) => plugin.name === PLUGIN_NAME);
	if (!plugin?.api) throw new Error(`The ${PLUGIN_NAME} plugin wasn't found in your Vite config.`);
	await plugin.api.translate(process.cwd(), log);
};
//#endregion
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
try {
	await translateProject({ configFile: values.config }, {
		info: (message) => console.log(message),
		warn: (message) => console.warn(message)
	});
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
//#endregion
export {};
