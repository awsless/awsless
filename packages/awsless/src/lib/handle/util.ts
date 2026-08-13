import { Handler, lambda } from '@awsless/lambda'
import { GenericSchema } from '@awsless/validate'

// Async consumers surface every error, so failures reach the
// on-failure consumer instead of hiding inside a viewable response.
export const consumer = <S extends GenericSchema | undefined, H extends Handler<S>>(schema: S, handle: H) => {
	return lambda({
		schema,
		handle,
		throwExpectedErrors: !!process.env.THROW_EXPECTED_ERRORS,
	})
}
