
import { load } from '@heat/awsless'

export const loadDefinitions = async (paths: string | string[]) => {
	const definitions = []

	if(!Array.isArray(paths)) {
		paths = [ paths ]
	}

	await Promise.all(paths.map(async (path) => {
		const stacks = await load(path, {
			resolveRemoteResolvers: false,
			resolveLocalResolvers: false
		})

		for(let stack of stacks) {
			const template = JSON.parse(stack.templateBody)

			Object.values(template.Resources).map((resource:any) => {
				if(resource.Type !== 'AWS::DynamoDB::Table') {
					return
				}

				const properties = Object.assign({}, resource.Properties, {
					BillingMode: 'PAY_PER_REQUEST'
				})

				delete properties.TableClass
				delete properties.TimeToLiveSpecification
				delete properties.PointInTimeRecoverySpecification
				delete properties.Tags

				if(properties.StreamSpecification) {
					properties.StreamSpecification.StreamEnabled = true
				}

				definitions.push(properties)
			})
		}
	}))

	return definitions
}
