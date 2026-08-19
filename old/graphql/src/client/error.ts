export type GraphQLErrorEntry = {
	path: (string | number)[] | null
	errorType?: string
	message: string
	data?: unknown
}

export class GraphQLError extends Error {
	constructor(readonly errors: GraphQLErrorEntry[]) {
		super(errors[0].message)
	}
}

// export class NetworkError extends Error {}
