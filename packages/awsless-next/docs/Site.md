# Site Feature

The Site feature in Awsless provides a streamlined way to define, configure, and deploy web applications using AWS S3, CloudFront, and Lambda@Edge. It handles the complex aspects of website hosting including static file serving, server-side rendering (SSR), CDN distribution, and custom domains.

## Overview

Web hosting is a fundamental requirement for most applications. The Site feature in Awsless makes it easy to:

- Deploy static websites with S3
- Implement server-side rendering with Lambda functions
- Configure CloudFront CDN for global distribution
- Set up custom domains with SSL certificates
- Configure CORS and security headers
- Customize error responses
- Optimize caching for performance

## Schema

The Site feature uses a simple schema to define websites in your stack:

### Basic Usage

The simplest way to define a static website is by specifying a directory of static files:

```json
{
  "sites": {
    "marketing": {
      "static": "./dist"
    }
  }
}
```

### Advanced Configuration

For more control, you can use the full configuration object:

```json
{
  "sites": {
    "app": {
      "domain": "example-domain",
      "subDomain": "app",
      "static": "./dist",
      "ssr": "./src/server.ts",
      "origin": "static-first",
      "errors": {
        "404": "./dist/404.html",
        "500": {
          "path": "./dist/error.html",
          "statusCode": 200,
          "minTTL": "5 minutes"
        }
      },
      "cors": {
        "origins": ["https://example.com"],
        "methods": ["GET", "POST"],
        "headers": ["Content-Type", "Authorization"],
        "credentials": true,
        "maxAge": "1 day"
      },
      "cache": {
        "cookies": ["session"],
        "headers": ["Authorization"],
        "queries": ["version"]
      }
    }
  }
}
```

### Schema Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `domain` | String | Domain ID to link your site with | - |
| `subDomain` | String | Subdomain for your site | - |
| `static` | String/Boolean | Path to static files directory or true to create an S3 bucket | - |
| `ssr` | Object/String | Lambda function for server-side rendering | - |
| `origin` | String | Origin fallback ordering (`ssr-first` or `static-first`) | `static-first` |
| `errors` | Object | Custom error responses for HTTP status codes | - |
| `cors` | Object | CORS configuration | - |
| `security` | Object | Security headers configuration | - |
| `cache` | Object | Cache configuration for CloudFront | - |

#### Error Response Properties

Each error code (400, 403, 404, etc.) can be configured with:

- A string path to an error page
- An object with:
  - `path`: Path to the error page
  - `statusCode`: HTTP status code to return
  - `minTTL`: Minimum time to cache the error response

#### CORS Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `override` | Boolean | Override default CORS settings | `false` |
| `maxAge` | String | Duration for browsers to cache CORS response | `365 days` |
| `exposeHeaders` | String[] | Headers to expose to the browser | - |
| `credentials` | Boolean | Allow credentials (cookies, auth headers) | `false` |
| `headers` | String[] | Allowed headers | `["*"]` |
| `origins` | String[] | Allowed origins | `["*"]` |
| `methods` | String[] | Allowed HTTP methods | `["ALL"]` |

#### Cache Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `cookies` | String[] | Cookies to include in the cache key | - |
| `headers` | String[] | Headers to include in the cache key | - |
| `queries` | String[] | Query parameters to include in the cache key | - |

## How Sites Work

When you define a site in Awsless:

### Static Sites

1. An S3 bucket is created to store your static files
2. Files from the specified directory are uploaded to the bucket
3. A CloudFront distribution is created to serve the files
4. Cache policies and origin request policies are configured
5. If a domain is specified, Route 53 records are created

### Server-Side Rendering (SSR)

1. A Lambda function is created from your SSR code
2. A Lambda function URL is created to invoke the function
3. A CloudFront distribution is configured to use the Lambda as an origin
4. Origin access controls are set up for secure communication
5. If static files are also specified, origin failover is configured

### Origin Failover

When both static and SSR are configured, you can specify the origin fallback ordering:

- `static-first`: Try to serve from S3 first, then fall back to SSR
- `ssr-first`: Try to serve from SSR first, then fall back to static files

This is useful for hybrid applications where some pages are static and others require server-side rendering.

## Custom Domains

You can configure your site to use a custom domain by specifying the `domain` and `subDomain` properties. The domain must be defined in your app configuration and have a valid SSL certificate.

For example, if you specify:

```json
{
  "domain": "example-domain",
  "subDomain": "app"
}
```

Your site will be available at `https://app.example.com`.

## Error Handling

You can customize error responses for specific HTTP status codes:

```json
{
  "errors": {
    "404": "./dist/404.html",
    "500": {
      "path": "./dist/error.html",
      "statusCode": 200,
      "minTTL": "5 minutes"
    }
  }
}
```

This allows you to provide a better user experience when errors occur.

## Caching

The Site feature automatically configures optimal caching for different file types:

- HTML, JSON, and manifest files: `s-maxage=31536000, max-age=0` (cached at CDN, not in browser)
- Other static assets: `public, max-age=31536000, immutable` (cached everywhere for 1 year)

You can further customize caching by specifying which cookies, headers, and query parameters should be included in the cache key:

```json
{
  "cache": {
    "cookies": ["session"],
    "headers": ["Authorization"],
    "queries": ["version"]
  }
}
```

## CORS Configuration

Cross-Origin Resource Sharing (CORS) can be configured to control which domains can access your site:

```json
{
  "cors": {
    "origins": ["https://example.com"],
    "methods": ["GET", "POST"],
    "headers": ["Content-Type", "Authorization"],
    "credentials": true,
    "maxAge": "1 day"
  }
}
```

## Server-Side Rendering

The SSR function receives HTTP requests from CloudFront and returns responses:

```typescript
export default async function(event: {
  version: string;
  rawPath: string;
  rawQueryString: string;
  headers: Record<string, string>;
  requestContext: {
    http: {
      method: string;
      path: string;
    };
  };
  body?: string;
}) {
  // Process the request
  const path = event.rawPath;
  const method = event.requestContext.http.method;

  // Return a response
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'max-age=0, s-maxage=86400'
    },
    body: '<html><body>Hello, World!</body></html>'
  };
}
```

## Best Practices

When using the Site feature, consider these best practices:

1. **Optimize Static Assets**: Minify and compress static files before deployment
2. **Use Appropriate Caching**: Configure caching based on content update frequency
3. **Implement Error Pages**: Provide helpful error pages for common HTTP status codes
4. **Consider Origin Failover**: Choose the appropriate origin failover strategy
5. **Secure Your Site**: Configure appropriate CORS and security headers
6. **Monitor Performance**: Use CloudWatch to monitor site performance and errors
7. **Test Thoroughly**: Test your site across different browsers and devices

## Integration with Other Features

The Site feature integrates seamlessly with other Awsless features:

- **Function**: SSR is implemented as a Lambda function
- **Domain**: Custom domains can be used for sites
- **Auth**: Authentication can be integrated with sites
- **GraphQL**: GraphQL APIs can be accessed from sites
- **RPC**: RPC endpoints can be called from sites
