# Search Feature

The Search feature in Awsless provides a streamlined way to define, configure, and use Amazon OpenSearch Service domains. It handles the complex aspects of search setup including domain configuration, instance types, storage, and access policies.

## Overview

Full-text search is essential for many applications. The Search feature in Awsless makes it easy to:

- Define OpenSearch domains with optimal configurations
- Configure instance types, counts, and storage
- Set up proper access policies
- Integrate search with your application
- Use type-safe search operations from your application code

## Schema

The Search feature uses a simple schema to define search domains in your stack:

### Basic Usage

The simplest way to define a search domain is with default settings:

```json
{
  "searchs": {
    "content": {}
  }
}
```

### Advanced Configuration

For more control, you can use the full configuration object:

```json
{
  "searchs": {
    "content": {
      "type": "r5.large",
      "count": 2,
      "version": "2.13",
      "storage": "50 GB"
    }
  }
}
```

### Schema Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `type` | String | Instance type for the search nodes | `t3.small` |
| `count` | Number | Number of instances in the domain | `1` |
| `version` | String | OpenSearch version | `2.13` |
| `storage` | String | Storage size for the domain | `10 GB` |

#### Available Instance Types

The `type` property can be one of many values, including:

**General Purpose**
- `t3.small`, `t3.medium`
- `m5.large`, `m5.xlarge`, `m5.2xlarge`, `m5.4xlarge`, `m5.12xlarge`, `m5.24xlarge`
- `m6g.large`, `m6g.xlarge`, `m6g.2xlarge`, `m6g.4xlarge`, `m6g.8xlarge`, `m6g.12xlarge`

**Compute Optimized**
- `c5.large`, `c5.xlarge`, `c5.2xlarge`, `c5.4xlarge`, `c5.9xlarge`, `c5.18xlarge`

**Memory Optimized**
- `r5.large`, `r5.xlarge`, `r5.2xlarge`, `r5.4xlarge`, `r5.12xlarge`, `r5.24xlarge`
- `r6g.large`, `r6g.xlarge`, `r6g.2xlarge`, `r6g.4xlarge`, `r6g.8xlarge`, `r6g.12xlarge`
- `r6gd.large`, `r6gd.xlarge`, `r6gd.2xlarge`, `r6gd.4xlarge`, `r6gd.8xlarge`, `r6gd.12xlarge`, `r6gd.16xlarge`

**Storage Optimized**
- `i3.large`, `i3.xlarge`, `i3.2xlarge`, `i3.4xlarge`, `i3.8xlarge`, `i3.16xlarge`

**UltraWarm**
- `ultrawarm1.medium`, `ultrawarm1.large`, `ultrawarm1.xlarge`

#### Available Versions

The `version` property can be one of the following values:
- `2.13` (default)
- `2.11`
- `2.9`
- `2.7`
- `2.5`
- `2.3`
- `1.3`

## How Search Works

When you define a search domain in Awsless:

1. An OpenSearch domain is created with your specified configuration
2. Access policies are set up to allow Lambda functions to access the domain
3. The domain endpoint is exposed as an environment variable to your functions
4. Type definitions are generated for type-safe search operations

## Type-Safe Search Operations

One of the key benefits of the Search feature is type-safe search operations from your application code. When you run `pnpm awsless dev`, Awsless generates TypeScript definitions for all your search domains, allowing you to access them with full type safety:

```typescript
import { Search } from '@awsless/awsless'

// Define a table schema
const usersTable = Search.myStack.content.defineTable('users', {
  id: 'string',
  name: 'string',
  email: 'string',
  age: 'number',
  tags: 'string[]',
  active: 'boolean',
  createdAt: 'date'
})

// Index a document
await usersTable.index({
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  tags: ['premium', 'active'],
  active: true,
  createdAt: new Date()
})

// Search for documents
const results = await usersTable.search({
  query: {
    bool: {
      must: [
        { term: { active: true } },
        { range: { age: { gte: 18 } } }
      ],
      should: [
        { match: { name: 'John' } },
        { terms: { tags: ['premium'] } }
      ]
    }
  },
  sort: [
    { createdAt: 'desc' }
  ],
  size: 10
})

// Get a document by ID
const user = await usersTable.get('123')

// Delete a document
await usersTable.delete('123')
```

## Environment Variables

For each search domain, Awsless automatically sets the following environment variables in your Lambda functions:

```
SEARCH_STACKNAME_DOMAINNAME_DOMAIN=your-domain-endpoint.amazonaws.com
```

You can use these environment variables to connect to the search domain directly:

```typescript
import { Client } from '@opensearch-project/opensearch'

const client = new Client({
  node: `https://${process.env.SEARCH_MYSTACK_CONTENT_DOMAIN}`
})

// Perform OpenSearch operations
const response = await client.search({
  index: 'users',
  body: {
    query: {
      match: {
        name: 'John'
      }
    }
  }
})
```

## Sizing Considerations

When choosing the instance type, count, and storage, consider:

1. **Data Size**: Choose storage size based on your data volume
2. **Query Volume**: Choose instance type and count based on your query volume
3. **Indexing Volume**: Consider write-heavy workloads when choosing instance types
4. **Availability Requirements**: Use at least 2 instances for production workloads
5. **Cost Considerations**: Larger instances and more nodes increase cost

## Best Practices

When using the Search feature, consider these best practices:

1. **Right-Size Your Domain**: Choose the appropriate instance type, count, and storage for your workload
2. **Use Multiple Instances for Production**: Configure at least 2 instances for high availability
3. **Implement Index Lifecycle Management**: Set up index rotation and retention policies
4. **Monitor Search Metrics**: Watch for CPU utilization, JVM memory pressure, and disk usage
5. **Optimize Query Performance**: Use appropriate mappings, analyzers, and query structures
6. **Secure Search Access**: Only allow access from authorized functions and services

## Integration with Other Features

The Search feature integrates seamlessly with other Awsless features:

- **Function**: Lambda functions can access search domains
- **Task**: Tasks can perform background indexing operations
- **Queue**: Queue consumers can process and index data
- **Topic**: Topic subscribers can index events
- **Table**: DynamoDB tables can be synchronized with search indices
