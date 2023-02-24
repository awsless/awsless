
[![npm version](https://img.shields.io/npm/dw/@awsless/ssm)](https://www.npmjs.org/package/@awsless/ssm)
[![npm version](https://img.shields.io/npm/v/@awsless/ssm.svg?style=flat-square)](https://www.npmjs.org/package/@awsless/ssm)
[![license](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)

Helper functions to fetch parameters from AWS SSM Parameter Store & easily mock the SSM client.

# Basic usage
### Example
```ts
import { ssm } from "@awsless/ssm";

const config = await ssm({
	secret: '/your-ssm-secret-path'
})

console.log(config.secret)
```

### Typed values:
```ts
import { string, float, integer, array, json } from "@awsless/ssm";
```
```ts
import { ssm, integer, json } from "@awsless/ssm";

type JsonStruct = {
	username: string
	password: string
}

const config = await ssm({
	val1: integer('/path-to-int-value'),
	val2: json<JsonStruct>('/path-to-json-value')
})
```

### Expiring cache values
```ts
import { ssm } from "@awsless/ssm";

const config = await ssm({
	secret: '/your-ssm-secret-path'
}, { ttl: 60 })

```

# Mock the SSM Client

```ts
import { ssm, mockSSM } from '@awsless/ssm'

const mock = mockSSM({
	'/path': 'Hi',
})

it('should resolve ssm paths', async () => {
	const result = await ssm({
		value: '/path',
	})

	expect(result).toStrictEqual({
		value: 'Hi',
	})
})

```
