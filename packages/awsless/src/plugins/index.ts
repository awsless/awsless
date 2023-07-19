import { cronPlugin } from "./cron";
import { functionPlugin } from "./function";
import { queuePlugin } from "./queue";
import { ExtendedConfigInput, ExtendedConfigOutput } from "../plugin";
import { tablePlugin } from "./table";
import { storePlugin } from "./store";
import { topicPlugin } from "./topic";

export const defaultPlugins = [
	functionPlugin,
	cronPlugin,
	queuePlugin,
	tablePlugin,
	storePlugin,
	topicPlugin,
]

export type CombinedDefaultPluginsConfigOutput = ExtendedConfigOutput<typeof defaultPlugins[number]['schema']>
export type CombinedDefaultPluginsConfigInput = ExtendedConfigInput<typeof defaultPlugins[number]['schema']>
