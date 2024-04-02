import { StackContext, definePlugin } from '../../feature.js'
import { z } from 'zod'
import { Function } from '../../formation/resource/lambda/function.js'
import { Code } from '../../formation/resource/lambda/code.js'
import { EventInvokeConfig } from '../../formation/resource/lambda/event-invoke-config.js'
import { getGlobalOnFailure, hasOnFailure } from '../on-failure/util.js'
import { camelCase } from 'change-case'
import { directories } from '../../util/path.js'
import { relative } from 'path'
import { TypeGen, TypeObject } from '../../util/type-gen.js'
import { formatName } from '../../formation/util.js'
import { rollupBundle } from '../../formation/resource/lambda/util/rollup.js'
import { FunctionSchema } from './schema.js'

export const isFunctionProps = (input: unknown): input is z.output<typeof FunctionSchema> => {
	return typeof input === 'string' || typeof (input as { file?: string }).file === 'string'
}

export const toFunctionProps = (fileOrProps: z.output<typeof FunctionSchema>) => {
	return typeof fileOrProps === 'string' ? { file: fileOrProps } : fileOrProps
}

const typeGenCode = `
import { InvokeOptions, InvokeResponse } from '@awsless/lambda'
import type { PartialDeep } from 'type-fest'
import type { Mock } from 'vitest'

type Func = (...args: any[]) => any

type Invoke<Name extends string, F extends Func> = {
	readonly name: Name
	readonly async: (payload: Parameters<F>[0], options?: Omit<InvokeOptions, 'name' | 'payload' | 'type'>) => InvokeResponse<F>
	readonly cached: (payload: Parameters<F>[0], options?: Omit<InvokeOptions, 'name' | 'payload' | 'type'>) => InvokeResponse<F>
	(payload: Parameters<F>[0], options?: Omit<InvokeOptions, 'name' | 'payload'>): InvokeResponse<F>
}

type Response<F extends Func> = PartialDeep<Awaited<InvokeResponse<F>>, { recurseIntoArrays: true }>
type MockHandle<F extends Func> = (payload: Parameters<F>[0]) => Promise<Response<F>> | Response<F> | void | Promise<void> | Promise<Promise<void>>
type MockHandleOrResponse<F extends Func> = MockHandle<F> | Response<F>
type MockBuilder<F extends Func> = (handleOrResponse?: MockHandleOrResponse<F>) => void
type MockObject<F extends Func> = Mock<Parameters<F>, ReturnType<F>>
`

export const functionPlugin = definePlugin({
	name: 'function',
	async onTypeGen({ config, write }) {
		const types = new TypeGen('@awsless/awsless')
		const resources = new TypeObject(1)
		const mocks = new TypeObject(1)
		const mockResponses = new TypeObject(1)

		for (const stack of config.stacks) {
			const resource = new TypeObject(2)
			const mock = new TypeObject(2)
			const mockResponse = new TypeObject(2)

			for (const [name, fileOrProps] of Object.entries(stack.functions || {})) {
				const varName = camelCase(`${stack.name}-${name}`)
				const funcName = formatName(`${config.app.name}-${stack.name}-${name}`)
				const file = typeof fileOrProps === 'string' ? fileOrProps : fileOrProps.file
				const relFile = relative(directories.types, file)

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

		await write('function.d.ts', types, true)
	},
	onStack(ctx) {
		const { config, stack } = ctx

		for (const [id, fileOrProps] of Object.entries(ctx.stackConfig.functions || {})) {
			const props =
				typeof fileOrProps === 'string'
					? { ...config.app.defaults?.function, file: fileOrProps }
					: { ...config.app.defaults?.function, ...fileOrProps }

			const lambda = toLambdaFunction(ctx as any, id, fileOrProps)

			const invoke = new EventInvokeConfig(id, {
				functionName: lambda.name,
				retryAttempts: props.retryAttempts,
				onFailure: getGlobalOnFailure(ctx),
			}).dependsOn(lambda)

			if (hasOnFailure(ctx.config)) {
				lambda.addPermissions({
					actions: ['sqs:SendMessage'],
					resources: [getGlobalOnFailure(ctx)!],
				})
			}

			stack.add(invoke, lambda)
		}
	},
})

export const toLambdaFunction = (ctx: StackContext, id: string, fileOrProps: z.infer<typeof FunctionSchema>) => {
	const config = ctx.config
	const stack = ctx.stack ?? ctx.bootstrap
	const bootstrap = ctx.bootstrap

	const props = {
		...config.app.defaults?.function,
		...toFunctionProps(fileOrProps),
	}

	const lambda = new Function(id, {
		name: `${config.app.name}-${stack.name}-${id}`,
		code: Code.fromFile(
			id,
			props.file,
			rollupBundle({
				handler: props.handler,
				minify: props.minify,
			})
		),
		...props,
		vpc: undefined,
	})

	if (config.app.defaults?.function?.permissions) {
		lambda.addPermissions(config.app.defaults?.function?.permissions)
	}

	if (typeof fileOrProps === 'object' && fileOrProps.permissions) {
		lambda.addPermissions(fileOrProps.permissions)
	}

	lambda
		.addEnvironment('APP', config.app.name)
		.addEnvironment('STAGE', config.stage)
		.addEnvironment('STACK', stack.name)

	// if (props.log) {
	// 	lambda.enableLogs(props.log instanceof Duration ? props.log : undefined)
	// }

	// debug(id, props.warm);

	if (props.warm) {
		// debug(props);
		lambda.warmUp(props.warm)
	}

	if (props.vpc) {
		lambda
			.setVpc({
				securityGroupIds: [bootstrap.import(`vpc-security-group-id`)],
				subnetIds: [bootstrap.import(`public-subnet-1`), bootstrap.import(`public-subnet-2`)],
			})
			.addPermissions({
				actions: [
					'ec2:CreateNetworkInterface',
					'ec2:DescribeNetworkInterfaces',
					'ec2:DeleteNetworkInterface',
					'ec2:AssignPrivateIpAddresses',
					'ec2:UnassignPrivateIpAddresses',
				],
				resources: ['*'],
			})
	}

	lambda.addPermissions({
		actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
		resources: ['*'],
	})

	// ctx.bind(other => {
	// 	other.addPermissions(lambda.permissions)
	// })

	return lambda
}
