import { join } from "path"

export const rootDir = process.cwd()
export const outDir = join(rootDir, '.awsless')
// export const assetDir = join(outDir, 'asset')
// export const configDir = join(outDir, 'config')
export const assemblyDir = join(outDir, 'assembly')
export const assetDir = join(outDir, 'asset')
export const cacheDir = join(outDir, 'cache')
// export const functionDir = join(assetDir, 'function')
