const stack = process.env.STACK
const expected = process.env.THROW_EXPECTED_ERRORS

export default () => ({ stack, expected })
