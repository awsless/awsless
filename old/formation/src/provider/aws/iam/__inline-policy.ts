import { capitalCase } from 'change-case'
import { Input, unwrap } from '../../../core/output'
import { ARN } from '../types'

export type Statement = {
	effect?: Input<'allow' | 'deny'>
	actions: Input<Input<string>[]>
	resources: Input<Input<ARN>[]>
}

export type PolicyDocument = {
	version?: Input<'2012-10-17'>
	statements: Input<Input<Statement>[]>
}

export type InlinePolicy = {
	name: Input<string>
	document: Input<PolicyDocument>
}

export const formatStatement = (statement: Statement) => ({
	Effect: capitalCase(unwrap(statement.effect, 'allow')),
	Action: statement.actions,
	Resource: statement.resources,
})

export const formatInlinePolicy = (policy: InlinePolicy) => ({
	PolicyName: policy.name,
	PolicyDocument: {
		Version: unwrap(unwrap(policy.document).version, '2012-10-17'),
		Statement: unwrap(unwrap(policy.document).statements, [])
			.map(v => unwrap(v))
			.map(formatStatement),
	},
})

// PolicyName: this.name,
// PolicyDocument: {
// 	Version: '2012-10-17',
// 	Statement: this.statements.map(statement => ({
// 		Effect: capitalCase(unwrap(statement.effect, 'allow')),
// 		Action: statement.actions,
// 		Resource: statement.resources,
// 	})),
// },

// export class InlinePolicy {
// 	private statements: Statement[]

// 	constructor(readonly name: string, props: { statements?: Statement[] } = {}) {
// 		this.statements = props.statements ?? []
// 	}

// 	addStatement(...statements: (Statement | Statement[])[]) {
// 		this.statements.push(...statements.flat())

// 		return this
// 	}

// 	toJSON() {
// 		return {
// 			PolicyName: this.name,
// 			PolicyDocument: {
// 				Version: '2012-10-17',
// 				Statement: this.statements.map(statement => ({
// 					Effect: capitalCase(unwrap(statement.effect, 'allow')),
// 					Action: statement.actions,
// 					Resource: statement.resources,
// 				})),
// 			},
// 		}
// 	}
// }
