import { createHash } from 'crypto'
import { Body } from './types'
import { Readable } from 'stream'

export const hashSHA1 = async (data: Body) => {
	if (!data) {
		return ''
	}

	if (typeof data === 'string') {
		data = Buffer.from(data)
	}

	if (data instanceof Blob) {
		const arrayBuffer = await data.arrayBuffer()
		data = Buffer.from(arrayBuffer)
	}

	if (data instanceof Readable) {
		return ''
	}

	if (data instanceof ReadableStream) {
		return ''
	}

	return createHash('sha1').update(data).digest('hex')
}
