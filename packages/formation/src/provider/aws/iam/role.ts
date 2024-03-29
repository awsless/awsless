import { Input, unwrap } from '../../../resource/output.js'
import { AwsResource } from '../resource.js'
import { ARN } from '../types.js'
import { PolicyDocument, formatPolicyDocument } from './__policy.js'
import { PolicyDocumentVersion, RolePolicy, Statement } from './role-policy.js'
// import { ManagedPolicy } from './managed-policy.js'

export class Role extends AwsResource {
	private inlinePolicies: PolicyDocument[] = []
	private managedPolicies = new Set<Input<ARN>>()

	constructor(
		id: string,
		private props: {
			name?: Input<string>
			path?: Input<string>
			assumedBy?: string
			policies?: PolicyDocument[]
		} = {}
	) {
		super('AWS::IAM::Role', id, props)
	}

	get id() {
		return this.output<string>(v => v.RoleId)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get name() {
		return this.output<string>(v => v.RoleName)
	}

	addManagedPolicy(...policies: Input<ARN>[]) {
		this.registerDependency(policies)

		for (const arn of policies) {
			this.managedPolicies.add(arn)
		}

		return this
	}

	addInlinePolicy(...policies: PolicyDocument[]) {
		this.registerDependency(policies)

		for (const policy of policies) {
			this.inlinePolicies.push(policy)
		}

		return this
	}

	addPolicy(
		id: string,
		props: {
			name: Input<string>
			version?: Input<PolicyDocumentVersion>
			statements?: Input<Input<Statement>[]>
		}
	) {
		const policy = new RolePolicy(id, {
			role: this.name,
			...props,
		})

		this.add(policy)

		return policy
	}

	toState() {
		return {
			document: {
				...this.attr('RoleName', this.props.name),
				...this.attr('Path', this.props.path),
				ManagedPolicyArns: [...this.managedPolicies],
				Policies: [...unwrap(this.props.policies, []), ...this.inlinePolicies].map(policy =>
					formatPolicyDocument(policy)
				),
				...(this.props.assumedBy
					? {
							AssumeRolePolicyDocument: {
								Version: '2012-10-17',
								Statement: [
									{
										Action: ['sts:AssumeRole'],
										Effect: 'Allow',
										Principal: {
											Service: [this.props.assumedBy],
										},
									},
								],
							},
					  }
					: {}),
			},
		}
	}
}
