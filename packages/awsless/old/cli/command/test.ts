import { Command } from "commander";
import { makeApp } from '../../app.js';
import { layout } from '../ui/layout/layout.js';
import { StackClient } from '../../stack/client.js';
import { CfnOutput, CustomResource, Stack } from "aws-cdk-lib";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { toId } from "../../util/resource.js";
import { globalExportsHandlerCode } from "../../custom-resource/global-exports/handler.js";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Provider } from "aws-cdk-lib/custom-resources";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

export const test = (program: Command) => {
	program
		.command('test')
		// .argument('[stacks...]', 'Optionally filter stacks to deploy')
		// .description('Deploy your app to AWS')
		.action(async () => {
			await layout(async (config) => {

				// ---------------------------------------------------

				const app = makeApp(config)
				const name = 'test5'

				const stack = new Stack(app, name, {
					stackName: name,
					env: {
						account: config.account,
						region: config.region,
					},
				})

				const handler = new Function(stack, toId('function', name), {
					functionName: `custom-resource-${name}`,
					runtime: Runtime.NODEJS_18_X,
					code: Code.fromInline(globalExportsHandlerCode),
					handler: 'index.handler',
				})

				// const provider = new Provider(stack, 'MyProvider', {
				// 	onEventHandler: handler,
				// 	logRetention: RetentionDays.ONE_DAY,
				// });

				handler.addToRolePolicy(new PolicyStatement({
					actions: [ 'cloudformation:ListExports' ],
					resources: [ '*' ],
				}))

				const custom = new CustomResource(stack, toId('custom', name), {
					// serviceToken: provider.serviceToken,
					serviceToken: handler.functionArn,
					properties: { region: 'us-east-1' },
				})

				new CfnOutput(stack, 'output', {
					'exportName': 'test-value',
					value: custom.getAttString('CertifcateArn'),
				})

				const assembly = app.synth()
				const stackArtifect = assembly.stacks[0]
				const client = new StackClient(config)

				await client.deploy(stackArtifect)
			})
		})
}
