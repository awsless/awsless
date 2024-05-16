// import { camelCase } from 'change-case'
// import { relative } from 'path'
// import { FunctionSchema } from './schema.js'
import { camelCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { createLambdaFunction } from './util.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { relative } from 'path'
import { Node, aws } from '@awsless/formation'

const typeGenCode = `
import { InvokeOptions, InvokeResponse } from '@awsless/lambda'
import type { PartialDeep } from 'type-fest'
import type { Mock } from 'vitest'

type Func = (...args: any[]) => any

type Invoke<Name extends string, F extends Func> = {
	readonly name: Name
	readonly cached: (payload: Parameters<F>[0], options?: Omit<InvokeOptions, 'name' | 'payload' | 'type'>) => InvokeResponse<F>
	(payload: Parameters<F>[0], options?: Omit<InvokeOptions, 'name' | 'payload' | 'type'>): InvokeResponse<F>
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

			for (const [name, props] of Object.entries(stack.functions || {})) {
				const varName = camelCase(`${stack.name}-${name}`)
				const funcName = formatLocalResourceName(ctx.appConfig.name, stack.name, 'function', name)
				const relFile = relative(directories.types, props.file)

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
		types.addInterface('FunctionResources', resources)
		types.addInterface('FunctionMock', mocks)
		types.addInterface('FunctionMockResponse', mockResponses)

		await ctx.write('function.d.ts', types, true)
	},
	onApp(ctx) {
		const group = new Node(ctx.base, 'function', 'asset')

		const bucket = new aws.s3.Bucket(group, 'bucket', {
			name: formatGlobalResourceName(ctx.appConfig.name, 'function', 'assets'),
			versioning: true,
			forceDelete: true,
		})

		ctx.shared.set('function-bucket-name', bucket.name)
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.functions || {})) {
			const group = new Node(ctx.stack, 'function', id)
			createLambdaFunction(group, ctx, 'function', id, props)
		}
	},
})
