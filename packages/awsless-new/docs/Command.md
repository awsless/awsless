# Command Feature

The Command feature in Awsless provides a streamlined way to define and implement custom CLI commands for your application. It allows you to extend the Awsless CLI with project-specific commands that can perform various tasks.

## Overview

Custom commands are essential for automating project-specific tasks. The Command feature in Awsless makes it easy to:

- Define custom CLI commands for your application
- Implement command handlers in TypeScript or JavaScript
- Add descriptions to help users understand command purposes
- Organize commands by stack for better maintainability
- Execute commands using the Awsless CLI

## Schema

The Command feature uses a simple schema to define custom commands in your stack:

### Basic Usage

The simplest way to define a command is by specifying a file path:

```json
{
  "commands": {
    "generate-data": "./src/commands/generate-data.ts"
  }
}
```

### Advanced Configuration

For more control, you can use the full configuration object:

```json
{
  "commands": {
    "generate-data": {
      "file": "./src/commands/generate-data.ts",
      "handler": "generateData",
      "description": "Generate sample data for development"
    }
  }
}
```

### Schema Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `file` | String | Path to the command handler file | Required |
| `handler` | String | Name of the handler function in the file | `default` |
| `description` | String | Description of the command | - |

## How Commands Work

When you define a command in Awsless:

1. The command is registered with the Awsless CLI
2. The command handler file is loaded when the command is executed
3. The specified handler function is called with command arguments and options
4. The command performs its task and returns a result

## Command Handlers

Command handlers are JavaScript or TypeScript files that export a function to handle the command execution:

### Default Export

```typescript
// src/commands/generate-data.ts
export default async function(args: string[], options: Record<string, any>) {
  console.log('Generating data...');

  // Access command arguments
  const count = parseInt(args[0] || '10');

  // Access command options
  const format = options.format || 'json';
  const output = options.output || 'data.json';

  // Implement command logic
  const data = generateSampleData(count);

  // Write output
  if (format === 'json') {
    await writeJsonFile(output, data);
  } else {
    await writeCsvFile(output, data);
  }

  console.log(`Generated ${count} records in ${format} format at ${output}`);
}

function generateSampleData(count: number) {
  // Generate sample data
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    value: Math.random() * 100
  }));
}

async function writeJsonFile(path: string, data: any) {
  // Write JSON file
  const fs = require('fs/promises');
  await fs.writeFile(path, JSON.stringify(data, null, 2));
}

async function writeCsvFile(path: string, data: any) {
  // Write CSV file
  const fs = require('fs/promises');
  const header = Object.keys(data[0]).join(',');
  const rows = data.map((item: any) => Object.values(item).join(','));
  await fs.writeFile(path, [header, ...rows].join('\n'));
}
```

### Named Export

```typescript
// src/commands/data-utils.ts
export async function generateData(args: string[], options: Record<string, any>) {
  // Command implementation
}

export async function validateData(args: string[], options: Record<string, any>) {
  // Command implementation
}
```

## Executing Commands

You can execute custom commands using the Awsless CLI:

```bash
# Basic command execution
pnpm awsless generate-data

# Command with arguments
pnpm awsless generate-data 100

# Command with options
pnpm awsless generate-data --format csv --output data.csv

# Command with arguments and options
pnpm awsless generate-data 100 --format csv --output data.csv
```

## Command Arguments and Options

Command arguments and options are passed to the handler function:

- **Arguments**: Positional arguments passed to the command
- **Options**: Named options passed to the command with `--` prefix

The handler function receives:

- `args`: An array of string arguments
- `options`: An object containing the parsed options

## Command Organization

Commands are defined at the stack level, allowing you to organize them by functionality:

```json
// auth/stack.json
{
  "name": "auth",
  "commands": {
    "create-user": "./src/commands/create-user.ts",
    "reset-password": "./src/commands/reset-password.ts"
  }
}

// data/stack.json
{
  "name": "data",
  "commands": {
    "import-data": "./src/commands/import-data.ts",
    "export-data": "./src/commands/export-data.ts"
  }
}
```

## Command Naming

Command names must be unique across all stacks in your application. If two stacks define commands with the same name, an error will be thrown during validation.

## Best Practices

When using the Command feature, consider these best practices:

1. **Use Descriptive Names**: Choose command names that clearly indicate their purpose
2. **Add Descriptions**: Include descriptions to help users understand what commands do
3. **Implement Help**: Add help text and usage examples in your command handlers
4. **Handle Errors**: Implement proper error handling in your commands
5. **Provide Feedback**: Use console output to provide feedback on command progress
6. **Support Options**: Implement flexible options to make commands more versatile
7. **Document Commands**: Document your custom commands in your project README

## Integration with Other Features

The Command feature integrates seamlessly with other Awsless features:

- **Function**: Commands can deploy or invoke Lambda functions
- **Table**: Commands can import or export data from DynamoDB tables
- **Store**: Commands can upload or download files from S3 buckets
- **Config**: Commands can set or get configuration values
