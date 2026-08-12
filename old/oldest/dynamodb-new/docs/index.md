# @awsless/dynamodb Documentation

Welcome to the documentation for the `@awsless/dynamodb` package. This package provides a small and tree-shakable layer around AWS SDK v3, making it easier to work with the DynamoDB API.

## Table of Contents

1. [Introduction](./introduction.md)
   - Overview
   - Key Features
   - Installation

2. [Table Definition](./table-definition.md)
   - Defining Tables
   - Schema Types
   - Primary Keys and Indexes
   - Type Inference

3. [Basic Operations](./basic-operations.md)
   - getItem
   - putItem
   - updateItem
   - deleteItem
   - getIndexedItem

4. [Query Operations](./query-operations.md)
   - query
   - queryAll
   - paginateQuery
   - Key Condition Expressions

5. [Scan Operations](./scan-operations.md)
   - scan
   - scanAll
   - paginateScan

6. [Batch Operations](./batch-operations.md)
   - batchGetItem
   - batchPutItem
   - batchDeleteItem

7. [Transaction Operations](./transaction-operations.md)
   - transactWrite
   - transactPut
   - transactUpdate
   - transactDelete
   - transactConditionCheck

8. [Expression Builders](./expression-builders.md)
   - Condition Expressions
   - Update Expressions
   - Projection Expressions
   - Key Condition Expressions

9. [Schema Types](./schema-types.md)
   - Primitive Types
   - Complex Types
   - Special Types
   - Set Types
   - Enum Types
   - Optional Fields

10. [Testing Utilities](./testing-utilities.md)
    - mockDynamoDB
    - seedTable
    - DynamoDB Server Setup
    - Stream Handling

11. [Advanced Features](./advanced-features.md)
    - Error Handling
    - Debugging
    - Performance Considerations
