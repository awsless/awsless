import { FileError } from '../../error.js'
import { defineFeature } from '../../feature.js'

export const commandFeature = defineFeature({
	name: 'command',
	onStack(ctx) {
		const names = new Set<string>()

		for (const [name, props] of Object.entries(ctx.stackConfig.commands ?? {})) {
			if (!names.has(name)) {
				names.add(name)
			} else {
				throw new FileError(ctx.stackConfig.file, `Duplicate command names aren't allowed: ${name}`)
			}

			ctx.registerCommand({ name, ...props })
		}
	},
})
