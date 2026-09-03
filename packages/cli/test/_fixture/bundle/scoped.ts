import { getStack, shouldThrowExpectedErrors } from 'awsless'

const stack = getStack()

export default () => ({ stack, expected: shouldThrowExpectedErrors() })
