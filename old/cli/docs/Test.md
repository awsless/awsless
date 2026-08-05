# Test Feature

The Test feature in Awsless provides a streamlined way to define and run tests for your serverless application. It allows you to organize tests by stack and run them using the Awsless CLI.

## Overview

Testing is essential for ensuring the reliability of your serverless applications. The Test feature in Awsless makes it easy to:

- Define test locations for your stacks
- Organize tests by functionality
- Run tests using the Awsless CLI
- Integrate with your CI/CD pipeline

## Schema

The Test feature uses a simple schema to define test locations in your stack:

### Basic Usage

The simplest way to define tests is by specifying a single directory:

```json
{
  "tests": "./test"
}
```

### Multiple Test Directories

For more complex applications, you can specify multiple test directories:

```json
{
  "tests": [
    "./test/unit",
    "./test/integration",
    "./test/e2e"
  ]
}
```

### Schema Properties

The `tests` property can be either a string path to a directory or an array of string paths to directories.

## How Tests Work

When you define tests in Awsless:

1. The test directories are registered with the Awsless CLI
2. You can run tests using the `awsless test` command
3. Tests are executed in the specified directories
4. Test results are reported to the console

## Test Organization

Tests are organized by stack, allowing you to structure your tests according to your application's architecture:

```json
// auth/stack.json
{
  "name": "auth",
  "tests": "./test/auth"
}

// api/stack.json
{
  "name": "api",
  "tests": "./test/api"
}

// frontend/stack.json
{
  "name": "frontend",
  "tests": "./test/frontend"
}
```

## Running Tests

You can run tests using the Awsless CLI:

```bash
# Run all tests
pnpm awsless test

# Run tests for a specific stack
pnpm awsless test --stack auth

# Run tests with a specific pattern
pnpm awsless test --pattern "*.spec.ts"
```

## Test Implementation

Awsless doesn't impose any specific testing framework or methodology. You can use any testing framework that works with Node.js, such as Jest, Mocha, or Vitest.

### Example Test File

```typescript
// test/auth/login.test.ts
import { describe, it, expect } from 'vitest';
import { Auth } from '@awsless/awsless';

describe('Auth Login', () => {
  it('should authenticate a user with valid credentials', async () => {
    const result = await Auth.login('user@example.com', 'password123');
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
  });

  it('should reject a user with invalid credentials', async () => {
    await expect(
      Auth.login('user@example.com', 'wrongpassword')
    ).rejects.toThrow('Invalid credentials');
  });
});
```

## Mocking AWS Services

When testing serverless applications, you often need to mock AWS services. Awsless provides built-in mocking capabilities for its features:

```typescript
// test/table/user.test.ts
import { describe, it, expect } from 'vitest';
import { Table } from '@awsless/awsless';

describe('User Table', () => {
  beforeEach(() => {
    // Mock the user table
    Table.mock.api.users.set({
      'user-1': {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com'
      }
    });
  });

  it('should get a user by id', async () => {
    const user = await Table.api.users.get('user-1');
    expect(user).toEqual({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com'
    });
  });

  it('should return undefined for non-existent user', async () => {
    const user = await Table.api.users.get('user-999');
    expect(user).toBeUndefined();
  });
});
```

## Integration with CI/CD

You can integrate Awsless tests with your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run awsless test
```

## Best Practices

When using the Test feature, consider these best practices:

1. **Organize Tests by Stack**: Keep tests organized according to your stack structure
2. **Write Different Test Types**: Include unit, integration, and end-to-end tests
3. **Mock AWS Services**: Use mocking to avoid actual AWS calls during tests
4. **Test Edge Cases**: Include tests for error conditions and edge cases
5. **Keep Tests Fast**: Optimize tests to run quickly for better developer experience
6. **Use Test Coverage**: Track test coverage to ensure comprehensive testing
7. **Automate Testing**: Integrate tests with your CI/CD pipeline

## Integration with Other Features

The Test feature integrates seamlessly with other Awsless features:

- **Function**: Test Lambda functions with mocked events
- **Table**: Test DynamoDB operations with mocked tables
- **Queue**: Test SQS message processing with mocked queues
- **Topic**: Test SNS message publishing with mocked topics
- **Auth**: Test authentication flows with mocked Cognito
