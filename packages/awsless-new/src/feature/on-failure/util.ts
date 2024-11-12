import { aws } from '@awsless/formation'
import { StackConfig } from '../../config/stack.js'
import { AppContext, StackContext } from '../../feature.js'

export const getGlobalOnFailure = (ctx: StackContext | AppContext) => {
	return hasOnFailure(ctx.stackConfigs) ? ctx.shared.get<aws.ARN>('on-failure-queue-arn') : undefined
}

export const hasOnFailure = (stacks: StackConfig[]) => {
	const onFailure = stacks.find(stack => {
		return typeof stack.onFailure !== 'undefined'
	})

	return !!onFailure
}
