# SvelteKit Site Feature

The SvelteKit Site feature in Awsless provides a streamlined way to deploy SvelteKit applications to AWS. It handles the complex aspects of deployment including CloudFront distribution, S3 bucket configuration, Lambda functions for server-side rendering, and custom domain setup.

## Overview

SvelteKit is a framework for building web applications with Svelte. The SvelteKit Site feature in Awsless makes it easy to:

- Deploy SvelteKit applications to AWS
- Configure CloudFront for content delivery
- Set up S3 for static assets
- Deploy Lambda functions for server-side rendering
- Configure custom domains with SSL certificates
- Set up CORS and security headers
- Customize error responses

## Schema

The SvelteKit Site feature uses a simple schema to define sites in your stack:

### Basic Usage

The simplest way to define a SvelteKit site is with static assets only:

```json
{
  "sites": {
    "web": {
      "static": "./build",
      "domain": "example-domain",
      "subDomain": "www"
    }
  }
}
```

### Advanced Configuration

For more control, you can use the full configuration object:

```json
{
  "sites": {
    "web": {
      "static": "./build",
      "ssr": {
        "code": {
          "file": "./build/handler.js"
        },
        "memorySize": "512 MB",
        "timeout": "10 seconds"
      },
      "origin": "ssr-first",
      "domain": "example-domain",
      "subDomain": "www",
      "errors": {
        "404": "./build/404.html",
        "500": {
          "path": "./build/500.html",
          "statusCode": 500,
          "minTTL": "5 minutes"
        }
      },
      "cors": {
        "origins": ["*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "headers": ["Content-Type", "Authorization"],
        "maxAge": "1 day",
        "credentials": true
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
| `static` | String | Path to the static assets directory | - |
| `ssr` | Object | Lambda function configuration for server-side rendering | - |
| `origin` | String | Origin selection strategy (`ssr-first` or `static-first`) | `static-first` |
| `domain` | String | Domain ID to link your site with | - |
| `subDomain` | String | Subdomain for your site | - |
| `errors` | Object | Custom error responses for HTTP status codes | - |
| `cors` | Object | CORS configuration | - |
| `cache` | Object | CloudFront cache configuration | - |

#### SSR Configuration

The `ssr` property accepts a Lambda function configuration:

```json
"ssr": {
  "code": {
    "file": "./build/handler.js"
  },
  "memorySize": "512 MB",
  "timeout": "10 seconds",
  "environment": {
    "NODE_ENV": "production"
  }
}
```

#### Origin Selection

The `origin` property determines how CloudFront routes requests:

- `ssr-first`: Tries the SSR Lambda first, falls back to static assets if the Lambda returns 403 or 404
- `static-first`: Tries static assets first, falls back to SSR Lambda if the asset is not found

#### Error Responses

The `errors` property allows you to customize error responses for specific HTTP status codes:

```json
"errors": {
  "404": "./build/404.html",
  "500": {
    "path": "./build/500.html",
    "statusCode": 500,
    "minTTL": "5 minutes"
  }
}
```

Each error can be a simple path string or an object with:
- `path`: Path to the error page
- `statusCode`: HTTP status code to return (optional)
- `minTTL`: Minimum time to cache the error response (optional)

#### CORS Configuration

The `cors` property allows you to configure CORS headers:

```json
"cors": {
  "override": false,
  "maxAge": "365 days",
  "exposeHeaders": ["Content-Length"],
  "credentials": true,
  "headers": ["*"],
  "origins": ["*"],
  "methods": ["GET", "POST", "OPTIONS"]
}
```

#### Cache Configuration

The `cache` property allows you to configure CloudFront caching behavior:

```json
"cache": {
  "cookies": ["session"],
  "headers": ["Authorization"],
  "queries": ["version"]
}
```

## How SvelteKit Sites Work

When you define a SvelteKit site in Awsless:

1. Static assets are uploaded to an S3 bucket
2. A Lambda function is created for server-side rendering (if `ssr` is specified)
3. A CloudFront distribution is created to serve the site
4. CloudFront is configured to route requests to the appropriate origin
5. If a domain is specified, a Route 53 record is created to point to the CloudFront distribution

## Deployment Process

The deployment process for a SvelteKit site involves:

1. Building your SvelteKit application with the adapter-node or adapter-static
2. Configuring your site in your stack file
3. Deploying your stack with Awsless

### Building Your SvelteKit Application

To build your SvelteKit application for deployment:

```bash
# Install dependencies
npm install

# Build the application
npm run build
```

### Configuring Your Site

Configure your site in your stack file:

```json
{
  "sites": {
    "web": {
      "static": "./build",
      "ssr": {
        "code": {
          "file": "./build/handler.js"
        }
      },
      "domain": "example-domain",
      "subDomain": "www"
    }
  }
}
```

### Deploying Your Site

Deploy your site with Awsless:

```bash
pnpm awsless deploy
```

## Environment Variables

For each site, Awsless automatically sets the following environment variables:

```
SITE_STACKNAME_SITENAME_ENDPOINT=your-site-endpoint.com
```

You can use these environment variables in your application code or other AWS resources.

## Best Practices

When using the SvelteKit Site feature, consider these best practices:

1. **Use Static Prerendering**: Prerender pages that don't need dynamic data
2. **Optimize Assets**: Minimize and compress static assets
3. **Configure Caching**: Set appropriate cache headers for static assets
4. **Use Custom Error Pages**: Create custom error pages for a better user experience
5. **Implement CORS Correctly**: Configure CORS headers based on your application's needs
6. **Monitor Performance**: Set up monitoring for your site's performance
7. **Use Environment Variables**: Store configuration in environment variables

## Integration with Other Features

The SvelteKit Site feature integrates seamlessly with other Awsless features:

- **Domain**: Custom domains can be used for your site
- **Function**: Lambda functions can be used for server-side rendering
- **Store**: S3 buckets can be used for static assets
- **Config**: Configuration values can be used in your site
