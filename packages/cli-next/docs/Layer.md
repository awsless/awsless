# Layer Feature

The Layer feature in Awsless provides a streamlined way to define, configure, and use AWS Lambda Layers. It handles the complex aspects of layer deployment including code bundling, versioning, and integration with Lambda functions.

## Overview

AWS Lambda Layers allow you to centralize common code and dependencies that can be shared across multiple Lambda functions. The Layer feature in Awsless makes it easy to:

- Define reusable code layers for Lambda functions
- Share dependencies across multiple functions
- Reduce the size of your function deployment packages
- Manage layer versions and compatibility
- Specify runtime and architecture compatibility

## Schema

The Layer feature uses a simple schema to define layers in your application's base configuration:

### Basic Usage

The simplest way to define a layer is by providing a file path to a ZIP archive:

```json
{
  "defaults": {
    "layers": {
      "common-utils": "./layers/common-utils.zip"
    }
  }
}
```

### Advanced Configuration

For more control, you can use the full configuration object:

```json
{
  "defaults": {
    "layers": {
      "database-client": {
        "file": "./layers/database-client.zip",
        "runtimes": ["nodejs18.x", "nodejs20.x"],
        "architecture": "arm64",
        "packages": ["pg", "knex", "mysql2"]
      }
    }
  }
}
```

### Schema Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `file` | String | Path to the ZIP file containing the layer code | Required |
| `runtimes` | String[] | Compatible Lambda runtimes | All runtimes |
| `architecture` | String | Compatible CPU architecture (`x86_64` or `arm64`) | Both architectures |
| `packages` | String[] | Package names available in the layer | Layer ID |

## How Layers Work

When you define a layer in Awsless:

1. The layer ZIP file is uploaded to an S3 bucket
2. A Lambda Layer is created with the specified configuration
3. The layer ARN is stored for use by Lambda functions
4. The package list is registered to prevent duplicate bundling

When you reference a layer in a Lambda function:

1. The layer is automatically attached to the function
2. The packages specified in the layer are excluded from the function's bundle
3. The function can access the layer's code and dependencies at runtime

## Layer Structure

A Lambda Layer ZIP file must follow a specific structure:

```
layer.zip
│
├── nodejs/             # For Node.js runtime
│   └── node_modules/   # Node.js dependencies
│       ├── package1/
│       └── package2/
│
├── python/             # For Python runtime
│   └── lib/
│       └── python3.x/  # Python dependencies
│
└── bin/                # Executable files
```

For Node.js layers, the most common structure is:

```
layer.zip
└── nodejs/
    └── node_modules/
        ├── package1/
        └── package2/
```

## Using Layers in Functions

To use a layer in a Lambda function, reference it in the function's configuration:

```json
{
  "functions": {
    "api-handler": {
      "code": {
        "file": "./src/api-handler.ts"
      },
      "layers": ["common-utils", "database-client"]
    }
  }
}
```

When a function uses a layer, the packages specified in the layer's `packages` property are automatically excluded from the function's bundle to avoid duplication.

## Best Practices

When using layers, consider these best practices:

1. **Group Related Dependencies**: Put related dependencies in the same layer
2. **Keep Layers Small**: Focus on specific functionality to minimize size
3. **Version Your Layers**: Use semantic versioning for your layer ZIP files
4. **Test Layer Compatibility**: Ensure your layers work with the specified runtimes
5. **Document Layer Contents**: Keep track of what each layer provides
6. **Consider Cold Start Impact**: Layers can affect cold start times, so use them judiciously
7. **Use Architecture-Specific Layers**: Create separate layers for x86_64 and arm64 if needed

## Integration with Other Features

The Layer feature integrates seamlessly with other Awsless features:

- **Function**: Lambda functions can use layers to access shared code
- **Task**: Tasks can use layers for common background processing code
- **Queue**: Queue consumers can use layers for message processing utilities
- **Topic**: Topic subscribers can use layers for event handling code
- **Cron**: Scheduled tasks can use layers for common utilities
