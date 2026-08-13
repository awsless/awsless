// import { aws } from '@awsless/formation'
// import { StackConfig } from '../../config/stack.js'
import { Output } from '@terraforge/core'
import { AppContext, StackContext } from '../../feature.js'

export const getGlobalOnFailure = (ctx: StackContext | AppContext): Output<string> => {
	return ctx.shared.get('on-failure', 'bucket-arn')
}

// export const getGlobalOnFailureQueue = (ctx: StackContext | AppContext) => {
// 	return ctx.shared.get('on-failure', 'queue-arn')
// }
