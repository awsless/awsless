import { Handler, lambda } from '@awsless/lambda'
import { GenericSchema } from '@awsless/validate'
import { shouldThrowExpectedErrors } from '../server/bundle.js'

// Async consumers surface every error, so failures reach the
// on-failure consumer instead of hiding inside a viewable response.
// The same handler factory serves sync routes too, so the route
// context decides at invoke time.
export const consumer = <S extends GenericSchema | undefined, H extends Handler<S>>(schema: S, handle: H) => {
	return lambda({
		schema,
		handle,
		throwExpectedErrors: shouldThrowExpectedErrors,
	})
}
