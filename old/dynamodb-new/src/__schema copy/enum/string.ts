import { createSchema } from '../schema'

type StringEnum = {
	[key: string | number]: string
}

export const stringEnum = <T extends StringEnum>(_: T) => createSchema<'S', T[keyof T], T[keyof T]>({ type: 'S' })
