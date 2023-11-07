import { Client, MemoryStore, signIn, getSession } from './src/index.js'

// import { webcrypto } from 'node:crypto';
// globalThis.crypto = webcrypto;

const deviceStore = new MemoryStore()
const store = new MemoryStore()

const client = new Client({
	id: '',
	userPoolId: '',
	store,
	deviceStore,
})

const username = ''
const password = ''

// -------------------------------------------------------------------
// The first time you login a new device will be confirmed.

await signIn(client, {
	username,
	password,
})

console.log('---------------------------------')
console.log('First time logged in successfully')
console.log('---------------------------------')

// -------------------------------------------------------------------
// The second time you login the device will need to be verified.
await signIn(client, {
	username,
	password,
})

console.log('----------------------------------')
console.log('Second time logged in successfully')
console.log('----------------------------------')

// -------------------------------------------------------------------
// When your already logged in, you can get the session at any time.

const session = await getSession(client)

console.log('----------------------------------')
console.log('User Session')
console.log(session.user)
console.log('----------------------------------')
