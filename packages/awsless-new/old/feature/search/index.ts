import { definePlugin } from '../../feature.js'
import { Collection } from '../../formation/resource/open-search-serverless/collection.js'
import { formatName } from '../../formation/util.js'
import { TypeGen, TypeObject } from '../../util/type-gen.js'

export const searchPlugin = definePlugin({
	name: 'search',
	async onTypeGen({ config, write }) {
		const gen = new TypeGen('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const stack of config.stacks) {
			const list = new TypeObject(2)

			for (const id of stack.searchs || []) {
				const name = formatName(`${config.app.name}-${stack.name}-${id}`)
				list.addType(name, `{ readonly name: '${name}' }`)
			}

			resources.addType(stack.name, list)
		}

		gen.addInterface('SearchResources', resources)

		await write('search.d.ts', gen, true)
	},
	onStack({ app, stack, stackConfig, bind }) {
		for (const id of stackConfig.searchs || []) {
			const collection = new Collection(id, {
				name: `${app.name}-${stack.name}-${id}`,
				type: 'search',
			})

			bind(lambda => {
				lambda.addPermissions(collection.permissions)
			})
		}
	},
})
