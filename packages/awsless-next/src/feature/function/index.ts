// import { camelCase } from 'change-case'
// import { relative } from 'path'
// import { FunctionSchema } from './schema.js'
import { $, Group } from '@awsless/formation'
import { camelCase } from 'change-case'
import { relative } from 'path'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { createLambdaFunction } from './util.js'
import deepmerge from 'deepmerge'

const typeGenCode = `
import { InvokeOptions, InvokeResponse } from '@awsless/lambda'
import type { PartialDeep } from 'type-fest'
import type { Mock } from 'vitest'

type Func = (...args: any[]) => any

type Invoke<N extends string, F extends Func> = unknown extends Parameters<F>[0] ? InvokeWithoutPayload<N, F> : InvokeWithPayload<N, F>

type InvokeWithPayload<Name extends string, F extends Func> = {
	readonly name: Name
	readonly cached: (payload: Parameters<F>[0], options?: Omit<InvokeOptions, 'name' | 'payload' | 'type'>) => InvokeResponse<F>
	(payload: Parameters<F>[0], options?: Omit<InvokeOptions, 'name' | 'payload' | 'type'>): InvokeResponse<F>
}

type InvokeWithoutPayload<Name extends string, F extends Func> = {
	readonly name: Name
	readonly cached: (payload?: Parameters<F>[0], options?: Omit<InvokeOptions, 'name' | 'payload' | 'type'>) => InvokeResponse<F>
	(payload?: Parameters<F>[0], options?: Omit<InvokeOptions, 'name' | 'payload' | 'type'>): InvokeResponse<F>
}

type Response<F extends Func> = PartialDeep<Awaited<InvokeResponse<F>>, { recurseIntoArrays: true }>
type MockHandle<F extends Func> = (payload: Parameters<F>[0]) => Promise<Response<F>> | Response<F> | void | Promise<void> | Promise<Promise<void>>
type MockHandleOrResponse<F extends Func> = MockHandle<F> | Response<F>
type MockBuilder<F extends Func> = (handleOrResponse?: MockHandleOrResponse<F>) => void
type MockObject<F extends Func> = Mock<Parameters<F>, ReturnType<F>>
`

export const functionFeature = defineFeature({
	name: 'function',
	async onTypeGen(ctx) {
		const types = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)
		const mocks = new TypeObject(1)
		const mockResponses = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const resource = new TypeObject(2)
			const mock = new TypeObject(2)
			const mockResponse = new TypeObject(2)

			for (const [name, local] of Object.entries(stack.functions || {})) {
				const props = deepmerge(ctx.appConfig.defaults.function, local)
				const varName = camelCase(`${stack.name}-${name}`)
				const funcName = formatLocalResourceName({
					appName: ctx.appConfig.name,
					stackName: stack.name,
					resourceType: 'function',
					resourceName: name,
				})

				if ('file' in local.code) {
					const relFile = relative(directories.types, local.code.file)

					if (props.runtime === 'container') {
						resource.addType(name, `Invoke<'${funcName}', Func>`)
						mock.addType(name, `MockBuilder<Func>`)
						mockResponse.addType(name, `MockObject<Func>`)
					} else {
						types.addImport(varName, relFile)
						resource.addType(name, `Invoke<'${funcName}', typeof ${varName}>`)
						mock.addType(name, `MockBuilder<typeof ${varName}>`)
						mockResponse.addType(name, `MockObject<typeof ${varName}>`)
					}
				}
			}

			mocks.addType(stack.name, mock)
			resources.addType(stack.name, resource)
			mockResponses.addType(stack.name, mockResponse)
		}

		types.addCode(typeGenCode)
		types.addInterface('FunctionResources', resources)
		types.addInterface('FunctionMock', mocks)
		types.addInterface('FunctionMockResponse', mockResponses)

		await ctx.write('function.d.ts', types, true)
	},
	// We are putting the resources for this feature in a onBefore hook
	// because we will need it for functions defined in the onApp hook
	// in different features
	onBefore(ctx) {
		const group = new Group(ctx.base, 'function', 'asset')

		// ------------------------------------------------------
		// Define the Bucket used to store the lambda function code.

		const bucket = new $.aws.s3.Bucket(group, 'bucket', {
			bucket: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'function',
				resourceName: 'assets',
				postfix: ctx.appId,
			}),
			forceDestroy: true,
			// versioning: true,
			// forceDelete: true,
		})

		ctx.shared.set('function', 'bucket-name', bucket.bucket)

		// ------------------------------------------------------
		// Define the ScheduleGroup for warmers

		const warmGroup = new $.aws.scheduler.ScheduleGroup(ctx.base, 'warm', {
			name: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'function',
				resourceName: 'warm',
			}),
		})

		ctx.shared.set('function', 'warm-group-name', warmGroup.name)

		// ------------------------------------------------------
		// Define the Repository used to store the container images.

		// const repository = new $.aws.ecr.Repository(group, 'repository', {
		// 	name: formatGlobalResourceName({
		// 		appName: ctx.app.name,
		// 		resourceType: 'function',
		// 		resourceName: 'repository',
		// 		seperator: '-',
		// 	}),
		// 	imageTagMutability: 'MUTABLE',
		// })

		// new $.aws.ecr.LifecyclePolicy(group, 'lifecycle', {
		// 	repository: repository.name,
		// 	policy: JSON.stringify({
		// 		rules: [
		// 			{
		// 				rulePriority: 1,
		// 				description: 'Remove untagged images older then 1 day',
		// 				action: {
		// 					type: 'expire',
		// 				},
		// 				selection: {
		// 					tagStatus: 'untagged',
		// 					countType: 'sinceImagePushed',
		// 					countNumber: 1,
		// 					countUnit: 'days',
		// 				},
		// 			},
		// 		],
		// 	}),
		// })

		// ctx.shared.set('function-repository-name', repository.name)
		// ctx.shared.set('function-repository-uri', repository.repositoryUrl)
	},
	onApp(ctx) {
		// ------------------------------------------------------
		// Give lambda access to all policies inside your app.

		ctx.addGlobalPermission({
			actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
			resources: [`arn:aws:lambda:*:*:function:${ctx.appConfig.name}--*`],
		})
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.functions ?? {})) {
			const group = new Group(ctx.stack, 'function', id)
			createLambdaFunction(group, ctx, 'function', id, props)
		}
	},
})
