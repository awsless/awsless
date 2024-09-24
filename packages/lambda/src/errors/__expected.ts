abstract class TypedError<T extends string = string> extends Error {
	abstract readonly type: T
}

abstract class ExpectedError<T extends string = string> extends TypedError<T> {
	readonly expected = true
}

class NotFound extends ExpectedError {
	readonly type = 'NOT_FOUND'
}

class OtherProblem extends TypedError {
	readonly type = 'OTHER_PROBLEM'

	constructor(readonly problem: string) {
		super()
	}
}

type Result<T, E extends Error> = T | E

const lambda1 = () => {
	if (1 > 1) {
		return 'WOW!'
	}

	if (1 > 2) {
		return new OtherProblem()
	}

	return new NotFound()
}

const lambda2 = () => {
	const result = lambda1()

	if (result instanceof TypedError) {
		switch (result.type) {
			case 'NOT_FOUND':
			case 'OTHER_PROBLEM':
		}
	}
}
