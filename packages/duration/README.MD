# @awsless/duration

The @awsless/duration package provides utility functions for handling readable duration values in API's.

## The Problem

API designers traditionally have two choices when modeling an duration values.
Imagine the follow `ttl` prop inside an API.

```ts
type API = {
	ttl: number
}
```

The problem with this design is that it's not clear what unit the `ttl` prop is without reading the docs.

A way around this issue is to include the unit inside the prop name.

```ts
type API = {
	ttlInSeconds: number
}
```

The problem with this design is that it's overly verbose.
But even more importantly in both examples the API consumer can't easily pass in values in unit's other then seconds.
Imagine providing the API an `ttl` of 1 week.

```ts
api({
	ttl: 60 * 60 * 24 * 7,
})
```

## The Solution / Basic Usage

### Defining your API

```ts
import { toSeconds, Duration } from '@awsless/duration'

type Props = {
	ttl: Duration
}

const api = (props: Props) => {
	// When using a duration type you need to cast it to a spesific unit.
	// In this example we want the ttl in seconds.
	const ttl = toSeconds(props.ttl)
}
```

### Consuming your API

```ts
import { weeks } from '@awsless/duration'

// Even tho the ttl is used in seconds, we can still pass in any duration unit we want.
api({ ttl: weeks(1) })
```

## String Parsing

We also expose an `parse` function to parse a string representation of a duration value.

```ts
import { parse } from '@awsless/duration'

const duration = parse('1 day')
```
