import { App, Stack } from "aws-cdk-lib"
import { AppConfig } from "../app"
import { Assets } from "../util/assets"

type Plugin<PluginConfig> = {
	name: string
	onValidate?: (config:AppConfig & PluginConfig) => AppConfig & PluginConfig
	onBootstrap?: (config:AppConfig & PluginConfig, bootstrap: Stack) => void
	onStack?: (config:AppConfig & PluginConfig, app:App, assets: Assets) => void
	onApp?: (config:AppConfig & PluginConfig, app:App) => void
}

// export type FunctionConfig = {
// 	defaults?: {
// 		michel: {
// 			memorySize: number
// 		}
// 	}
// }

// export const topicPlugin: Plugin<FunctionConfig> = {
// 	onValidate(config) {
// 		config.defaults?.michel.memorySize
// 		// validate config
// 		// config.defaults?.function
// 	},
// 	// onBootstrap(config, bootstrapStack) {
// 	// 	// config
// 	// 	// bootstrapStack
// 	// },
// 	onStack(config, stack, assets) {
// 		const { stack } = ctx
// 		const { lambda } = toFunction(ctx, id, props)

// 		const topic = Topic.fromTopicArn(
// 			stack,
// 			toId('topic', id),
// 			toArn(stack, 'sns', 'topic', id)
// 		)

// 		// const function


// 		assets.add({
// 			build() {

// 			},
// 			publish() {

// 			},
// 		})

// 		lambda.addEventSource(new SnsEventSource(topic))
// 	},
// 	onApp(config, app) {
// 		const stack = new Stack(app, 'bootstrap-topics', {
// 			stackName: `${config.name}-bootstrap-topics`
// 		})

// 		new Topic(stack, toId('topic', id), {
// 			topicName: id,
// 			displayName: id,
// 		})
// 	},
// 	onBuild() {

// 	}
// }

// export const functionPlugin: Plugin<FunctionConfig> = {
// 	onValidate(config) {
// 		config.defaults?.michel.memorySize
// 		// validate config
// 		// config.defaults?.function
// 	},
// 	onBootstrap(config) {
// 		config
// 	},
// 	onStack(config, stack) {

// 	}
// }
