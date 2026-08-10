import { pascalCase } from 'change-case'
import { compactPolicyStatements, PolicyStatement } from '../feature/bundle/policy.js'

export const formatPolicyDocument = (statements: PolicyStatement[]) => {
	return JSON.stringify({
		Version: '2012-10-17',
		Statement: compactPolicyStatements(statements).map(statement => ({
			Effect: pascalCase(statement.effect ?? 'allow'),
			Action: statement.actions,
			Resource: statement.resources,
			Condition: statement.conditions,
		})),
	})
}
