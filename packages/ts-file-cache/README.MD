
# @awsless/ts-file-cache

Attempt to create a hash from an js/ts file and all it's dependecies.
The goal is to generate a new hash when ever the file or it's dependecies change.

```ts

const workspace = await loadWorkspace('.')
const hash = await generateFileHash(workspace, "./file.ts")

```

```ts

const workspace = await loadWorkspace('.')
const hash = await generateFolderHash(workspace, "./src")

```

## Known issue's

- When we walk the AST tree with the "swc-walk" package it could fail in some code bases. Right now we just silently fail which could lead to an incorrect cache key.
