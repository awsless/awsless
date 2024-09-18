
# File hash for js & ts files.

Attempt to create a hash from an js/ts file and all it's dependecies.
The goal is to generate a new hash when ever the file or it's dependecies change.

```ts

const workspace = await loadWorkspace('.')
const hash = await generateFileHash(workspace, "./file.ts")

```
