import { func } from '../../src/lib/handle/func'

export default func((event: unknown) => ({ echo: event }))
