import { Command } from "commander";
import { toApp } from "../../app.js";
import { StackClient } from "../../stack/client.js";
import { debug } from "../logger.js";
import { stackTree } from "../ui/complex/stack-tree.js";
import { dialog, loadingDialog } from "../ui/__components/dialog.js";
import { br } from "../ui/__components/basic.js";
import { style } from "../style.js";
import { layout } from "../ui/layout/layout.js";
import { Signal } from "../lib/signal.js";

export const test2 = (program: Command) => {
	program
		.command('test2')
		.description('View the application status')
		.action(async () => {
			await layout(async (config, write) => {
				// --------------------------------------------------------
				// Build stack assets

				let count = 10

				while(--count) {
					if(count % 2) {
						write(loadingDialog(`${count} - Building stack assets`))
					} else {
						write('-  ' + count.toString() + '\n')
					}
				}

				// doneBuilding('Done building stack assets')

				await new Promise(resolve => setTimeout(resolve, 1000 * 10))
			})
		})
}
