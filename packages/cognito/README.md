# @awsless/cognito [![NPM Version](https://img.shields.io/npm/v/@awsless/cognito.svg)](https://www.npmjs.com/package/@awsless/cognito)

Super lightweight AWS Cognito client for both the browser & nodejs. Uses the native web crypto & BigInt features in the browser & we designed the API to be tree shakable to keep the package as small as possible.

_GZip Size: ~12kB_

## Installation

```sh
npm install --save @awsless/cognito

# using yarn:
yarn add @awsless/cognito

# using pnpm:
pnpm install @awsless/cognito
```

# Stores

Depending on your use case you might want to use one of the following stores.

- **MemoryStore** - Mostly used for debugging and when you don't want to persist the login token.

- **LocalStore** - Used to store the login token on the client only.

- **CookieStore** - The CookieStore is useful in scenarios like SSR, when you need access to the login token on the client as well as on the server.

# Examples

## Setup

```js
import { Client, LocalStore } from '@awsless/cognito'

const client = new Client({
	clientId: 'CLIENT_ID',
	userPoolId: 'USER_POOL_ID',
	store: new LocalStore(),
})
```

## Sign Up

```js
import { signUp, confirmSignUp } from '@awsless/cognito'

await signUp(client, {
	email: 'EMAIL',
	username: 'USER',
	password: 'PASS',
})

// Let the user fill in his confirmation code.
await confirmSignUp(client, {
	username: 'USER',
	code: 'SIGN_UP_CONFIRMATION_CODE',
})
```

## Sign In

```js
const session = await signIn(client, {
	username: 'USER',
	password: 'PASS',
})

// Log logged in user.
console.log(session.user)
```

## Sign Out

```js
await signOut(client)
```

## Get Active Login Session

```js
const session = await getSession(client)

// Log access token
console.log(session.accessToken.toString())

// Log ID token
console.log(session.idToken.toString())
```

## Change Password

```js
await changePassword(client, {
	previousPassword: 'PREV_PASS',
	proposedPassword: 'NEW_PASS',
})
```

## Custom Cognito Call

```js
const response = await client.call('API_NAME', {
  ...
});
```

## License

MIT
