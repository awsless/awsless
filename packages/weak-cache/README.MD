[![npm version](https://img.shields.io/npm/dw/@awsless/weak-cache)](https://www.npmjs.org/package/@awsless/weak-cache)
[![npm version](https://img.shields.io/npm/v/@awsless/weak-cache.svg?style=flat-square)](https://www.npmjs.org/package/@awsless/weak-cache)
[![license](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)

# weak-cache

The @awsless/weak-cache package provides a fully typed simple cache that works with the JS garbage collection (GC). It uses weak references (and finalization registry) to allow GC to remove the cached data as part of the normal GC cycles, but still continue to provide cached access to the data as long as it still resides in memory and hasn't been collected.


## Setup

Install with (NPM):

```
npm i @awsless/weak-cache
```


## Basic Usage

```ts
import { WeakCache } from '@awsless/weak-cache';

// Create new WeakCache instance
const cache = new WeakCache<string, object>();

// Cache an empty object
cache.set('key', {});

// Return the object above as long as it is still cached
console.log(cache.get('key'));

// Return a boolean if the object above still exists in the cache
console.log(cache.has('key'));

// Delete a cached item
console.log(cache.delete('key'));

// Clear the cache
console.log(cache.clear());

// Return the amount of cached items
console.log(cache.size);

// Iterate over the cached items
for(const [ key, value ] of cache) {
	...
}

```


## API

### set(key, value)
Sets or inserts the value into the cache, with the given key.

### get(key, defaultValue?)
Returns the value referenced by the given key. If the value is no longer cached, will return undefined or the provided default value.

### has(key)
Returns a boolean indicating whether the cache with the specified key exists or not and still resided in memory and hasn't been collected.

### delete(key)
Delete the value referenced by the given key.

### clear()
Clear the entire cache

### size
Return the amount of cached items that still resided in memory and hasn't been collected.

### keys()
Return a iterable with keys of the cache

### values()
Return a iterable with values of the cache

### entries()
Return a iterable with both keys and values of the cache


## License

MIT
