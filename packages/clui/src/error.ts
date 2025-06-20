import { isCancel } from '@clack/prompts'

export class Cancelled extends Error {
	constructor() {
		super('cancelled')
	}
}

// export type WrapPromptOptions<T extends boolean | undefined = boolean> = {
// 	throwOnCancel?: T
// }

// type Response<R, T> = T extends false ? R : Exclude<R, symbol>

export async function wrapPrompt<T>(cb: () => Promise<T>): Promise<Exclude<T, symbol>> {
	const result = await cb()

	if (isCancel(result)) {
		throw new Cancelled()
	}

	return result as Exclude<T, symbol>
}
