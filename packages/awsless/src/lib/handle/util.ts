import { Handler, lambda } from '@awsless/lambda'
import { GenericSchema } from '@awsless/validate'
import { shouldThrowExpectedErrors } from '../server/bundle.js'

// The same factory serves sync & async routes, so by default the route
// context decides at invoke time whether expected errors throw.
export const consumer = <S extends GenericSchema | undefined, H extends Handler<S>>(
	schema: S,
	handle: H,
	throwExpectedErrors: boolean | (() => boolean) = shouldThrowExpectedErrors
) => {
	return lambda({
		schema,
		handle,
		throwExpectedErrors,
	})
}
