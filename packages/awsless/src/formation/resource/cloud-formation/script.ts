import { Duration } from '../../property/duration.js'
import { Size } from '../../property/size.js'
import { Group } from '../../resource.js'
import { formatName } from '../../util.js'
import { Code } from '../lambda/code.js'
import { Function, FunctionProps } from '../lambda/function.js'
import { CustomResource } from './custom-resource.js'

export type ScriptProps = {
	name?: string
	onCreate?: FunctionProps
	onUpdate?: FunctionProps
	onDelete?: FunctionProps
}

export class Script extends Group {
	private lambda: Function

	readonly createFunction?: Function
	readonly updateFunction?: Function
	readonly deleteFunction?: Function

	constructor(id: string, props: ScriptProps) {
		const name = formatName(`script-${props.name ?? id}`)
		const lambda = new Function(id, {
			name,
			code: Code.fromFeature('script'),
			memorySize: Size.megaBytes(256),
			timeout: Duration.minutes(15),
		})

		// const createFunction = props.onCreate && new Function(`${id}-create`, { name, ...props.onCreate })
		// const updateFunction = props.onUpdate && new Function(`${id}-update`, { name, ...props.onUpdate })
		// const deleteFunction = props.onDelete && new Function(`${id}-delete`, { name, ...props.onDelete })

		// lambda.addPermissions(
		// 	createFunction?.permissions ?? [],
		// 	updateFunction?.permissions ?? [],
		// 	deleteFunction?.permissions ?? []
		// )

		super([lambda])

		this.lambda = lambda

		this.createFunction = this.createUserFunction(lambda, id, 'create', name, props.onCreate)
		this.updateFunction = this.createUserFunction(lambda, id, 'update', name, props.onUpdate)
		this.deleteFunction = this.createUserFunction(lambda, id, 'delete', name, props.onDelete)
	}

	private createUserFunction(
		lambda: Function,
		id: string,
		type: 'create' | 'update' | 'delete',
		name: string,
		props?: FunctionProps
	) {
		if (!props) return

		const userFunction = new Function(`script-${id}-${type}`, {
			name: formatName(`${name}-${type}`),
			...props,
		})

		lambda.addPermissions(userFunction.permissions)

		this.children.push(userFunction)

		return userFunction
	}

	createInstance(id: string, props: { params: Record<string, unknown>; version?: string | number }) {
		return new CustomResource(id, {
			serviceToken: this.lambda.arn,
			properties: {
				createFunction: this.createFunction?.name,
				updateFunction: this.updateFunction?.name,
				deleteFunction: this.deleteFunction?.name,
				params: props.params,
				version: props.version,
			},
		})
	}
}
