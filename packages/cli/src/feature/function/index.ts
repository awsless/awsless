import { relative } from 'path'
import { camelCase } from 'change-case'
import deepmerge from 'deepmerge'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { formatRouteKey, registerBundleFunction } from '../bundle/util.js'
import { createLambdaFunction, isStandaloneFunction } from './util.js'

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
type MockObject<F extends Func> = Mock<(...args: Parameters<F>) => ReturnType<F>>

// Calling overrides the implementation & the same value works as the
// vitest mock inside expect().
type TestMockEntry<F extends Func> = MockBuilder<F> & MockObject<F>
`

export const functionFeature = defineFeature({
	name: 'function',
	onDev(ctx) {
		for (const stack of ctx.stackConfigs) {
			for (const id of Object.keys(stack.functions ?? {})) {
				ctx.registerResource({
					kind: 'function',
					stack: stack.name,
					id,
					routeKey: formatRouteKey(stack.name, 'function', id),
				})
			}
		}
	},
	async onTypeGen(ctx) {
		const types = new TypeFile('awsless')
		const resources = new TypeObject(1)
		const testMocks = new TypeObject(2)

		for (const stack of ctx.stackConfigs) {
			const resource = new TypeObject(2)
			const testMock = new TypeObject(3)

			for (const [name, local] of Object.entries(stack.functions || {})) {
				const props = deepmerge(ctx.appConfig.function, local)
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
					testMock.addType(name, `TestMockEntry<Func>`)
				} else {
					types.addImport(varName, relFile)
					resource.addType(name, `Invoke<'${funcName}', typeof ${varName}>`)
					testMock.addType(name, `TestMockEntry<typeof ${varName}>`)
				}
			}

			resources.addType(stack.name, resource)
			testMocks.addType(stack.name, testMock)
		}

		const testMock = new TypeObject(1)
		testMock.addType('function', testMocks)

		types.addCode(typeGenCode)
		types.addInterface('FunctionResources', resources)
		types.addInterface('TestMock', testMock)

		await ctx.write('function.d.ts', types, true)
	},
	onApp(ctx) {
		// ------------------------------------------------------
		// Give lambda access to all policies inside your app.

		ctx.addPermission({
			actions: [
				// Allow all lambda's to invoke any lambda inside your app.
				'lambda:InvokeFunction',
				'lambda:InvokeAsync',

				// Allow listing and getting lambda info.
				// 'lambda:ListFunctions',
				// 'lambda:GetFunction',
			],
			resources: [`arn:aws:lambda:${ctx.appConfig.region}:${ctx.accountId}:function:${ctx.appConfig.name}--*`],
		})
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.functions ?? {})) {
			const routeKey = formatRouteKey(ctx.stack.name, 'function', id)

			// Locally there's only the bundle worker, so standalone
			// functions build into the bundle too.
			if (!isStandaloneFunction(props) || ctx.dev) {
				registerBundleFunction(ctx, routeKey, props)
				continue
			}

			// The function defines its own lambda config, so it deploys as
			// its own stand-alone lambda & the bundle invokes it directly
			// instead of dispatching to a bundled handler.
			createLambdaFunction(ctx, id, props)
		}
	},
})
