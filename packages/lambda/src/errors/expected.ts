export class ExpectedError extends Error {
	readonly type = 'expected'

	constructor(message: string) {
		super(message)
	}
}

// export class MultiLangExpectedError extends ExpectedError {
// 	readonly type = 'multi-lang-expected'

// 	constructor(messages: Record<string, string>) {
// 		super(JSON.stringify(messages))
// 	}
// }

// export class Custom extends MultiLangExpectedError {
// 	readonly type = 'custom'

// 	constructor(messages: Record<string, string>) {
// 		super(messages)
// 	}
// }

// export const isMultiLangExpectedError = (error: unknown): error is MultiLangExpectedError {
// 	if(error instanceof )
// }
