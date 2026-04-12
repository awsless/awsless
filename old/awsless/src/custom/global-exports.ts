import { Group } from '../formation/resource.js'
import { CustomResource } from '../formation/resource/cloud-formation/custom-resource.js'
import { Code } from '../formation/resource/lambda/code.js'
import { Function } from '../formation/resource/lambda/function.js'
import { formatName, lazy } from '../formation/util.js'

export class GlobalExports extends Group {
	private resource: CustomResource

	constructor(
		id: string,
		props: {
			region: string
		}
	) {
		const lambda = new Function(id, {
			code: Code.fromFeature('global-exports'),
		})

		lambda.addPermissions({
			actions: ['cloudformation:ListExports'],
			resources: ['*'],
		})

		const resource = new CustomResource(id, {
			serviceToken: lambda.arn,
			properties: {
				region: props.region,
			},
		})

		super([lambda, resource])

		this.resource = resource
	}

	import(name: string) {
		return lazy(stack => {
			const attr = formatName(`${stack.app?.name ?? 'default'}-${name}`)

			return this.resource.getAtt(attr)
		})
	}
}
