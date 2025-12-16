# Domain Feature

The Domain feature in Awsless provides a streamlined way to define, configure, and manage custom domains for your application. It handles the complex aspects of domain setup including DNS records, SSL certificates, and email configuration.

## Overview

Custom domains are essential for professional applications, providing branded URLs and email addresses. The Domain feature in Awsless makes it easy to:

- Configure custom domains for your application
- Set up DNS records automatically
- Provision and validate SSL certificates
- Configure email sending capabilities with Amazon SES
- Set up proper DKIM, SPF, and DMARC records for email authentication
- Integrate domains with other Awsless features like RPC APIs

## Schema

The Domain feature uses a simple schema to define domains in your application's base configuration:

### Basic Usage

The simplest way to define a domain is by specifying the domain name:

```json
{
  "defaults": {
    "domains": {
      "main": {
        "domain": "example.com"
      }
    }
  }
}
```

### Advanced Configuration

For more control, you can add custom DNS records:

```json
{
  "defaults": {
    "domains": {
      "main": {
        "domain": "example.com",
        "dns": [
          {
            "name": "www",
            "type": "CNAME",
            "ttl": "5 minutes",
            "records": ["example.com"]
          },
          {
            "type": "TXT",
            "ttl": "5 minutes",
            "records": ["v=spf1 include:_spf.google.com ~all"]
          }
        ]
      }
    }
  }
}
```

### Schema Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `domain` | String | The domain name (e.g., example.com) | Required |
| `dns` | Object[] | Array of DNS record configurations | - |

#### DNS Record Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `name` | String | Subdomain or @ for root domain | Domain name |
| `type` | String | DNS record type (A, AAAA, CNAME, TXT, etc.) | Required |
| `ttl` | String | Time to live for the DNS record | Required |
| `records` | String[] | Values for the DNS record | Required |

## How Domains Work

When you define a domain in Awsless:

1. A Route 53 hosted zone is created for your domain
2. SSL certificates are provisioned in both your region and us-east-1 (for CloudFront)
3. Certificate validation records are automatically added to your hosted zone
4. Email sending capabilities are configured with Amazon SES
5. DKIM, SPF, and DMARC records are set up for email authentication
6. Any custom DNS records you specify are added to the hosted zone

## Email Configuration

The Domain feature automatically configures your domain for sending emails through Amazon SES:

1. The domain is registered as an email identity in SES
2. DKIM records are added to verify domain ownership
3. SPF records are configured to prevent email spoofing
4. DMARC records are set up to specify email authentication policy
5. A mail subdomain is configured for the MAIL FROM domain

This allows you to send emails from your domain (e.g., no-reply@example.com) with proper authentication.

## Using Domains with Other Features

Once you've defined a domain, you can reference it in other features by its ID:

```json
{
  "rpc": {
    "api": {
      "domain": "main",
      "subDomain": "api"
    }
  }
}
```

This would make your API available at `https://api.example.com`.

## Subdomain Support

You can create subdomains by specifying the `subDomain` property when referencing a domain:

```json
{
  "rpc": {
    "api": {
      "domain": "main",
      "subDomain": "api"
    }
  }
}
```

The system will automatically format the full domain name (e.g., `api.example.com`).

## Best Practices

When using domains, consider these best practices:

1. **Use Descriptive Domain IDs**: Choose IDs that reflect the purpose of the domain
2. **Minimize DNS Records**: Only add custom DNS records when necessary
3. **Use Appropriate TTLs**: Set shorter TTLs during development, longer in production
4. **Plan Subdomains Carefully**: Design a consistent subdomain structure
5. **Monitor Domain Health**: Regularly check certificate expiration and DNS propagation
6. **Secure Email Configuration**: Follow email security best practices
7. **Document Domain Usage**: Keep track of which features use which domains

## Integration with Other Features

The Domain feature integrates seamlessly with other Awsless features:

- **RPC**: Custom domains for RPC APIs
- **Site**: Custom domains for static websites
- **GraphQL**: Custom domains for GraphQL APIs
- **REST**: Custom domains for REST APIs
- **Auth**: Custom domains for authentication services
