import { hash, hmac, generateRandomBuffer, hkdf } from './helper/crypto.js'
import { toBigInt, fromBase64, toBase64, fromUtf8, padHex, fromHex, toHex } from './helper/encoding.js'
import { createTimestamp } from './helper/timestamp.js'
import { concat } from './helper/buffer.js'
import { modPow } from './helper/bigint.js'

const initN =
	'' +
	'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1' +
	'29024E088A67CC74020BBEA63B139B22514A08798E3404DD' +
	'EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245' +
	'E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED' +
	'EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D' +
	'C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F' +
	'83655D23DCA3AD961C62F356208552BB9ED529077096966D' +
	'670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B' +
	'E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9' +
	'DE2BCBF6955817183995497CEA956AE515D2261898FA0510' +
	'15728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64' +
	'ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7' +
	'ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6B' +
	'F12FFA06D98A0864D87602733EC86A64521F2B18177B200C' +
	'BBE117577A615D6C770988C0BAD946E208E24FA074E5AB31' +
	'43DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF'

const ZERO = BigInt(0)
const N = BigInt('0x' + initN)
const g = BigInt(2)

const combine = async (left: string | bigint, right: string | bigint) => {
	return toBigInt(await hash('SHA-256', fromHex(left.toString(16) + right.toString(16))))
}

const createFullPassword = async (group: string, user: string, pass: string) => {
	return toHex(await hash('SHA-256', fromUtf8(`${group}${user}:${pass}`)))
}

export const srp = async (group: string, smallAValue?: ArrayBuffer) => {
	const smallA = toBigInt(smallAValue || generateRandomBuffer(128))
	const largeA = modPow(g, smallA, N)

	if (largeA % N === ZERO) {
		throw new Error('Illegal paramater. A mod N cannot be 0.')
	}

	const A = largeA.toString(16)

	return [
		A,
		async (user: string, pass: string, serverB: string, salt: string, secretBlock: string, time?: string) => {
			const B = BigInt('0x' + serverB)
			const S = BigInt('0x' + salt)

			if (B % N === ZERO) {
				throw new Error('B cannot be zero.')
			}

			const U = await combine(padHex(A), padHex(B))

			if (U === ZERO) {
				throw new Error('U cannot be zero.')
			}

			const fullPassword = await createFullPassword(group, user, pass)

			const k = await combine(padHex(N), padHex(g))
			const x = await combine(padHex(S), fullPassword)
			const xn = modPow(g, x, N)
			const int = B - k * xn
			const s = modPow(int, smallA + U * x, N) % N

			const kUser = await hkdf(
				'SHA-256',
				fromHex(padHex(s)),
				fromHex(padHex(U)),
				fromUtf8('Caldera Derived Key'),
				128
			)

			const timestamp = time || createTimestamp()

			const message = concat(fromUtf8(group), fromUtf8(user), fromBase64(secretBlock), fromUtf8(timestamp))

			const mac = await hmac('SHA-256', message, kUser)
			const signature = toBase64(mac)

			return [signature, timestamp]
		},
	] as const
}

export const generateVerifier = async (group: string, user: string, pass: string, random?: ArrayBuffer) => {
	const fullPassword = await createFullPassword(group, user, pass)
	const salt = padHex(toHex(random ?? generateRandomBuffer(16)))
	const saltedHash = await combine(salt, fullPassword)
	const verifier = padHex(modPow(g, saltedHash, N).toString(16))

	return [toBase64(fromHex(verifier)), toBase64(fromHex(salt))] as const
}

export const generateDeviceSecret = () => {
	return toBase64(generateRandomBuffer(40))
}
