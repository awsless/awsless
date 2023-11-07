import { ValiError } from 'valibot'

type TestSchemaOptions = {
	valid?: any[]
	invalid?: any[]
	validate: (value: any) => void
}

export const testSchema = (type: string, { valid, invalid, validate }: TestSchemaOptions) => {
	describe(type, () => {
		if (valid) {
			it(`valid`, () => {
				valid.forEach(value => {
					validate(value)
				})
			})
		}

		if (invalid) {
			it(`invalid`, () => {
				invalid.forEach(value => {
					expect(() => validate(value)).toThrow(ValiError)
				})
			})
		}
	})
}
