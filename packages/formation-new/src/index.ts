// Formation Core
export { App } from './formation/app.ts'
export { Group } from './formation/group.ts'
export { Stack } from './formation/stack.ts'
export { Output, output, deferredOutput } from './formation/output.ts'
export { findInputDeps, resolveInputs } from './formation/input.ts'
export { Future } from './formation/future.ts'
export { createDebugger, enableDebug } from './formation/debug.ts'

export { WorkSpace } from './formation/workspace/workspace.ts'
export * from './formation/workspace/error.ts'

export * from './formation/backend/memory/state.ts'
export * from './formation/backend/memory/lock.ts'
export * from './formation/backend/file/state.ts'
export * from './formation/backend/file/lock.ts'
export * from './formation/backend/aws/s3-state.ts'
export * from './formation/backend/aws/dynamodb-lock.ts'

// types
export type { URN } from './formation/urn.ts'
export type { Resource, ResourceMeta, ResourceClass, ResourceConfig } from './formation/resource.ts'
export type { DataSource, DataSourceMeta, DataSourceFunction } from './formation/data-source.ts'
export type { Provider, CreateProps, UpdateProps, DeleteProps, GetDataProps, GetProps } from './formation/provider.ts'
export type { Input, OptionalInput } from './formation/input.ts'
export type { OptionalOutput } from './formation/output.ts'

export type { WorkSpaceOptions, ProcedureOptions } from './formation/workspace/workspace.ts'

export type * from './formation/backend/state.ts'
export type * from './formation/backend/lock.ts'

// globals
import './formation/globals.ts'

// Terraform Package
export { Terraform } from './terraform/installer.ts'
export { $ } from './terraform/resource.ts'

// Custom Package
export { createCustomResourceClass } from './custom/resource.ts'
export { createCustomProvider } from './custom/provider.ts'
export type { CustomResourceProvider } from './custom/provider.ts'
