import { Mock } from 'vitest'

export type Func = (...args: unknown[]) => unknown
export type Result<T extends string | number | symbol> = Record<T, Mock<any, Func>>

export const mockObjectValues = <T extends Record<string, Func>>(object: T): Result<keyof T> => {
	const list: Result<string> = {}

	Object.entries(object).forEach(([key, value]) => {
		list[key] = mockFn(value)
	})

	return Object.freeze(list) as Result<keyof T>
}

export const mockFn = <T extends Func>(fn: T) => {
	return (vi ? vi.fn(fn) : fn) as Mock<any>
}

export const nextTick = (fn: Func, ...args: unknown[]) => {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve(fn(...args))
		}, 0)
	})
}

export const asyncCall = (fn:Func, ...args:unknown[]) => {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve(fn(...args))
		}, 0)
	})
}
