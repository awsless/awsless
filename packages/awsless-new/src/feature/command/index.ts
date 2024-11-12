import { FileError } from '../../error.js'
import { defineFeature } from '../../feature.js'

export const commandFeature = defineFeature({
	name: 'command',
	onValidate(ctx) {
		const names = new Set<string>()

		for (const stack of ctx.stackConfigs) {
			for (const name of Object.keys(stack.commands ?? {})) {
				if (!names.has(name)) {
					names.add(name)
				} else {
					throw new FileError(stack.file, `Duplicate command names aren't allowed: ${name}`)
				}
			}
		}
	},
	onStack(ctx) {
		for (const [name, props] of Object.entries(ctx.stackConfig.commands ?? {})) {
			ctx.registerCommand({ name, ...props })
		}
	},
})
