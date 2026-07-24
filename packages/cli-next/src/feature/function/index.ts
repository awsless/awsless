import { camelCase } from 'change-case'
import { relative } from 'path'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { registerBundleFunction, formatRouteKey } from '../bundle/util.js'
import deepmerge from 'deepmerge'

const typeGenCode = `
import { InvokeOptions, InvokeResponse } from '@awsless/lambda'
import type { PartialDeep } from 'type-fest'
import type { Mock } from 'vitest'

type Func = (...args: any[]) => any

type Invoke<N extends string, F extends Func> = unknown extends Parameters<F>[0] ? InvokeWithoutPayload<N, F> : InvokeWithPayload<N, F>
type Options = Omit<InvokeOptions, 'name' | 'payload' | 'type'>

type InvokeWithPayload<Name extends string, F extends Func> = {
	readonly name: Name
	readonly cached: (payload: Parameters<F>[0], options?: Options) => InvokeResponse<F>
	(payload: Parameters<F>[0], options?: Options): InvokeResponse<F>
}

type InvokeWithoutPayload<Name extends string, F extends Func> = {
	readonly name: Name
	readonly cached: (payload?: Parameters<F>[0], options?: Options) => InvokeResponse<F>
	(payload?: Parameters<F>[0], options?: Options): InvokeResponse<F>
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
		const types = new TypeFile('awsless')
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
		// ------------------------------------------------------
		// Give lambda access to all policies inside your app.

		ctx.addGlobalPermission({
			actions: [
				// Allow all lambda's to invoke any lambda inside your app.
				'lambda:InvokeFunction',
				'lambda:InvokeAsync',

				// Allow listing and getting lambda info.
				// 'lambda:ListFunctions',
				// 'lambda:GetFunction',
			],
			resources: [
				`arn:aws:lambda:${ctx.appConfig.region}:${ctx.accountId}:function:${ctx.appConfig.name}--*`,
			],
		})
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.functions ?? {})) {
			registerBundleFunction(ctx, formatRouteKey(ctx.stack.name, 'function', id), props)
		}
	},
})
