import { Command } from "commander";
import { Layout } from "../ui/__components/layout.js";
import { Text, render } from "ink";
import Spinner from "ink-spinner";
import { useState } from "react";
import { toApp } from "../../app.js";
import { BuildAssets } from "../ui/complex/asset.js";

export const test = (program: Command) => {
	program
		.command('test')
		.argument('[stacks...]', 'Optionally filter stacks to lookup status')
		.description('Test')
		.action(async (filters: string[]) => {
			render(<Layout render={async (config, render) => {

				const { app, assets } = await toApp(config, filters)

				// render(<Dialog></>)

				// const doneBuilding = write(loadingDialog('Building stack assets...'))

				// // await tasks.run('build')
				// const assembly = app.synth()

				// doneBuilding('Done building stack assets')

				// useState('')

				render(<BuildAssets assets={assets} />)

				// render(<Text>
				// 	<Text color="blue">
				// 		<Spinner type="dots" />
				// 	</Text>
				// 	{' Loading'}
				// </Text>)

				// render(<Text>Hello</Text>)

			}} />)
		})
}
