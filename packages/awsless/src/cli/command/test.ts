import { Command } from "commander";
import { layout } from '../ui/layout/layout.js';
import { StackClient } from '../../formation/client.js';
import { toId } from "../../util/__resource.js";
import { globalExportsHandlerCode } from "../../__custom-resource/global-exports/handler.js";
import { App } from "../../formation/app.js";
import { Stack } from "../../formation/stack.js";
import { Function } from "../../formation/resource/lambda/function.js";

export const test = (program: Command) => {
	program
		.command('test')
		// .argument('[stacks...]', 'Optionally filter stacks to deploy')
		// .description('Deploy your app to AWS')
		.action(async () => {
			await layout(async (config) => {

				// ---------------------------------------------------

				const app = new App('test')
				const name = 'test5'

				// const stack = new Stack(name, config.region)
				// const lambda = new Function('custom', {
				// 	// file
				// })

				// lambda.addPermissions({
				// 	actions: [ 'cloudformation:ListExports' ],
				// 	resources: [ '*' ],
				// })

				// const handler = new Function(stack, toId('function', name), {
				// 	functionName: `custom-resource-${name}`,
				// 	runtime: Runtime.NODEJS_18_X,
				// 	code: Code.fromInline(globalExportsHandlerCode),
				// 	handler: 'index.handler',
				// })


				// const custom = new CustomResource(stack, toId('custom', name), {
				// 	// serviceToken: provider.serviceToken,
				// 	serviceToken: handler.functionArn,
				// 	properties: { region: 'us-east-1' },
				// })

				// new CfnOutput(stack, 'output', {
				// 	'exportName': 'test-value',
				// 	value: custom.getAttString('CertifcateArn'),
				// })

				// const assembly = app.synth()
				// const stackArtifect = assembly.stacks[0]
				// const client = new StackClient(config)

				// await client.deploy(stackArtifect)
			})
		})
}
