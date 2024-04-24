import { Node, aws } from '@awsless/formation'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'

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

		gen.addInterface('SearchResources', resources)

		await ctx.write('search.d.ts', gen, true)
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.searchs ?? {})) {
			const group = new Node(ctx.stack, 'search', id)

			const domain = new aws.openSearch.Domain(group, 'domain', {
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
							sourceArn: `arn:aws:lambfa:${ctx.appConfig.region}:${ctx.accountId}:function:${ctx.app.name}--${ctx.stack.name}--*`,
						},
					],
				},
			})

			if (props.vpc) {
				domain.setVpc({
					securityGroupIds: [ctx.shared.get<string>(`vpc-security-group-id`)],
					subnetIds: [
						ctx.shared.get<string>('vpc-private-subnet-id-1'),
						ctx.shared.get<string>('vpc-private-subnet-id-2'),
					],
				})
			}

			ctx.onFunction(({ policy }) => {
				policy.addStatement({
					actions: ['es:*'],
					resources: [domain.arn],
				})
			})
		}
	},
})
