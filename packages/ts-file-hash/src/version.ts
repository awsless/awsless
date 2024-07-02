import { execFile } from 'child_process'

export type PackageManager = 'pnpm'
export type LoadPackageDependencyVersionsProps = {
	packageManager: PackageManager
	dev?: boolean
}

type PnpmListResponse = {
	dependencies?: Record<string, { version: string }>
	devDependencies?: Record<string, { version: string }>
}[]

export const loadPackageDependencyVersions = (entry: string, props: LoadPackageDependencyVersionsProps) => {
	if (props.packageManager === 'pnpm') {
		return new Promise<Record<string, string>>((resolve, reject) => {
			execFile(`pnpm`, ['list', '--json'], { cwd: entry }, (error, stdout) => {
				if (error) {
					return reject(error)
				}

				const versions: Record<string, string> = {}
				const data = JSON.parse(stdout) as PnpmListResponse

				if (props.dev) {
					for (const [name, entry] of Object.entries(data.at(0)?.devDependencies ?? {})) {
						versions[name] = entry.version
					}
				}

				for (const [name, entry] of Object.entries(data.at(0)?.dependencies ?? {})) {
					versions[name] = entry.version
				}

				resolve(versions)
			})
		})
	}

	throw new Error(`Unsupported package manager: ${props.packageManager}`)
}
