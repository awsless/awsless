
# @awsless/ts-file-cache

Attempt to create a hash from an js/ts file and all it's dependecies.
The goal is to generate a new hash when ever the file or it's dependecies change.

Supports pnpm (`pnpm-lock.yaml`) and bun (`bun.lock`) workspaces.
The lock file is auto-detected by walking up from the search path.

```ts

const workspace = await loadWorkspace('.')
const hash = await generateFileHash(workspace, "./file.ts")

```

```ts

const workspace = await loadWorkspace('.')
const hash = await generateFolderHash(workspace, "./src")

```
