import { capitalCase } from 'change-case'
import { Input, unwrap } from '../../../core/output.js'
// import { AwsResource } from '../resource.js'
import { ARN } from '../types.js'
// import { Resource } from '../../../resource/resource.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'
import { Node } from '../../../core/node.js'

export type Statement = {
	effect?: Input<'allow' | 'deny'>
	actions: Input<Input<string>[]>
	resources: Input<Input<ARN>[]>
}

export type PolicyDocumentVersion = '2012-10-17'

export type PolicyDocument = {
	name: Input<string>
	version?: Input<PolicyDocumentVersion>
	statements: Input<Input<Statement>[]>
}

export const formatPolicyDocument = (policy: PolicyDocument) => ({
	PolicyName: policy.name,
	PolicyDocument: {
		Version: unwrap(policy.version, '2012-10-17'),
		Statement: unwrap(policy.statements, [])
			.map(v => unwrap(v))
			.map(formatStatement),
	},
})

export const formatStatement = (statement: Statement) => ({
	Effect: capitalCase(unwrap(statement.effect, 'allow')),
	Action: statement.actions,
	Resource: statement.resources,
})

export class RolePolicy extends CloudControlApiResource {
	private statements: Input<Statement>[] = []

	constructor(
		readonly parent: Node,
		id: string,
		private props: {
			role: Input<string>
			name: Input<string>
			version?: Input<PolicyDocumentVersion>
			statements?: Input<Input<Statement>[]>
		}
	) {
		super(parent, 'AWS::IAM::RolePolicy', id, props)
	}

	get id() {
		return this.output<string>(v => v.PolicyId)
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get name() {
		return this.output<ARN>(v => v.PolicyName)
	}

	addStatement(...statements: Input<Statement>[]) {
		this.registerDependency(statements)
		this.statements.push(...statements)
		return this
	}

	toState() {
		return {
			document: {
				RoleName: this.props.role,
				...formatPolicyDocument({
					...this.props,
					statements: [...unwrap(this.props.statements, []), ...unwrap(this.statements, [])],
				}),
			},
		}
	}
}
