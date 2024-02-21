import { ValiError } from 'valibot'

type TestSchemaOptions = {
	valid?: any[]
	invalid?: any[]
	validate: (value: any) => void
}

export const testSchema = (type: string, { valid, invalid, validate }: TestSchemaOptions) => {
	describe(type, () => {
		if (valid) {
			valid.forEach(value => {
				it(`valid (${JSON.stringify(value)})`, () => {
					validate(value)
				})
			})
		}

		if (invalid) {
			invalid.forEach(value => {
				it(`invalid (${JSON.stringify(value)})`, () => {
					expect(() => validate(value)).toThrow(ValiError)
				})
			})
		}
	})
}
