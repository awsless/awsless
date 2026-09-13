import type { Mock } from 'vitest'

export type Func = (...args: any[]) => any
export type Result<T extends Record<string, Func>> = { [K in keyof T]: Mock<T[K]> }
type Vitest = (typeof import('vitest'))['vi']
type MockFactory = Vitest['fn']

export const getVitest = (provided?: Vitest) => {
	const vi = provided ?? (globalThis as { vi?: Vitest }).vi

	if (!vi) {
		throw new Error('Enable vitest globals or pass vi explicitly (vi.fn for mockFn and mockObjectValues).')
	}

	return vi
}

export const mockObjectValues = <T extends Record<string, Func>>(object: T, createMock?: MockFactory): Result<T> => {
	const list: Record<string, Mock<Func>> = {}

	for (const [key, value] of Object.entries(object)) {
		list[key] = mockFn(value, createMock)
	}

	return Object.freeze(list) as Result<T>
}

export const mockFn = <T extends Func>(fn: T, createMock?: MockFactory) => {
	const factory = createMock ?? getVitest().fn
	return factory(fn)
}

export const nextTick = async (fn: Func, ...args: unknown[]): Promise<unknown> => {
	await new Promise(resolve => setTimeout(resolve, 0))
	return fn(...args)
}
