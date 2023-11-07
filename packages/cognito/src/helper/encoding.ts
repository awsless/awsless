export const toBigInt = (buffer: ArrayBuffer) => {
	return BigInt(`0x${toHex(buffer)}`)
}

export const toHex = (buffer: ArrayBuffer) => {
	return Array.from(new Uint8Array(buffer))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('')
}

export const fromHex = (hex: string) => {
	const view = new Uint8Array(hex.length / 2)

	for (let i = 0; i < hex.length; i += 2) {
		view[i / 2] = parseInt(hex.substring(i, i + 2), 16)
	}

	return view.buffer
}

export function fromUtf8(str: string) {
	return new TextEncoder().encode(str).buffer
}

// export function toUtf8(str) {
// 	return (new TextDecoder('utf-8')).decode(str);
// }

export const fromBase64 = (base64: string) => {
	if (typeof atob === 'undefined') {
		return Uint8Array.from(Buffer.from(base64, 'base64'))
	}

	return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}

export const toBase64 = (buffer: ArrayBuffer) => {
	if (typeof btoa === 'undefined') {
		return Buffer.from(buffer).toString('base64')
	}

	return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

export const padHex = (bigInt: bigint | string) => {
	const hashStr = bigInt.toString(16)
	if (hashStr.length % 2 === 1) {
		return '0' + hashStr
	}

	if ('89ABCDEFabcdef'.indexOf(hashStr[0]) !== -1) {
		return '00' + hashStr
	}

	return hashStr
}
