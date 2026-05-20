# @awsless/redis

The `awsless/redis` package provides a small and tree-shakable layer around ioredis, to make working with the Redis easier.

## The Problem

- **Namespaced API** - The API is designed to be more clear by namespacing the API functionality by data-type.
- **Tree-shakable** - The API is designed to balance tree-shakability vs providing a fully typed API.
- **Testing** - We provide a local Redis server and mock that will route all Redis requests to your local Redis server.

## Recommended

Make sure to enable `strict` mode inside your tsconfig file, to get the most benefit of the strong typing guarantees that this package has to offer.

## Setup

Install with (NPM):

```
npm i @awsless/redis
```

## Basic Usage

```ts
import { redis, createRedisClient } from '@awsless/redis'

// Define your redis client
const client = createRedisClient({ host, port, db: 0 })

// Insert a value
await redis.string.set(client, 'key', 'value')

// Get a value
const post = await redis.string.get(client, 'key')

// Delete a value
await redis.string.delete(client, 'key')

// Batch
const items = await redis.batch(client, [
	redis.string.get(client, 'key-1'),
	redis.string.get(client, 'key-2'),
	redis.string.get(client, 'key-3'),
])

// Run script
const sub = redis.script.lua`return ${10} - ${5}`
const result = await sub<string>(client)
```

# Local Development / Testing

```ts
import { mockRedis, createRedisClient } from '@awsless/redis'

mockRedis()

it('your test', async () => {
	const client = createRedisClient({ host, port, db: 0 })
	const result = await redis.string.get(client, 'key')
	expect(result).toBe('value')
})
```

# Operation Functions

| Function           | Description                                                   |
| ------------------ | ------------------------------------------------------------- |
| `string.get`       | Get a string value by key                                     |
| `string.set`       | Set a string value with optional TTL and existence conditions |
| `string.has`       | Alias for `key.has`                                           |
| `string.incr`      | Increment a numeric string value by a given amount            |
| `string.decr`      | Decrement a numeric string value by a given amount            |
| `string.append`    | Append text to the end of a string value                      |
| `string.substring` | Read a substring by start and end offsets                     |
| `string.delete`    | Alias for `key.delete`                                        |

| Function             | Description                                       |
| -------------------- | ------------------------------------------------- |
| `array.at`           | Get the value at a list index                     |
| `array.has`          | Check whether a list contains a value             |
| `array.indexOf`      | Find the index of a value in a list               |
| `array.replace`      | Replace the value at a list index                 |
| `array.insertBefore` | Insert a value before a pivot value in a list     |
| `array.insertAfter`  | Insert a value after a pivot value in a list      |
| `array.append`       | Append one or more values to the end of a list    |
| `array.prepend`      | Prepend one or more values to the start of a list |
| `array.pop`          | Remove and return the last item from a list       |
| `array.shift`        | Remove and return the first item from a list      |
| `array.delete`       | Remove matching values from a list                |
| `array.trim`         | Trim a list to the specified start and end range  |
| `array.length`       | Get the number of items in a list                 |
| `array.clear`        | Alias for `key.delete`                            |
| `array.range`        | Get a range of values from a list                 |
| `array.all`          | Get all values from a list                        |
| `array.scan`         | Iterate through a list in fixed-size ranges       |

| Function           | Description                                      |
| ------------------ | ------------------------------------------------ |
| `map.get`          | Get a hash field value                           |
| `map.set`          | Set a hash field value                           |
| `map.has`          | Check whether a hash field exists                |
| `map.incr`         | Increment a numeric hash field by a given amount |
| `map.decr`         | Decrement a numeric hash field by a given amount |
| `map.delete`       | Delete a field from a hash                       |
| `map.length`       | Get the number of fields in a hash               |
| `map.clear`        | Alias for `key.delete`                           |
| `map.all`          | Get all fields and values from a hash            |
| `map.scan`         | Iterate through hash fields and values           |
| `map.ttl.set`      | Set expirations on one or more hash fields       |
| `map.ttl.get`      | Get expiration dates for hash fields             |
| `map.ttl.duration` | Get remaining TTL durations for hash fields      |
| `map.ttl.delete`   | Remove expirations from hash fields              |

| Function     | Description                                                    |
| ------------ | -------------------------------------------------------------- |
| `set.add`    | Add one or more values to a set                                |
| `set.has`    | Check whether a set contains a value                           |
| `set.random` | Get one or more random values from a set without removing them |
| `set.pop`    | Remove and return one or more random values from a set         |
| `set.delete` | Remove one or more values from a set                           |
| `set.length` | Get the number of values in a set                              |
| `set.clear`  | Alias for `key.delete`                                         |
| `set.all`    | Get all values from a set                                      |
| `set.scan`   | Iterate through set values                                     |

| Function                 | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| `sortedSet.add`          | Add one or more scored values to a sorted set         |
| `sortedSet.has`          | Check whether a sorted set contains a value           |
| `sortedSet.score`        | Get the score for a value in a sorted set             |
| `sortedSet.incr`         | Increment the score for a value in a sorted set       |
| `sortedSet.indexOf`      | Get the rank of a value in a sorted set               |
| `sortedSet.random`       | Get one or more random values from a sorted set       |
| `sortedSet.pop`          | Remove and return the lowest or highest scored values |
| `sortedSet.delete`       | Remove one or more values from a sorted set           |
| `sortedSet.length`       | Get the number of values in a sorted set              |
| `sortedSet.clear`        | Alias for `key.delete`                                |
| `sortedSet.all`          | Get all values from a sorted set                      |
| `sortedSet.rangeByRank`  | Read members by their rank positions in a sorted set  |
| `sortedSet.rangeByScore` | Read members whose scores fall between two bounds     |
| `sortedSet.rangeByLex`   | Read members whose values fall between two lexicographical bounds |
| `sortedSet.scan`         | Iterate through sorted set values and scores          |

| Function     | Description                           |
| ------------ | ------------------------------------- |
| `key.has`    | Check whether a key exists            |
| `key.delete` | Delete a key                          |
| `key.type`   | Get the type of value stored at a key |
| `key.rename` | Rename a key                          |

| Function       | Description                              |
| -------------- | ---------------------------------------- |
| `ttl.set`      | Set or update the expiration for a key   |
| `ttl.get`      | Get the expiration date for a key        |
| `ttl.duration` | Get the remaining TTL duration for a key |
| `ttl.delete`   | Remove the expiration from a key         |

| Function         | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| `script.eval`    | Execute a Lua script directly                                |
| `script.evalSha` | Execute a Lua script by SHA hash                             |
| `script.load`    | Load a Lua script into the script cache                      |
| `script.exists`  | Check whether scripts exist in the script cache              |
| `script.flush`   | Flush the script cache                                       |
| `script.define`  | Define a reusable typed Lua script runner                    |
| `script.lua`     | Define a reusable Lua script with template literal arguments |

| Function   | Description                                    |
| ---------- | ---------------------------------------------- |
| `db.flush` | Remove all keys from the current database      |
| `db.size`  | Get the number of keys in the current database |

| Function          | Description                           |
| ----------------- | ------------------------------------- |
| `server.flushAll` | Remove all keys from all databases    |
| `server.swap`     | Swap the contents of two databases    |
| `server.time`     | Get the Redis server time as a `Date` |

## License

MIT
