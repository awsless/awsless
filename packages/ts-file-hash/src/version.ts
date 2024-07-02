import { execFile } from 'child_process'

export type PackageManager = 'pnpm'

export const loadPackageDependencyVersions = (entry: string, packageManager: PackageManager) => {
	if (packageManager === 'pnpm') {
		return new Promise<Record<string, string>>((resolve, reject) => {
			execFile(`pnpm`, ['list', '--json'], { cwd: entry }, (error, stdout) => {
				if (error) {
					return reject(error)
				}

				const versions: Record<string, string> = {}
				const data = JSON.parse(stdout) as [{ dependencies: Record<string, { version: string }> }]

				for (const [name, entry] of Object.entries(data[0]!.dependencies)) {
					versions[name] = entry.version
				}

				resolve(versions)
			})
		})
	}

	throw new Error(`Unsupported package manager: ${packageManager}`)
}
