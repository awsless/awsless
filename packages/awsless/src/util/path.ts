import { join } from "path"

export const rootDir = process.cwd()
export const outDir = join(rootDir, '.awsless')
// export const assetDir = join(outDir, 'asset')
export const assemblyDir = join(outDir, 'assembly')
export const functionDir = join(outDir, 'function')
