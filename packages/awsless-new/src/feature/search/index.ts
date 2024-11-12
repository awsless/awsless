import { aws, Node } from '@awsless/formation'
import { constantCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { shortId } from '../../util/id.js'

const typeGenCode = `
import { AnyStruct, Table } from '@awsless/open-search'

type Search = {
	readonly domain: string
	readonly defineTable: <N extends string, S extends AnyStruct>(tableName: N, schema: S) => Table<N, S>
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
				list.addType(id, `Search`)
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
			const name = `${id}-${shortId([ctx.app.name, ctx.stack.name, this.name, id].join('--'))}`

			const openSearch = new aws.openSearch.Domain(group, 'domain', {
				name,
				version: props.version,
				storageSize: props.storage,
				instance: {
					type: props.type,
					count: props.count,
				},
				accessPolicy: {
					statements: [
						{
							principal: { AWS: '*' },
							resources: [`arn:aws:es:${ctx.appConfig.region}:${ctx.accountId}:domain/${name}/*`],
							principalArn: `arn:aws:iam::${ctx.accountId}:role/${ctx.app.name}--*`,
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

			ctx.addEnv(`SEARCH_${constantCase(ctx.stack.name)}_${constantCase(id)}_DOMAIN`, openSearch.domainEndpoint)

			// ctx.onFunction(lambda => {
			// 	lambda.addEnvironment(
			// 		`SEARCH_${constantCase(ctx.stack.name)}_${constantCase(id)}_DOMAIN`,
			// 		openSearch.domainEndpoint
			// 	)
			// })

			ctx.onStackPolicy(policy => {
				policy.addStatement({
					actions: ['es:ESHttp*'],
					resources: [openSearch.arn],
				})
			})
		}
	},
})
