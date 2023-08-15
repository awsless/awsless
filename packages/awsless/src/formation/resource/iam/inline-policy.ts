
export type Statement = {
	effect?: 'Allow' | 'Deny'
	actions: string[]
	resources: string[]
}

export class InlinePolicy {
	private statements: Statement[]

	constructor(readonly name:string, props: { statements?: Statement[] } = {}) {
		this.statements = props.statements || []
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
					Effect: statement.effect || 'Allow',
					Action: statement.actions,
					Resource: statement.resources,
				}))
			}
		}
	}
}
