import { one } from '@fixture/lib'
import { parse } from 'yaml'

export const config = (input: string) => {
	return { value: parse(input), one }
}
