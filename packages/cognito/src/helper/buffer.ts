export const concat = (...args: (ArrayBufferLike | Uint8Array)[]) => {
	let length = 0

	for (const buffer of args) {
		length += buffer.byteLength
	}

	const joined = new Uint8Array(length)
	let offset = 0

	for (const buffer of args) {
		joined.set(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer), offset)
		offset += buffer.byteLength
	}

	return joined.buffer
}
