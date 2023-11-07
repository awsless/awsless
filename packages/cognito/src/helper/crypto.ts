export const generateRandomBuffer = (numBytes: number) => {
	const u8 = new Uint8Array(numBytes)
	crypto.getRandomValues(u8)
	return u8.buffer
}

export const hkdf = async (
	algorithm: AlgorithmIdentifier,
	ikm: BufferSource,
	salt: BufferSource,
	info: BufferSource,
	keylen: number
) => {
	const cryptoKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
	const params: HkdfParams = {
		name: 'HKDF',
		hash: algorithm,
		salt,
		info,
	}

	const bytes = await crypto.subtle.deriveBits(params, cryptoKey, keylen)
	return new Uint8Array(bytes)
}

export const hash = (algorithm: AlgorithmIdentifier, message: BufferSource) => {
	return crypto.subtle.digest(algorithm, message)
}

export const hmac = async (algorithm: string, message: BufferSource, key: BufferSource) => {
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		key,
		{ name: 'HMAC', hash: { name: algorithm } },
		false,
		['sign']
	)

	return crypto.subtle.sign('HMAC', cryptoKey, message)
}
