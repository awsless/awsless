import { camelCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { createLambdaFunction } from '../function/util.js'
import { formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { relative } from 'path'
import { Node, aws } from '@awsless/formation'
import { getGlobalOnFailure, hasOnFailure } from '../on-failure/util.js'

const typeGenCode = `
import { InvokeOptions } from '@awsless/lambda'
import type { Mock } from 'vitest'

type Func = (...args: any[]) => any

type Invoke<Name extends string, F extends Func> = {
	readonly name: Name
	(payload: Parameters<F>[0], options?: Omit<InvokeOptions, 'name' | 'payload' | 'type'>): Promise<void>
}

type MockHandle<F extends Func> = (payload: Parameters<F>[0]) => void | Promise<void> | Promise<Promise<void>>
type MockBuilder<F extends Func> = (handle?: MockHandle<F>) => void
type MockObject<F extends Func> = Mock<Parameters<F>, ReturnType<F>>
`

export const taskFeature = defineFeature({
	name: 'task',
	async onTypeGen(ctx) {
		const types = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)
		const mocks = new TypeObject(1)
		const mockResponses = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const resource = new TypeObject(2)
			const mock = new TypeObject(2)
			const mockResponse = new TypeObject(2)

			for (const [name, props] of Object.entries(stack.tasks || {})) {
				const varName = camelCase(`${stack.name}-${name}`)
				const funcName = formatLocalResourceName(ctx.appConfig.name, stack.name, 'task', name)
				const relFile = relative(directories.types, props.consumer.file)

				types.addImport(varName, relFile)
				resource.addType(name, `Invoke<'${funcName}', typeof ${varName}>`)
				mock.addType(name, `MockBuilder<typeof ${varName}>`)
				mockResponse.addType(name, `MockObject<typeof ${varName}>`)
			}

			mocks.addType(stack.name, mock)
			resources.addType(stack.name, resource)
			mockResponses.addType(stack.name, mockResponse)
		}

		types.addCode(typeGenCode)
		types.addInterface('TaskResources', resources)
		types.addInterface('TaskMock', mocks)
		types.addInterface('TaskMockResponse', mockResponses)

		await ctx.write('task.d.ts', types, true)
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.tasks ?? {})) {
			const group = new Node(ctx.stack, 'task', id)
			const { lambda, policy } = createLambdaFunction(group, ctx, 'task', id, props.consumer)

			lambda.addEnvironment('LOG_VIEWABLE_ERROR', '1')

			const invokeConfig = new aws.lambda.EventInvokeConfig(group, 'config', {
				functionArn: lambda.arn,
				retryAttempts: props.retryAttempts,
				onFailure: getGlobalOnFailure(ctx),
			})

			invokeConfig.dependsOn(policy)

			if (hasOnFailure(ctx.stackConfigs)) {
				policy.addStatement({
					actions: ['sqs:SendMessage', 'sqs:GetQueueUrl'],
					resources: [getGlobalOnFailure(ctx)!],
				})
			}
		}
	},
})
