import { getStack } from 'awsless'

const stack = getStack()
const expected = process.env.THROW_EXPECTED_ERRORS

export default () => ({ stack, expected })
