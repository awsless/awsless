
# File hash for js & ts files.

Attempt to create a hash from an js file and all it's dependecies.
The goal is to generate a new hash when ever the file or it's dependecies change.

```ts

const hash = await generateFileHash("./file.ts")

```
