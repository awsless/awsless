import { z } from 'zod'

// E.164 format: +31612345678
export const PhoneSchema = z
	.string()
	.regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number. Use the E.164 format, like +31612345678')

export const isPhone = (value: unknown) => {
	return PhoneSchema.safeParse(value).success
}
