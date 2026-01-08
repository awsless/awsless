# Feature: Lambda Managed Instances

We have 3 big issue’s with the current capacity provider implementation from AWS.

## Issues

- We can't change the instance type. ( Maybe this will be solved in the future. )
- There is a max function limit for each capacity provider of 100.
- A lambda can't switch between NORMAL and MANAGED capacity provider type.
- Deployments became slower.

## What are the benefits of using Lambda Managed Instances?

- Potential cost savings
- Removes cold starts.

## Solved issue's

- Only deploy a single function version to the capacity provider.
