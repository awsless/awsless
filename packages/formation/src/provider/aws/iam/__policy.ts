import { capitalCase } from 'change-case'
import { Input, unwrap } from '../../../resource/output.js'
import { AwsResource } from '../resource.js'
import { ARN } from '../types.js'
import { Resource } from '../../../resource/resource.js'
import { CloudControlApiResource } from '../cloud-control-api/resource.js'

export type Statement = {
	effect?: Input<'allow' | 'deny'>
	actions: Input<Input<string>[]>
	resources: Input<Input<ARN>[]>
}

export type PolicyDocument = {
	name: Input<string>
	version?: Input<'2012-10-17'>
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

export class Policy extends CloudControlApiResource {
	// cloudProviderId = 'aws-iam-policy'

	private statements: Input<Statement>[] = []

	constructor(
		id: string,
		private props: {
			name: Input<string>
			version?: Input<'2012-10-17'>
			groups?: Input<Input<ARN>[]>
			roles?: Input<Input<string>[]>
			statements?: Input<Input<Statement>[]>
		}
	) {
		super('AWS::IAM::Policy', id, props)
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
				...this.attr('Groups', this.props.groups),
				...this.attr('Roles', this.props.roles),
				...formatPolicyDocument({
					...this.props,
					statements: [...unwrap(this.props.statements, []), ...this.statements],
				}),
			},
		}
	}
}
