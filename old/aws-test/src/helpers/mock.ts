
import { Mock } from 'vitest'

type Func = (...args: any[]) => any
type Result<T extends string | number | symbol> = Record<T, Mock<any, Func>>

export const mockObjectKeys = <T extends Record<string, Func>>(object:T): Result<keyof T> => {
	const list:Result<string> = {}

	Object.entries(object).forEach(([key, value]) => {
		list[key] = vi.fn(value)
	})

	return Object.freeze(list) as Result<keyof T>
}
