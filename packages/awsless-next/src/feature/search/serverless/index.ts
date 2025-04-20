import { Node, aws } from '@awsless/formation'
import { defineFeature } from '../../../feature.js'
import { TypeFile } from '../../../type-gen/file.js'
import { TypeObject } from '../../../type-gen/object.js'
import { formatLocalResourceName } from '../../../util/name.js'

export const searchFeature = defineFeature({
	name: 'search',
	async onTypeGen(ctx) {
		const gen = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const list = new TypeObject(2)

			for (const id of Object.keys(stack.searchs ?? {})) {
				const name = formatLocalResourceName({
					appName: ctx.appConfig.name,
					stackName: stack.name,
					resourceType: 'search',
					resourceName: id,
				})
				list.addType(name, `{ readonly name: '${name}' }`)
			}

			resources.addType(stack.name, list)
		}

		gen.addInterface('SearchResources', resources)

		await ctx.write('search.d.ts', gen, true)
	},
	onStack(ctx) {
		for (const id of ctx.stackConfig.searchs ?? {}) {
			const group = new Node(ctx.stack, 'search', id)

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'search',
				resourceName: id,
			})

			const policy = new aws.openSearchServerless.SecurityPolicy(group, 'security', {
				name,
				type: 'encryption',
				policy: JSON.stringify({
					AWSOwnedKey: true,
					Rules: [
						{
							ResourceType: 'collection',
							Resource: [`collection/${name}`],
						},
					],
				}),
			})

			const collection = new aws.openSearchServerless.Collection(group, 'collection', {
				name,
				type: 'search',
			}).dependsOn(policy)

			ctx.onPolicy(policy => {
				policy.addStatement(collection.permissions)
			})
		}
	},
})
