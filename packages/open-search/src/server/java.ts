import { execFile } from 'child_process'
import { join } from 'path'
import { promisify } from 'util'

const exec = promisify(execFile)

// OpenSearch 3.x refuses to start on anything older.
const MINIMUM_JAVA_VERSION = 21

const getJavaVersion = async (home: string): Promise<number | undefined> => {
	try {
		const result = await exec(join(home, 'bin/java'), ['-version'])

		// The version banner goes to stderr: openjdk version "21.0.12" ...
		const match = `${result.stdout}${result.stderr}`.match(/version "(\d+)/)

		if (match) {
			return Number(match[1])
		}
	} catch {}

	return undefined
}

const getMacJavaHome = async (): Promise<string | undefined> => {
	try {
		const result = await exec('/usr/libexec/java_home', ['-v', `${MINIMUM_JAVA_VERSION}+`])
		return result.stdout.trim() || undefined
	} catch {}

	return undefined
}

// Find a local JDK that can run the min distribution, which ships without
// a usable JDK on macOS. Environment variables win, but only when they
// actually point at a new enough Java - a stale JAVA_HOME would otherwise
// break the boot.
export const findJavaHome = async (): Promise<string | undefined> => {
	const candidates = [
		process.env.OPENSEARCH_JAVA_HOME,
		process.env.JAVA_HOME,
		process.platform === 'darwin' ? await getMacJavaHome() : undefined,
		'/opt/homebrew/opt/openjdk',
		'/opt/homebrew/opt/openjdk@21',
		'/usr/local/opt/openjdk',
		'/usr/local/opt/openjdk@21',
	]

	for (const home of candidates) {
		if (!home) {
			continue
		}

		const version = await getJavaVersion(home)

		if (version && version >= MINIMUM_JAVA_VERSION) {
			return home
		}
	}

	return undefined
}
