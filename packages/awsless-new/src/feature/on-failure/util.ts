import { aws } from '@awsless/formation'
import { StackConfig } from '../../config/stack.js'
import { StackContext } from '../../feature.js'

export const getGlobalOnFailure = (ctx: StackContext) => {
	return hasOnFailure(ctx.stackConfigs) ? ctx.shared.get<aws.ARN>('on-failure-queue-arn') : undefined
}

export const hasOnFailure = (stacks: StackConfig[]) => {
	const onFailure = stacks.find(stack => {
		// @ts-ignore
		return typeof stack.onFailure !== 'undefined'
	})

	return !!onFailure
}
