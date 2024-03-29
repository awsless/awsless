import { createHash } from 'crypto'

// export const tick = () => {
// 	return new Promise(resolve => setTimeout(resolve))
// }

export const sha256 = (data: unknown) => {
	return createHash('sha256').update(JSON.stringify(data)).digest('hex')
}
