import { Node, aws } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'
import { constantCase } from 'change-case'

const typeGenCode = `
import { searchClient, migrate, search, indexItem, updateItem, deleteItem } from '@awsless/open-search'

type Store<Name extends string> = {
	readonly name: Name
	readonly domain: string
	readonly migrate: (...args: Parameters<typeof migrate>) => ReturnType<typeof migrate>
	readonly search: (...args: Parameters<typeof search>) => ReturnType<typeof search>
	readonly indexItem: (...args: Parameters<typeof indexItem>) => ReturnType<typeof indexItem>
	readonly updateItem: (...args: Parameters<typeof updateItem>) => ReturnType<typeof updateItem>
	readonly deleteItem: (...args: Parameters<typeof deleteItem>) => ReturnType<typeof deleteItem>
}
`

export const searchFeature = defineFeature({
	name: 'search',
	async onTypeGen(ctx) {
		const gen = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const list = new TypeObject(2)

			for (const id of Object.keys(stack.searchs ?? {})) {
				const name = formatLocalResourceName(ctx.appConfig.name, stack.name, this.name, id)
				list.addType(name, `{ readonly name: '${name}' }`)
			}

			resources.addType(stack.name, list)
		}

		gen.addCode(typeGenCode)
		gen.addInterface('SearchResources', resources)

		await ctx.write('search.d.ts', gen, true)
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.searchs ?? {})) {
			const group = new Node(ctx.stack, 'search', id)

			const openSearch = new aws.openSearch.Domain(group, 'domain', {
				// name: formatLocalResourceName(ctx.app.name, ctx.stack.name, this.name, id),
				version: props.version,
				storageSize: props.storage,
				instance: {
					type: props.type,
					count: props.count,
				},
				accessPolicy: {
					statements: [
						{
							principal: 'lambda.amazonaws.com',
							sourceArn: `arn:aws:lambda:${ctx.appConfig.region}:${ctx.accountId}:function:${ctx.app.name}--${ctx.stack.name}--*`,
						},
					],
				},
			})

			if (props.vpc) {
				openSearch.setVpc({
					securityGroupIds: [ctx.shared.get<string>(`vpc-security-group-id`)],
					subnetIds: [
						ctx.shared.get<string>('vpc-private-subnet-id-1'),
						ctx.shared.get<string>('vpc-private-subnet-id-2'),
					],
				})
			}

			ctx.onFunction(({ lambda, policy }) => {
				lambda.addEnvironment(
					`SEARCH_${constantCase(ctx.stack.name)}_${constantCase(id)}_DOMAIN`,
					openSearch.domainEndpoint
				)
				policy.addStatement({
					actions: ['es:*'],
					resources: [openSearch.arn],
				})
			})
		}
	},
})
