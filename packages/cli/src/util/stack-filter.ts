import wildstring from 'wildstring'
import { ExpectedError } from '../error.js'

// The app's own stack, next to the ones its stack files define.
const BASE_STACK = 'base'

// A stack filter that matches no stack is a typo, not an empty selection:
// a command that quietly did nothing would look like it succeeded.
export const assertStackFilters = (stacks: { name: string }[], filters: string[] = []) => {
	const names = [...stacks.map(stack => stack.name), BASE_STACK]
	const unknown = filters.filter(filter => !names.some(name => wildstring.match(filter, name)))

	if (unknown.length > 0) {
		throw new ExpectedError(
			`No stack matches ${unknown.map(filter => `"${filter}"`).join(', ')}. The stacks are: ${names.join(', ')}`
		)
	}
}
