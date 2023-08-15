import { Duration } from "../../property/duration";
import { Size } from "../../property/size";
import { BuildProps, Permission, PublishProps, Resource } from "../../resource";
import { Stack } from "../../stack";
import { formatName, ref } from "../../util";

export type FunctionBundle = (file:string) => Promise<{
	handler: string
	hash: string
	files: File[]
}>

export type File = {
	name: string
	code: Buffer | string
	map?: Buffer | string
}

export type FunctionProps = {
	file: string
	bundler?: FunctionBundle

	name?: string
	description?: string
	runtime?: 'nodejs16.x' | 'nodejs18.x'
	architecture?: 'arm64' | 'x86_64'
	memorySize?: Size
	timeout?: Duration
	ephemeralStorageSize?: Size
	environment?: Record<string, string>

	// retryAttempts
	// role?: string
}

export class Function extends Resource {
	readonly name: string

	private handler?: string
	private hash?: string
	private bundle?: string
	private code?: {
		bucket: string
		key: string
		version: string
	}

	private permissions: Permission[] = []
	private environment: Record<string, string>

	constructor(readonly logicalId: string, private props: FunctionProps) {
		super('lambda', 'function', logicalId)

		this.name = formatName(this.props.name || logicalId)
		this.environment = props.environment ? {...props.environment} : {}
	}

	async build({ write }:BuildProps) {
		const { hash, files, handler } = await this.props.bundler(this.props.file)
		const bundle = await zipFiles(files)

		await Promise.all([
			write('HASH', hash),
			write('bundle.zip', bundle),
			...files.map(file => write(`files/${ file.name }`, file.code)),
			...files.map(file => file.map ? write(`files/${file.name}.map`, file.map) : undefined),
		])

		this.handler = handler
		this.bundle = bundle
		this.hash = hash

		// return {
		// 	size: formatByteSize(bundle.size)
		// }
	}

	async publish({ publish }:PublishProps) {
		this.code = await publish(
			this.name,
			this.bundle!,
			this.hash!
		)
	}

	addPermissions(...permissions: Permission[]) {
		this.permissions.push(...permissions)

		return this
	}

	addEnvironment(name: string, value: string) {
		this.environment[name] = value

		return this
	}

	get arn() {
		return ref(this.logicalId)
	}

	template(stack:Stack) {
		return {
			[ `${this.logicalId}FunctionRole` ]: {
				Type: 'AWS::IAM::Role',
				Properties: {
					AssumeRolePolicyDocument: {
						Version: '2012-10-17',
						Statement: [{
							Action: 'sts:AssumeRole',
							Effect: 'Allow',
							Principal: {
								Service: 'lambda.amazonaws.com'
							}
						}],
					},
					ManagedPolicyArns: [{
						'Fn::Sub': 'arn:${AWS::Partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
					}],
					Policies: [{
						PolicyName: '',
						PolicyDocument: {
							Version: '2012-10-17',
							Statement: this.permissions.map(permission => ({
								Effect: permission.effect || 'Allow',
								Action: permission.action,
								Resource: permission.resource,
							}))
						}
					}]
				}
			},
			[ `${this.logicalId}Function` ]: {
				Type: 'AWS::Lambda::Function',
				Properties: {
					FunctionName: stack.formatResourceName(this.name),
					Handler: this.handler || 'index.default',
					MemorySize: this.props.memorySize?.toMegaBytes() ?? 128,
					Runtime: this.props.runtime || 'nodejs18.x',
					Timeout: this.props.timeout?.toSeconds() ?? 10,
					Architectures: [ this.props.architecture || 'arm64' ],
					Role: ref(this.logicalId + 'FunctionRole'),
					EphemeralStorage: {
						Size: this.props.ephemeralStorageSize?.toMegaBytes() ?? 512
					},
					Code: {
						S3Bucket: this.code!.bucket,
						S3Key: this.code!.key,
						S3ObjectVersion: this.code!.version,
					},
					Environment: {
						Variables: this.environment
					}
				}
			}
		}
	}
}
