// Build the whole published dist folder.

import { cp } from 'fs/promises'

await import('./build-bin.ts')
await import('./build-handlers.ts')
await import('./build-json-schema.ts')
await import('./build-test-setup.ts')

await cp('layers', 'dist/layers', { recursive: true })
