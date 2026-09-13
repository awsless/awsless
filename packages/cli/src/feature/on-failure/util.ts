import { Output } from '@terraforge/core'
import { AppContext, StackContext } from '../../feature.js'

// The bucket arn is only shared after the on-failure handler exists, so
// the handler itself never sees it & can never feed its own failures back
// into the bucket it consumes. Callers skip the failure wiring when the
// arn is missing.
export const getGlobalOnFailure = (ctx: StackContext | AppContext): Output<string> | undefined => {
	if (!ctx.shared.has('on-failure', 'bucket-arn')) {
		return undefined
	}

	return ctx.shared.get('on-failure', 'bucket-arn')
}
