import { relative } from 'path'
import { camelCase } from 'change-case'
import deepmerge from 'deepmerge'
import { defineFeature } from '../../feature.js'
import { funcType, invokeTypes, testMockTypes, writeResourceTypes } from '../../type-gen/snippets.js'
import { formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { formatRouteKey, registerBundleFunction } from '../bundle/util.js'
import { createLambdaFunction, isStandaloneFunction } from './util.js'

const typeGenCode = `
import { InvokeOptions, InvokeResponse } from '@awsless/lambda'
import type { PartialDeep } from 'type-fest'
import type { Mock } from 'vitest'

${funcType}

type Options = Omit<InvokeOptions, 'name' | 'payload' | 'type'>
${invokeTypes({ returns: 'InvokeResponse<F>', options: 'Options', cached: true })}
type Response<F extends Func> = PartialDeep<Awaited<InvokeResponse<F>>, { recurseIntoArrays: true }>
${testMockTypes({ handle: 'Promise<Response<F>> | Response<F> | void | Promise<void>', accepts: 'Response<F>' })}`

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
		await writeResourceTypes(ctx, {
			kind: 'function',
			interfaceName: 'FunctionResources',
			code: typeGenCode,
			stacks(stack, add, types) {
				for (const [name, local] of Object.entries(stack.functions || {})) {
					const props = deepmerge(ctx.appConfig.function, local)
					const varName = camelCase(`${stack.name}-${name}`)
					const funcName = formatLocalResourceName({
						appName: ctx.appConfig.name,
						stackName: stack.name,
						resourceType: 'function',
						resourceName: name,
					})

					if (props.runtime === 'container') {
						add(name, `Invoke<'${funcName}', Func>`, `TestMockEntry<Func>`)
					} else {
						types.addImport(varName, relative(directories.types, local.code.file))
						add(name, `Invoke<'${funcName}', typeof ${varName}>`, `TestMockEntry<typeof ${varName}>`)
					}
				}
			},
		})
	},
	onApp(ctx) {
		// Every handler may invoke any lambda of the app, so features don't
		// need a grant per function.
		ctx.addPermission({
			actions: ['lambda:InvokeFunction'],
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
