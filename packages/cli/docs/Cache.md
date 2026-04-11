# Cache Feature

The Cache feature in Awsless provides a streamlined way to define, configure, and use Amazon MemoryDB for Redis clusters. It handles the complex aspects of cache setup including cluster configuration, security groups, subnet groups, and VPC integration.

## Overview

In-memory caching is essential for high-performance applications. The Cache feature in Awsless makes it easy to:

- Define Redis clusters with optimal configurations
- Configure cluster size, shards, and replicas
- Set up proper security groups and subnet groups
- Integrate caches with your VPC
- Access cache clusters from Lambda functions
- Use type-safe cache operations from your application code

## Schema

The Cache feature uses a simple schema to define caches in your stack:

### Basic Usage

The simplest way to define a cache is with default settings:

```json
{
  "caches": {
    "sessions": {}
  }
}
```

### Advanced Configuration

For more control, you can use the full configuration object:

```json
{
  "caches": {
    "sessions": {
      "type": "r6g.xlarge",
      "port": 6379,
      "shards": 2,
      "replicasPerShard": 2,
      "engine": "7.0",
      "dataTiering": false
    }
  }
}
```

### Schema Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `type` | String | Instance type for the cache nodes | `t4g.small` |
| `port` | Number | Port number for the cache cluster | `6379` |
| `shards` | Number | Number of shards in the cluster | `1` |
| `replicasPerShard` | Number | Number of replica nodes per shard | `1` |
| `engine` | String | Redis engine version | `7.0` |
| `dataTiering` | Boolean | Enable data tiering | `false` |

#### Available Instance Types

The `type` property can be one of the following values:

**General Purpose**
- `t4g.small`
- `t4g.medium`

**Memory Optimized**
- `r6g.large`
- `r6g.xlarge`
- `r6g.2xlarge`
- `r6g.4xlarge`
- `r6g.8xlarge`
- `r6g.12xlarge`
- `r6g.16xlarge`

**Memory Optimized with Data Tiering**
- `r6gd.xlarge`
- `r6gd.2xlarge`
- `r6gd.4xlarge`
- `r6gd.8xlarge`

## How Caches Work

When you define a cache in Awsless:

1. A MemoryDB for Redis cluster is created with your specified configuration
2. A subnet group is created to place the cache in your VPC's private subnets
3. A security group is created to control access to the cache
4. The cache endpoint and port are exposed as environment variables to your functions
5. Type definitions are generated for type-safe cache operations

## VPC Integration

Caches are always deployed within your VPC's private subnets for security. To access a cache, your Lambda functions must be placed in the VPC:

```json
{
  "functions": {
    "api": {
      "code": {
        "file": "./src/api.ts"
      },
      "vpc": true
    }
  }
}
```

## Type-Safe Cache Operations

One of the key benefits of the Cache feature is type-safe cache operations from your application code. When you run `pnpm awsless dev`, Awsless generates TypeScript definitions for all your caches, allowing you to access them with full type safety:

```typescript
import { Cache } from '@awsless/awsless'

// Use the cache with a callback
const result = await Cache.myStack.sessions(async redis => {
  // Perform Redis operations
  await redis.set('user:123', JSON.stringify({ name: 'John' }))
  const user = await redis.get('user:123')
  return JSON.parse(user)
})

// Use the cache with options
const result = await Cache.myStack.sessions({
  timeout: 5000,
  retries: 3
}, async redis => {
  // Perform Redis operations
  return await redis.get('user:123')
})
```

## Environment Variables

For each cache, Awsless automatically sets the following environment variables in your Lambda functions:

```
CACHE_STACKNAME_CACHENAME_HOST=your-cache-endpoint.amazonaws.com
CACHE_STACKNAME_CACHENAME_PORT=6379
```

You can use these environment variables to connect to the cache directly:

```typescript
import { Cluster } from '@awsless/redis'

const redis = new Cluster({
  host: process.env.CACHE_MYSTACK_SESSIONS_HOST,
  port: parseInt(process.env.CACHE_MYSTACK_SESSIONS_PORT || '6379'),
})

// Perform Redis operations
await redis.set('key', 'value')
const value = await redis.get('key')
```

## Sizing Considerations

When choosing the instance type, number of shards, and replicas, consider:

1. **Memory Requirements**: Choose an instance type with enough memory for your data
2. **Performance Requirements**: More shards provide higher throughput
3. **Availability Requirements**: More replicas provide higher availability
4. **Cost Considerations**: Larger instances and more nodes increase cost

## Data Tiering

For workloads with large datasets but infrequent access patterns, you can enable data tiering with the `r6gd` instance types. Data tiering allows MemoryDB to store less frequently accessed data on SSD storage, which is more cost-effective than DRAM.

To enable data tiering:

```json
{
  "caches": {
    "analytics": {
      "type": "r6gd.xlarge",
      "dataTiering": true
    }
  }
}
```

## Best Practices

When using the Cache feature, consider these best practices:

1. **Right-Size Your Cache**: Choose the appropriate instance type and number of shards for your workload
2. **Use Replicas for High Availability**: Configure at least one replica per shard for production workloads
3. **Implement Cache Strategies**: Use appropriate caching strategies (TTL, LRU, etc.) in your application code
4. **Monitor Cache Metrics**: Watch for memory usage, CPU utilization, and cache hit rates
5. **Handle Cache Failures**: Implement fallback mechanisms for cache failures
6. **Secure Cache Access**: Only allow access from authorized functions and services

## Integration with Other Features

The Cache feature integrates seamlessly with other Awsless features:

- **Function**: Lambda functions can access caches when placed in the VPC
- **VPC**: Caches are deployed in the VPC's private subnets
- **Table**: DynamoDB tables can be used alongside caches for a multi-tier data architecture
- **Queue**: SQS queues can be used for asynchronous cache population
- **Task**: Tasks can be used for cache maintenance operations
