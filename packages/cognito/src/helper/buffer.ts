export const concat = (...args: ArrayBufferLike[]) => {
	let length = 0

	for (var i in args) {
		length += args[i].byteLength
	}

	const joined = new Uint8Array(length)
	let offset = 0

	for (var i in args) {
		const buffer = args[i]
		joined.set(new Uint8Array(buffer), offset)
		offset += buffer.byteLength
	}

	return joined.buffer
}
