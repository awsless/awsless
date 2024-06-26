import { Asset } from '../../../asset.js'
import { Group } from '../../../resource.js'
import { ICode } from '../../appsync/code.js'
import { DataSource } from '../../appsync/data-source.js'
import { FunctionConfiguration } from '../../appsync/function-configuration.js'
import { Resolver } from '../../appsync/resolver.js'
import { InlinePolicy } from '../../iam/inline-policy.js'
import { Role } from '../../iam/role.js'
import { Function } from '../function.js'

export class AppsyncEventSource extends Group {
	constructor(
		id: string,
		lambda: Function,
		props: {
			apiId: string
			typeName: string
			fieldName: string
			code: ICode & Asset
		}
	) {
		const role = new Role(id + 'AppSync', {
			assumedBy: 'appsync.amazonaws.com',
		}).dependsOn(lambda)

		role.addInlinePolicy(
			new InlinePolicy(id, {
				statements: [
					{
						actions: ['lambda:InvokeFunction'],
						resources: [lambda.arn],
					},
				],
			})
		)

		const source = DataSource.fromLambda(id, props.apiId, {
			functionArn: lambda.arn,
			serviceRoleArn: role.arn,
		})
			.dependsOn(role)
			.dependsOn(lambda)

		const config = new FunctionConfiguration(id, {
			apiId: props.apiId,
			code: props.code,
			dataSourceName: source.name,
		}).dependsOn(source)

		const resolver = new Resolver(id, {
			apiId: props.apiId,
			typeName: props.typeName,
			fieldName: props.fieldName,
			functions: [config.id],
			code: props.code,
		}).dependsOn(config)

		super([role, source, config, resolver])
	}
}
