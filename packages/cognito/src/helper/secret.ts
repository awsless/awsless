import { Client } from '../client'
import { concat } from './buffer'
import { hmac } from './crypto'
import { fromUtf8, toBase64 } from './encoding'

export const generateSecretHash = async (client: Client, value: string) => {
	const message = concat(fromUtf8(value), fromUtf8(client.id))
	const hash = await hmac('sha-256', message, fromUtf8(client.secret!))

	return toBase64(hash)
}
