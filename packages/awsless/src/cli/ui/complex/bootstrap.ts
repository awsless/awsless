import { makeApp } from "../../../app"
import { Config } from "../../../config"
import { bootstrapStack, shouldDeployBootstrap } from "../../../stack/bootstrap"
import { StackClient } from "../../../stack/client"
import { Cancelled } from "../../error"
import { Terminal } from "../../lib/terminal"
import { debug } from "../../logger"
import { dialog, loadingDialog } from "../layout/dialog"
import { confirmPrompt } from "../prompt/confirm"

export const bootstrapDeployer = (config:Config) => {
	return async (term:Terminal) => {
		debug('Initializing bootstrap')

		const app = makeApp(config)
		const client = new StackClient(config)
		const bootstrap = bootstrapStack(config, app)

		const shouldDeploy = await shouldDeployBootstrap(client, bootstrap.stackName)

		if(shouldDeploy) {
			term.out.write(dialog('warning', [ `Your app hasn't been bootstrapped yet` ]))

			const confirmed = await term.out.write(confirmPrompt('Would you like to bootstrap?'))

			if(!confirmed) {
				throw new Cancelled()
			}

			const done = term.out.write(loadingDialog('Bootstrapping...'))

			const assembly = app.synth()
			await client.deploy(assembly.stacks[0])

			done('Done deploying the bootstrap stack')

		} else {
			term.out.write(dialog('success', [
				'App has already been bootstrapped'
			]))
		}

		debug('Bootstrap initialized')
	}

	// debug('Initializing bootstrap')

	// const app = makeApp(config)
	// const client = new StackClient(config)
	// const bootstrap = bootstrapStack(config, app)

	// const shouldDeploy = await shouldDeployBootstrap(client, bootstrap.stackName)

	// if(shouldDeploy) {
	// 	term.renderer.write(dialog('warning', [ `Your app hasn't been bootstrapped yet` ]))

	// 	const confirmed = await confirmPrompt(term, 'Would you like to bootstrap?')

	// 	if(!confirmed) {
	// 		throw new Cancelled()
	// 	}

	// 	const [ loader, done ] = loadingDialog('Bootstrapping...')
	// 	term.renderer.write(loader)

	// 	const assembly = app.synth()
	// 	await client.deploy(assembly.stacks[0])

	// 	done('Done deploying the bootstrap stack')

	// } else {
	// 	term.renderer.write(dialog('success', [
	// 		'App has already been bootstrapped'
	// 	]))
	// }

	// debug('Bootstrap initialized')
}
