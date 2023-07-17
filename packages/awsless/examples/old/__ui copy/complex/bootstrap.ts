import { makeApp } from "../../../../src/app"
import { Config } from "../../../../src/config"
import { bootstrapStack, shouldDeployBootstrap } from "../../../../src/stack/bootstrap"
import { StackClient } from "../../../../src/stack/client"
import { Cancelled } from "../../../../src/cli/error"
import { debug } from "../../../../src/cli/logger"
import { Terminal } from "../terminal"
import { dialog, loadingDialog } from "../layout/dialog"
import { confirmPrompt } from "../prompt/confirm"

export const bootstrapDeployer = async (config:Config, term:Terminal) => {
	debug('Initializing bootstrap')

	const app = makeApp(config)
	const client = new StackClient(config)
	const bootstrap = bootstrapStack(config, app)

	const shouldDeploy = await shouldDeployBootstrap(client, bootstrap.stackName)

	if(shouldDeploy) {
		term.write(dialog('warning', [ `Your app hasn't been bootstrapped yet` ]))

		const confirmed = await confirmPrompt(term, 'Would you like to bootstrap?')

		if(!confirmed) {
			throw new Cancelled()
		}

		const loader = loadingDialog([ 'Bootstrapping...' ])
		term.write(loader)

		const assembly = app.synth()
		await client.deploy(assembly.stacks[0])

		loader.done([ 'Done deploying the bootstrap stack' ])

	} else {
		term.write(dialog('success', [
			'App has already been bootstrapped'
		]))
	}

	debug('Bootstrap initialized')
}
