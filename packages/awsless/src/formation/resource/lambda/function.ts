
import { Asset } from "../../asset";
import { Duration } from "../../property/duration";
import { Size } from "../../property/size";
import { Permission, Resource } from "../../resource";
import { formatArn, formatName } from "../../util";
import { InlinePolicy } from "../iam/inline-policy";
import { ManagedPolicy } from "../iam/managed-policy";
import { Role } from "../iam/role";
import { ICode } from "./code";

export type FunctionProps = {
	code: ICode
	name?: string
	description?: string
	runtime?: 'nodejs16.x' | 'nodejs18.x'
	architecture?: 'arm64' | 'x86_64'
	memorySize?: Size
	timeout?: Duration
	ephemeralStorageSize?: Size
	environment?: Record<string, string>
	reserved?: number
	vpc?: {
		securityGroupIds: string[]
		subnetIds: string[]
	}

	// retryAttempts
	// role?: string
}

export class Function extends Resource {
	readonly name: string
	private role: Role
	private policy: InlinePolicy
	private environmentVariables: Record<string, string>

	constructor(logicalId: string, private props: FunctionProps) {
		const policy = new InlinePolicy(logicalId)
		const role = new Role(logicalId, {
			assumedBy: 'lambda.amazonaws.com',
		})

		role.addInlinePolicy(policy)
		role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSLambdaBasicExecutionRole'))

		super('AWS::Lambda::Function', logicalId, [ role ])

		if(props.code instanceof Asset) {
			this.children.push(props.code)
		}

		this.dependsOn(role)

		this.role = role
		this.policy = policy
		this.name = formatName(this.props.name || logicalId)
		this.environmentVariables = props.environment ? {...props.environment} : {}

		this.tag('name', this.name)
	}

	addPermissions(...permissions: (Permission | Permission[])[]) {
		this.policy.addStatement(...permissions)

		return this
	}

	addEnvironment(name: string, value: string) {
		this.environmentVariables[name] = value

		return this
	}

	setVpc(vpc: {
		securityGroupIds: string[]
		subnetIds: string[]
	}) {
		this.props.vpc = vpc

		return this
	}

	get id() {
		return this.ref()
	}

	get arn() {
		return this.getAtt('Arn')
	}

	get permissions() {
		return {
			actions: [
				'lambda:InvokeFunction',
				'lambda:InvokeAsync',
			],
			resources: [
				formatArn({
					service: 'lambda',
					resource: 'function',
					resourceName: this.name,
					seperator: ':',
				})
			],
		}
	}

	properties() {
		return {
			FunctionName: this.name,
			MemorySize: this.props.memorySize?.toMegaBytes() ?? 128,
			Runtime: this.props.runtime ?? 'nodejs18.x',
			Timeout: this.props.timeout?.toSeconds() ?? 10,
			Architectures: [ this.props.architecture ?? 'arm64' ],
			Role: this.role.arn,
			...this.attr('ReservedConcurrentExecutions', this.props.reserved),
			...this.props.code.toCodeJson(),
			EphemeralStorage: {
				Size: this.props.ephemeralStorageSize?.toMegaBytes() ?? 512
			},
			...(this.props.vpc ? {
				VpcConfig: {
					SecurityGroupIds: this.props.vpc.securityGroupIds,
					SubnetIds: this.props.vpc.subnetIds,
				}
			} : {}),
			Environment: {
				Variables: this.environmentVariables
			}
		}
	}
}
