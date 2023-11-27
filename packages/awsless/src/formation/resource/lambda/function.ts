import { Asset } from '../../asset.js'
import { Duration } from '../../property/duration.js'
import { Size } from '../../property/size.js'
import { Permission, Resource } from '../../resource.js'
import { formatArn, formatName, sub } from '../../util.js'
import { LogGroup } from '../cloud-watch/log-group.js'
import { InlinePolicy } from '../iam/inline-policy.js'
import { Role } from '../iam/role.js'
import { ICode } from './code.js'
import { EventsEventSource } from './event-source/events.js'
import { Url, UrlProps } from './url.js'

export type FunctionProps = {
	code: ICode
	name?: string
	description?: string
	runtime?: 'nodejs18.x' | 'nodejs20.x'
	architecture?: 'arm64' | 'x86_64'
	memorySize?: Size
	timeout?: Duration
	ephemeralStorageSize?: Size
	environment?: Record<string, string>
	permissions?: Permission | Permission[]
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

	constructor(private _logicalId: string, private props: FunctionProps) {
		const policy = new InlinePolicy(_logicalId)
		const role = new Role(_logicalId, {
			assumedBy: 'lambda.amazonaws.com',
		})

		role.addInlinePolicy(policy)

		if (props.permissions) {
			policy.addStatement(props.permissions)
		}

		super('AWS::Lambda::Function', _logicalId, [role])

		if (props.code instanceof Asset) {
			this.children.push(props.code)
		}

		this.dependsOn(role)

		this.role = role
		this.policy = policy
		this.name = formatName(this.props.name || _logicalId)
		this.environmentVariables = props.environment ? { ...props.environment } : {}

		this.tag('name', this.name)
	}

	enableLogs(retention?: Duration) {
		const logGroup = new LogGroup(this._logicalId, {
			name: sub('/aws/lambda/${name}', {
				name: this.name,
			}),
			retention,
		})

		this.addChild(logGroup)
		this.addPermissions(
			{
				actions: ['logs:CreateLogStream'],
				resources: [logGroup.arn],
			},
			{
				actions: ['logs:PutLogEvents'],
				resources: [sub('${arn}:*', { arn: logGroup.arn })],
			}
		)

		return this
	}

	warmUp(concurrency: number) {
		const source = new EventsEventSource(`${this._logicalId}-warmer`, this, {
			schedule: 'rate(5 minutes)',
			payload: {
				warmer: true,
				concurrency,
			},
		})

		this.addChild(source)

		return this
	}

	addUrl(props: Omit<UrlProps, 'target'> = {}) {
		return new Url(this._logicalId, {
			...props,
			target: this.arn,
		}).dependsOn(this)
	}

	addPermissions(...permissions: (Permission | Permission[])[]) {
		this.policy.addStatement(...permissions)

		return this
	}

	addEnvironment(name: string, value: string) {
		this.environmentVariables[name] = value

		return this
	}

	setVpc(vpc: { securityGroupIds: string[]; subnetIds: string[] }) {
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
			actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync'],
			resources: [
				formatArn({
					service: 'lambda',
					resource: 'function',
					resourceName: this.name,
					seperator: ':',
				}),
			],
		}
	}

	properties() {
		return {
			FunctionName: this.name,
			MemorySize: this.props.memorySize?.toMegaBytes() ?? 128,
			Runtime: this.props.runtime ?? 'nodejs18.x',
			Timeout: this.props.timeout?.toSeconds() ?? 10,
			Architectures: [this.props.architecture ?? 'arm64'],
			Role: this.role.arn,
			...this.attr('ReservedConcurrentExecutions', this.props.reserved),
			...this.props.code.toCodeJson(),
			EphemeralStorage: {
				Size: this.props.ephemeralStorageSize?.toMegaBytes() ?? 512,
			},
			...(this.props.vpc
				? {
						VpcConfig: {
							SecurityGroupIds: this.props.vpc.securityGroupIds,
							SubnetIds: this.props.vpc.subnetIds,
						},
				  }
				: {}),
			Environment: {
				Variables: this.environmentVariables,
			},
		}
	}
}
