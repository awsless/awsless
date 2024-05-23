import { Duration, seconds, toSeconds } from '@awsless/duration'
import { mebibytes, Size, toMebibytes } from '@awsless/size'
import { constantCase } from 'change-case'
import { Input, unwrap } from '../../../core/output.js'
import { ARN } from '../types.js'
import { Code, formatCode } from './code.js'
// import { Url, UrlProps } from './url.js'
// import { Permission } from './permission.js'
import { Node } from '../../../core/node.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'

export type FunctionProps = {
	name: Input<string>
	code: Input<Code>
	role: Input<ARN>
	description?: Input<string>
	runtime?: Input<'nodejs18.x' | 'nodejs20.x'>
	handler?: Input<string>
	architecture?: Input<'arm64' | 'x86_64'>
	memorySize?: Input<Size>
	timeout?: Input<Duration>
	ephemeralStorageSize?: Input<Size>
	environment?: Input<Record<string, Input<string>>>
	// permissions?: Permission | Permission[]
	reserved?: Input<number>
	vpc?: Input<{
		securityGroupIds: Input<Input<string>[]>
		subnetIds: Input<Input<string>[]>
	}>

	log?: Input<{
		format?: Input<'text' | 'json'>
		level?: Input<'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'>
		system?: Input<'debug' | 'info' | 'warn'>
	}>
}

export class Function extends CloudControlApiResource {
	private environmentVariables: Record<string, Input<string>> = {}

	constructor(
		readonly parent: Node,
		id: string,
		private props: FunctionProps
	) {
		super(parent, 'AWS::Lambda::Function', id, props)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get name() {
		return this.output<string>(v => v.FunctionName)
	}

	addEnvironment(name: string, value: Input<string>) {
		this.environmentVariables[name] = value
		this.registerDependency(value)

		return this
	}

	setVpc(
		vpc: Input<{
			securityGroupIds: Input<Input<string>[]>
			subnetIds: Input<Input<string>[]>
		}>
	) {
		this.props.vpc = vpc
		this.registerDependency(vpc)

		return this
	}

	get permissions() {
		return {
			actions: [
				//
				'lambda:InvokeFunction',
				'lambda:InvokeAsync',
			],
			resources: [this.arn],
		}
	}

	// enableUrlAccess(props: Omit<UrlProps, 'targetArn'> = {}) {
	// 	const url = new Url('url', {
	// 		...props,
	// 		targetArn: this.arn,
	// 	})

	// 	const permissions = new Permission('url', {
	// 		principal: '*',
	// 		// principal: 'cloudfront.amazonaws.com',
	// 		// sourceArn: distribution.arn,
	// 		action: 'lambda:InvokeFunctionUrl',
	// 		functionArn: this.arn,
	// 		urlAuthType: props.authType ?? 'none',
	// 	})

	// 	this.add(permissions)
	// 	this.add(url)

	// 	return url
	// }

	toState() {
		if (unwrap(this.props.name).length > 64) {
			throw new TypeError(`Lambda function name length can't be greater then 64. ${unwrap(this.props.name)}`)
		}

		const code = unwrap(this.props.code)

		const nativeProps = {
			Runtime: unwrap(this.props.runtime, 'nodejs18.x'),
			Handler: unwrap(this.props.handler, 'index.default'),
		}

		const containerProps = {
			PackageType: 'Image',
		}

		return {
			asset: {
				code: this.props.code,
			},
			document: {
				FunctionName: this.props.name,
				Description: this.props.description,
				MemorySize: toMebibytes(unwrap(this.props.memorySize, mebibytes(128))),
				Timeout: toSeconds(unwrap(this.props.timeout, seconds(10))),
				Architectures: [unwrap(this.props.architecture, 'arm64')],
				Role: this.props.role,
				...this.attr('ReservedConcurrentExecutions', this.props.reserved),
				...('imageUri' in code ? containerProps : nativeProps),
				Code: formatCode(code),
				EphemeralStorage: {
					Size: toMebibytes(unwrap(this.props.ephemeralStorageSize, mebibytes(512))),
				},
				...(this.props.log
					? {
							LoggingConfig: {
								LogFormat: unwrap(this.props.log).format === 'text' ? 'Text' : 'JSON',
								ApplicationLogLevel: constantCase(unwrap(unwrap(this.props.log).level, 'error')),
								SystemLogLevel: constantCase(unwrap(unwrap(this.props.log).system, 'warn')),
							},
						}
					: {}),
				...(this.props.vpc
					? {
							VpcConfig: {
								SecurityGroupIds: unwrap(this.props.vpc).securityGroupIds,
								SubnetIds: unwrap(this.props.vpc).subnetIds,
							},
						}
					: {}),
				Environment: {
					Variables: {
						...unwrap(this.props.environment),
						...this.environmentVariables,
					},
				},
			},
		}
	}
}
