import { z } from 'zod'

export const EmailSchema = z.custom<`${string}@${string}.${string}`>(value => {
	return z.string().email().safeParse(value).success
})

export const isEmail = (value: unknown) => {
	return z.string().email().safeParse(value).success
}
