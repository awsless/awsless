import { createHash } from 'crypto'

export const shortId = (ns: string) => {
	return createHash('md5').update(ns).digest('hex').substring(0, 10)
}
