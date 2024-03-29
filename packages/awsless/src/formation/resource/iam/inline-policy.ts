import { capitalCase } from 'change-case'
import { formatName } from '../../util.js'

export type Statement = {
	effect?: 'allow' | 'deny'
	actions: string[]
	resources: string[]
}

export class InlinePolicy {
	readonly name: string
	private statements: Statement[]

	constructor(name: string, props: { statements?: Statement[] } = {}) {
		this.statements = props.statements ?? []
		this.name = formatName(name)
	}

	addStatement(...statements: (Statement | Statement[])[]) {
		this.statements.push(...statements.flat())

		return this
	}

	toJSON() {
		return {
			PolicyName: this.name,
			PolicyDocument: {
				Version: '2012-10-17',
				Statement: this.statements.map(statement => ({
					Effect: capitalCase(statement.effect || 'allow'),
					Action: statement.actions,
					Resource: statement.resources,
				})),
			},
		}
	}
}
