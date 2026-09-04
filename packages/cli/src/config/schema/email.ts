import { z } from 'zod'

export const EmailSchema = z.string().email()

export const isEmail = (value: unknown) => {
	return EmailSchema.safeParse(value).success
}
