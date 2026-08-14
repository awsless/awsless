// The opaque context of the request currently executing an operation,
// handed through to the stream callbacks its writes trigger. The local
// dev environment of awsless uses it to link a stream dispatch back to
// the request chain that caused the write.
//
// A plain variable is enough: operations run synchronously, so the
// context set before an operation is exactly the one live while its
// stream records emit - even under concurrent requests.
let current: string | undefined

export const setRequestContext = (context: string | undefined) => {
	current = context
}

export const getRequestContext = () => current
