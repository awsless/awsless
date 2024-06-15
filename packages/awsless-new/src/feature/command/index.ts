import { defineFeature } from '../../feature.js'

export const commandFeature = defineFeature({
	name: 'command',
	onStack(ctx) {
		for (const [name, props] of Object.entries(ctx.stackConfig.commands ?? {})) {
			ctx.registerCommand({ name, ...props })
		}

		// tsImport()
		// awsless run
		// await import()
		// for (const [commandName, commandProps] of Object.entries(ctx.stackConfig.commands ?? {})) {
		// 	const command = new Command(commandName)
		// 	for (const [name, props] of Object.entries(commandProps.arguments ?? {})) {
		// 		const argument = new Argument(name, props.description)
		// 		argument.required = props.required
		// 		argument.default = props.default
		// 		command.addArgument(argument)
		// 	}
		// 	for (const [name, props] of Object.entries(commandProps.options ?? {})) {
		// 		const option = new Option(name, props.description)
		// 		option.required = props.required
		// 		option.default = props.default
		// 		command.addArgument(argument)
		// 	}
		// 	command.addCommand(command)
		// }
	},
})
